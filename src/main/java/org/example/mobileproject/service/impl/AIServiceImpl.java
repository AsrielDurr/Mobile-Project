package org.example.mobileproject.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.mobileproject.config.AIConfig;
import org.example.mobileproject.entity.*;
import org.example.mobileproject.mapper.DocumentTokenMapper;
import org.example.mobileproject.service.*;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIServiceImpl implements AIService {

    private final DocumentService documentService;
    private final EntityLabelService labelService;
    private final EntityItemService entityItemService;
    private final DocumentTokenMapper tokenMapper;
    private final ObjectMapper objectMapper;
    private final AIConfig aiConfig;  // 注入配置类

    @Override
    @Transactional
    public void autoExtractAndSave(Long documentId) {
        log.info("--- 开始 AI 自动标注任务，文档 ID: {} ---", documentId);

        // 1. 获取文档
        Document doc = documentService.getById(documentId);
        if (doc == null || doc.getContent() == null) {
            log.warn("未找到文档或文档内容为空");
            return;
        }

        // 2. 调用大模型获取结构化 JSON
        AIEntityExtractionResponse aiResponse = callDeepSeek(doc.getContent());
        if (aiResponse == null || aiResponse.getEntities() == null) {
            log.error("AI 提取结果为空");
            return;
        }
        log.info("AI 成功提取到 {} 个候选实体", aiResponse.getEntities().size());

        // 3. 获取 Token 列表用于位置比对
        List<DocumentToken> allTokens = tokenMapper.selectByDocumentId(documentId);
        if (allTokens == null || allTokens.isEmpty()) {
            log.warn("该文档尚未进行分词处理（Token 列表为空）");
            return;
        }

        // 4. 遍历处理每个实体
        for (AIEntityExtractionResponse.EntityDetail detail : aiResponse.getEntities()) {
            // A. 处理标签 (调用已有 Service 实现查重或创建)
            EntityLabel label = findOrCreateLabel(detail.getLabel(), detail.getDescription());

            // B. 计算实体在 Token 序列中的区间 (核心匹配逻辑)
            int[] range = locateTokenRange(allTokens, detail.getText());

            if (range != null) {
                // C. 封装 EntityItem
                EntityItem item = new EntityItem();
                item.setDocumentId(documentId);
                item.setLabelId(label.getId());
                item.setText(detail.getText());
                item.setTokenStart(range[0]);
                item.setTokenEnd(range[1]);

                try {
                    // D. 直接调用你已有的 Service 方法
                    // 这会触发你 Service 里的 itemMapper.insert 和 markTokensForEntity
                    entityItemService.create(item);
                    log.info("成功入库实体: [{}], 位置: {}-{}", detail.getText(), range[0], range[1]);
                } catch (Exception e) {
                    // 捕获 BusinessException (如同区间已标注)，防止一个报错卡死全文提取
                    log.warn("实体 [{}] 跳过入库，原因: {}", detail.getText(), e.getMessage());
                }
            } else {
                log.warn("无法在原文 Token 中定位实体: [{}]", detail.getText());
            }
        }
        log.info("--- 文档 {} AI 自动标注任务完成 ---", documentId);
    }

    /**
     * 调用 AI API（实体提取专用）
     */
    private AIEntityExtractionResponse callDeepSeek(String content) {
        log.info("========== 开始调用 AI 实体提取 API ==========");
        log.info("使用模型: {}", aiConfig.getEntityExtractionModel());
        log.info("API 地址: {}", aiConfig.getBaseUrl());

        RestTemplate restTemplate = new RestTemplate();

        // 严格构造消息体，解决 400 Bad Request 问题
        Map<String, String> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", "你是一个业务分析建模助手。你的任务是将非结构化的管理思路转化为结构化的分析实体，为后续的逻辑推理引擎提供标准化输入。要求：\n" +
                "1. 只输出 JSON，不要解释、不要 Markdown、不要代码块标记（不要出现 ```json 或 ```）。\n" +
                "2. 严格遵循结构：{\"entities\": [{\"text\": \"...\", \"label\": \"...\", \"description\": \"...\"}]}。\n" +
                "3. text 必须是原文中的连续片段，不得改写或添加。\n" +
                "4. label 必须从以下 5 个预定义中文类别中选择：\n" +
                "   - 状态判断：对经营现状的定性评价（如“进位/退位”、“起伏/偏离”）。\n" +
                "   - 对比参照：分析所依据的对标对象或目标基准（如“标杆”、“同期”、“预算线”）。\n" +
                "   - 归因逻辑：对问题的分类拆解或主矛盾判定（如“收入端/成本端”、“内因/外因”）。\n" +
                "   - 业务策略：具体的解决动作、业务链路断点或责任方案（如“止血动作”、“可控链路”）。\n" +
                "   - 监控规则：定量的复盘标准、预警阈值或验收口径（如“偏离度”、“盯数阈值”）。\n" +
                "5. description 需简述该实体在业务分析逻辑中的具体作用。\n" +
                "6. 除 JSON 外不要输出任何多余字符。\n" +
                "7. 待处理文本：\n" + content);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", aiConfig.getEntityExtractionModel());  // 使用配置的模型
        requestBody.put("messages", Collections.singletonList(userMessage));
        // 注意：移除 response_format 参数，因为某些 API（如方州 Ark）可能不支持
        // requestBody.put("response_format", Collections.singletonMap("type", "json_object"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(aiConfig.getApiKey());  // 使用配置的 API Key

        try {
            log.info("发送请求到 AI API...");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(aiConfig.getBaseUrl(), entity, String.class);  // 使用配置的 URL

            log.info("收到响应，状态码: {}", response.getStatusCode());
            log.debug("完整响应体: {}", response.getBody());

            Map<String, Object> respMap = objectMapper.readValue(response.getBody(), Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) respMap.get("choices");

            if (choices == null || choices.isEmpty()) {
                log.error("API 响应中没有 choices 字段或为空");
                return null;
            }

            String jsonContent = (String) ((Map<String, Object>) choices.get(0).get("message")).get("content");

            log.info("AI 返回的 JSON 内容: {}", jsonContent);
            AIEntityExtractionResponse result = objectMapper.readValue(jsonContent, AIEntityExtractionResponse.class);
            log.info("成功解析实体提取结果，共 {} 个实体",
                    result.getEntities() != null ? result.getEntities().size() : 0);

            return result;
        } catch (Exception e) {
            log.error("========== AI 调用接口失败 ==========");
            log.error("异常类型: {}", e.getClass().getName());
            log.error("异常信息: {}", e.getMessage());
            log.error("完整堆栈:", e);
            return null;
        }
    }

    /**
     * 查找或创建标签
     */
    private EntityLabel findOrCreateLabel(String name, String desc) {
        return labelService.listAll().stream()
                .filter(l -> l.getLabelName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> {
                    EntityLabel nl = new EntityLabel();
                    nl.setLabelName(name);
                    nl.setDescription(desc);
                    return labelService.create(nl);
                });
    }

    /**
     * 滑动窗口匹配：根据 AI 返回的文字，寻找 Token 索引区间
     */
    private int[] locateTokenRange(List<DocumentToken> tokens, String targetText) {
        // 预处理：去掉目标文本所有空格
        String target = targetText.replaceAll("\\s+", "");
        if (target.isEmpty()) return null;

        for (int i = 0; i < tokens.size(); i++) {
            StringBuilder sb = new StringBuilder();
            for (int j = i; j < tokens.size(); j++) {
                // 拼接 Token 时也去掉潜在空格
                sb.append(tokens.get(j).getTokenText().replaceAll("\\s+", ""));

                String currentStr = sb.toString();
                if (currentStr.equals(target)) {
                    return new int[]{i, j};
                }
                // 长度超过目标且仍未匹配，剪枝
                if (currentStr.length() > target.length()) break;
            }
        }
        return null;
    }


    @Override
    public String analyzeDocumentWithCsv(Long documentId) {
        // 1. 获取文档基本信息
        Document doc = documentService.getById(documentId);
        if (doc == null) return "未找到文档信息";

        // 2. 获取该文档已有的实体列表 (注意这里使用你接口定义的 listByDocumentId)
        List<EntityItem> entities = entityItemService.listByDocumentId(documentId);

        // 3. 构造实体上下文，方便 AI 理解我们要查什么
        StringBuilder entityContext = new StringBuilder();
        if (entities.isEmpty()) {
            entityContext.append("（文档暂未提取具体实体，请根据全文内容匹配相关数据）\n原文内容：")
                    .append(doc.getContent());
        } else {
            for (EntityItem item : entities) {
                // 获取标签名称
                EntityLabel label = labelService.getById(item.getLabelId());
                entityContext.append(String.format("- 实体文本: [%s], 标签类型: [%s]\n",
                        item.getText(), label != null ? label.getLabelName() : "未知"));
            }
        }

        // 4. 读取本地 CSV 数据
        String csvData = loadAllCsvData();

        // 5. 编写针对性 Prompt
        String prompt =  "【数据源说明】\n" +
            "本次分析涉及 3 个 CSV 数据文件：\n\n" +

            "1. 模拟数据_收入目标完成.csv（收入完成情况）\n" +
            "   - grid: 网格名称\n" +
            "   - month: 统计月份（格式：YYYY-MM）\n" +
            "   - income_target: 收入目标值\n" +
            "   - income_actual: 实际完成收入\n" +
            "   - income_completion_rate: 收入完成率（实际/目标，1.0表示100%）\n" +
            "   - score_6plus4: 综合评分（关键业务指标）\n\n" +

            "2. 模拟数据_渠道八大业务明细.csv（渠道业务明细）\n" +
            "   - grid: 网格名称\n" +
            "   - month: 统计月份\n" +
            "   - channel: 渠道类型（如：社会渠道）\n" +
            "   - business_type: 业务类型（如：新入网、宽带、终端、高价值套餐）\n" +
            "   - volume: 业务量\n" +
            "   - fee: 费用/收入\n\n" +

            "3. 模拟数据_网格月度承包费汇总.csv（网格承包费和激励）\n" +
            "   - grid: 网格名称\n" +
            "   - month: 统计月份\n" +
            "   - county: 所属区县\n" +
            "   - grid_type: 网格类型\n" +
            "   - business_incentive: 业务激励\n" +
            "   - base_guarantee: 基础保障\n" +
            "   - negative_penalty: 负向处罚\n" +
            "   - cost_expense: 成本费用\n" +
            "   - cost_pool: 成本池\n" +
            "   - total_amount: 总金额\n" +
            "   - social_support_incentive: 社会支撑激励\n" +
            "   - self_store_service_fee: 自有门店服务费\n" +
            "   - income_over_incentive: 收入超额激励\n" +
            "   - other_incentive: 其他激励\n\n" +

            "【实体标签分析指引】\n" +
            "根据实体的标签类型，重点关注以下数据源和字段：\n\n" +

            "▶ 状态判断类（如\"进位/退位\"、\"超标/未达标\"）\n" +
            "  主要数据源：模拟数据_收入目标完成.csv\n" +
            "  关键字段：income_completion_rate（完成率）、score_6plus4（综合评分）\n" +
            "  分析维度：与 1.0 基准对比、与同期其他网格对比、评分水平判断\n\n" +

            "▶ 对比参照类（如\"同期\"、\"标杆网格\"）\n" +
            "  主要数据源：所有 CSV 文件\n" +
            "  关键字段：grid（网格名称）、month（月份）\n" +
            "  分析维度：横向对比（不同网格）、纵向对比（不同月份）\n\n" +

            "▶ 归因逻辑类（如\"收入端/成本端\"）\n" +
            "  主要数据源：\n" +
            "    - 收入端 → 模拟数据_收入目标完成.csv + 模拟数据_渠道八大业务明细.csv\n" +
            "    - 成本端 → 模拟数据_网格月度承包费汇总.csv\n" +
            "  关键字段：income_target, income_actual, fee（收入）；cost_expense, negative_penalty（成本）\n" +
            "  分析维度：目标达成情况、收入与成本的差异分析\n\n" +

            "▶ 业务策略类（如\"止血动作\"、\"提升计划\"）\n" +
            "  主要数据源：所有 CSV 文件（需要时间序列数据）\n" +
            "  关键字段：所有数值字段\n" +
            "  分析维度：环比变化、改善幅度、趋势判断\n\n" +

            "▶ 监控规则类（如\"偏离度\"、\"预警阈值\"）\n" +
            "  主要数据源：模拟数据_收入目标完成.csv\n" +
            "  关键字段：所有数值字段\n" +
            "  分析维度：数据波动范围、异常值识别、与平均值的偏离程度\n\n" +

            "【分析示例】\n" +
            "假设文档中提取到以下实体：\n" +
            "- 实体文本: [东城-一网格在2025年10月超标完成], 标签类型: [状态判断]\n" +
            "- 实体文本: [同期东城-三网格], 标签类型: [对比参照]\n\n" +

            "期望的分析输出：\n\n" +

            "## 实体分析报告\n\n" +

            "### 1. [东城-一网格在2025年10月超标完成] - 状态判断类\n" +
            "**数据来源**: 模拟数据_收入目标完成.csv\n\n" +

            "**匹配数据**:\n" +
            "- 网格: 东城-一网格\n" +
            "- 月份: 2025-10\n" +
            "- 收入目标: 700,299\n" +
            "- 实际收入: 800,214\n" +
            "- 完成率: 1.1427 (114.27%)\n" +
            "- 综合评分: 69\n\n" +

            "**业务分析**:\n" +
            "✓ 完成率为 114.27%，超过目标 14.27 个百分点，确实属于 超标完成 \n" +
            "✓ 综合评分 69 分，处于中等偏上水平\n" +
            "✓ 与 2025-09 月对比（完成率 100.43%），本月提升显著，增长 13.84 个百分点\n\n" +

            "**结论**: 该网格 10 月表现优异，收入端执行到位\n\n" +

            "---\n\n" +

            "### 2. [同期东城-三网格] - 对比参照类\n" +
            "**数据来源**: 模拟数据_收入目标完成.csv\n\n" +

            "**匹配数据**:\n" +
            "- 网格: 东城-三网格\n" +
            "- 月份: 2025-10（与东城-一网格同期）\n" +
            "- 收入目标: 768,932\n" +
            "- 实际收入: 839,615\n" +
            "- 完成率: 1.0919 (109.19%)\n" +
            "- 综合评分: 68\n\n" +

            "**对比分析**:\n" +
            "- 东城-一网格完成率 114.27% > 东城-三网格 109.19%\n" +
            "- 东城-一网格评分 69 > 东城-三网格 68\n" +
            "- 东城-一网格在同期对比中表现更优\n\n" +

            "**结论**: 东城-一网格在同期网格中处于领先位置\n\n" +

            "【当前文档关联实体】\n" + entityContext.toString() + "\n\n" +

            "【CSV 原始数据】\n" + csvData + "\n\n" +

            "【分析执行要求】\n" +
            "1. **实体解析**：从实体文本中提取关键信息（网格名称、月份、指标名称等）\n" +
            "2. **数据定位**：根据实体标签类型，优先查看对应的推荐数据源，在 CSV 数据中精确匹配\n" +
            "3. **关联分析**：明确指出在哪个 CSV 文件的哪些行找到了匹配数据，列出关键数据点\n" +
            "4. **结果呈现**：严格参考上方【分析示例】的格式，按实体分组呈现，包含数据来源、匹配数据、业务分析、结论\n" +
            "5. **异常处理**：如果实体在 CSV 中找不到精确匹配，请说明并尝试寻找最接近的数据\n\n" +

            "请以清晰的结构化文本返回分析报告。";

        // 6. 调用 DeepSeek (请确保你已实现这个通用的 callDeepSeek 方法)
        return callDeepSeekGeneric(prompt);
    }

    // 加载csv数据
    private String loadAllCsvData() {
        StringBuilder sb = new StringBuilder();
        // 相对项目根目录
        File folder = new File("src" + File.separator + "main" + File.separator + "resources" + File.separator + "csvdata");

        if (folder.exists() && folder.isDirectory()) {
            File[] files = folder.listFiles((dir, name) -> name.toLowerCase().endsWith(".csv"));
            if (files != null) {
                for (File file : files) {
                    sb.append("--- 文件名: ").append(file.getName()).append(" ---\n");
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(
                            new FileInputStream(file), StandardCharsets.UTF_8))) {
                        String line;
                        int limit = 0;
                        while ((line = br.readLine()) != null && limit < 100) { // 每个文件读取前100行防止溢出
                            sb.append(line).append("\n");
                            limit++;
                        }
                    } catch (Exception e) {
                        log.error("读取CSV失败: " + file.getName(), e);
                    }
                    sb.append("\n");
                }
            }
        }
        return sb.toString();
    }

    /**
     * 调用 AI API（通用方法，用于文档分析和报告生成）
     * @param prompt 提示词
     * @param modelType 模型类型：document_analysis 或 report_generation
     */
    private String callDeepSeekGeneric(String prompt, String modelType) {
        RestTemplate restTemplate = new RestTemplate();
        Map<String, String> message = new HashMap<>();
        message.put("role", "user");
        message.put("content", prompt);

        // 根据任务类型选择对应的模型
        String model = "document_analysis".equals(modelType)
                ? aiConfig.getDocumentAnalysisModel()
                : aiConfig.getReportGenerationModel();

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);  // 使用配置的模型
        body.put("messages", Collections.singletonList(message));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(aiConfig.getApiKey());  // 使用配置的 API Key

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            // 使用 ResponseEntity<String> 接收原始字符串，再手动解析或让 RestTemplate 解析
            ResponseEntity<Map> response = restTemplate.postForEntity(aiConfig.getBaseUrl(), entity, Map.class);  // 使用配置的 URL

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> messageResult = (Map<String, Object>) choices.get(0).get("message");
                    return (String) messageResult.get("content");
                }
            }
            return "AI 未能生成有效的分析报告，请检查 API 状态。";
        } catch (Exception e) {
            log.error("AI 总结失败: ", e);
            return "AI 分析过程中出现错误：" + e.getMessage();
        }
    }

    /**
     * 调用 AI API（文档分析专用）
     * @deprecated 使用 callDeepSeekGeneric(prompt, "document_analysis") 替代
     */
    private String callDeepSeekGeneric(String prompt) {
        return callDeepSeekGeneric(prompt, "document_analysis");
    }

    @Override
    public String generateBusinessReport(Long documentId, String rawAnalysis) {
        log.info("--- 开始为文档 {} 生成深度业务报告 ---", documentId);

        // 1. 获取文档基本信息
        Document doc = documentService.getById(documentId);
        String content = (doc != null) ? doc.getContent() : "（无法获取文档原文）";

        // 2. 获取关联实体列表并格式化
        List<EntityItem> entities = entityItemService.listByDocumentId(documentId);
        StringBuilder entityInfo = new StringBuilder();
        if (entities != null && !entities.isEmpty()) {
            for (EntityItem item : entities) {
                EntityLabel label = labelService.getById(item.getLabelId());
                entityInfo.append(String.format("- 实体: [%s], 标签: [%s]\n",
                        item.getText(), label != null ? label.getLabelName() : "未分类"));
            }
        } else {
            entityInfo.append("（该文档暂无关联标注实体）");
        }

        // 3. 构造增强型复合 Prompt
        String prompt = "你是一位资深的业务管理专家。请结合【文档原文】、【关键实体】以及【初步数据分析结论】，撰写一份深度的【业务评估与行动指南】。\n\n" +
                "### 1. 业务背景 (文档原文)\n" + content + "\n\n" +
                "### 2. 核心关注点 (标注实体)\n" + entityInfo.toString() + "\n\n" +
                "### 3. 数据分析结论 (CSV 比对结果)\n" + rawAnalysis + "\n\n" +
                "--- \n" +
                "【撰写要求】：\n" +
                "1. **关联分析**：结合文档内容与数据结论。例如：文档提到的业务目标在数据中是否达成？\n" +
                "2. **深度挖掘**：不要只重复数字，要分析数字背后的管理动作（如：某网格表现优异是否是因为文档中提到的某项政策落实到位？）。\n" +
                "3. **风险与机会**：识别出当前业务路径下的潜在风险及可优化的增长点。\n" +
                "4. **行动指南**：给出具体的、分阶段（短期/中期）的可操作建议。\n" +
                "5. **文风**：专业、严谨、具有前瞻性，以结构化的正式报告格式返回。";

        // 4. 调用 AI 接口
        return callDeepSeekGeneric(prompt);
    }
}
