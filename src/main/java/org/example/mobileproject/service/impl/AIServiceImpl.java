package org.example.mobileproject.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    private final String API_KEY = "sk-9fec8ac0a66e48ecbb8d714bbfaea319";
    private final String BASE_URL = "https://api.deepseek.com/v1/chat/completions";

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
     * 调用 DeepSeek API
     */
    private AIEntityExtractionResponse callDeepSeek(String content) {
        RestTemplate restTemplate = new RestTemplate();

        // 严格构造消息体，解决 400 Bad Request 问题
        Map<String, String> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", "你是一个命名实体识别助手。请从文本中提取实体。要求：\n" +
                "1. 严格返回 JSON 格式。\n" +
                "2. 结构：{\"entities\": [{\"text\": \"...\", \"label\": \"...\", \"description\": \"...\"}]}\n" +
                "3. 待处理文本：\n" + content);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "deepseek-chat");
        requestBody.put("messages", Collections.singletonList(userMessage));
        requestBody.put("response_format", Collections.singletonMap("type", "json_object"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(API_KEY);

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(BASE_URL, entity, String.class);

            Map<String, Object> respMap = objectMapper.readValue(response.getBody(), Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) respMap.get("choices");
            String jsonContent = (String) ((Map<String, Object>) choices.get(0).get("message")).get("content");

            log.debug("AI Response JSON: {}", jsonContent);
            return objectMapper.readValue(jsonContent, AIEntityExtractionResponse.class);
        } catch (Exception e) {
            log.error("AI 调用接口失败: {}", e.getMessage());
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
        String prompt = "你是一个专业的数据关联分析专家。任务是结合【文档实体】与【CSV业务数据】进行交叉比对分析。\n\n" +
                "【CSV 数据表头含义说明】：\n" +
                "- grid: 网格名称\n" +
                "- month: 统计月份\n" +
                "- income_target: 收入目标值\n" +
                "- income_actual: 实际完成收入\n" +
                "- income_completion_rate: 收入完成率（实际/目标）\n" +
                "- score_6plus4: 综合评分（关键业务指标）\n\n" +
                "【当前文档关联实体】：\n" + entityContext.toString() + "\n\n" +
                "【CSV 原始数据库存】：\n" + csvData + "\n\n" +
                "【分析要求】：\n" +
                "1. 首先明确指出你在哪些 CSV 文件中找到了与实体匹配的数据行。\n" +
                "2. 详细列出关键数据：例如匹配到的网格在特定月份的完成率、得分情况。\n" +
                "3. 给出业务总结：比如该网格表现是否达标，完成率在数据集中处于什么水平。\n" +
                "4. 如果文档实体中提到的月份/网格在 CSV 中不存在，请礼貌提示并尝试寻找最接近的数据。\n\n" +
                "请以清晰的结构化文本返回分析报告。";

        // 6. 调用 DeepSeek (请确保你已实现这个通用的 callDeepSeek 方法)
        return callDeepSeekGeneric(prompt);
    }

    // 加载csv数据
    private String loadAllCsvData() {
        StringBuilder sb = new StringBuilder();
        String csvFolderPath = "D:\\IDEA Projects\\Mobile-Project-main\\src\\main\\resources\\csvdata";
        File folder = new File(csvFolderPath);

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

    // 调用deepseek分析csv数据
    private String callDeepSeekGeneric(String prompt) {
        RestTemplate restTemplate = new RestTemplate();
        Map<String, String> message = new HashMap<>();
        message.put("role", "user");
        message.put("content", prompt);

        Map<String, Object> body = new HashMap<>();
        body.put("model", "deepseek-chat");
        body.put("messages", Collections.singletonList(message));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(API_KEY);

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            // 使用 ResponseEntity<String> 接收原始字符串，再手动解析或让 RestTemplate 解析
            ResponseEntity<Map> response = restTemplate.postForEntity(BASE_URL, entity, Map.class);

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

    @Override
    public String generateBusinessReport(String rawAnalysis) {
        String prompt = "你是一位资深的业务管理专家。请根据以下【原始数据分析结论】，撰写一份深度的【业务年度/月度评估与行动指南】。\n\n" +
                "【原始结论】：\n" + rawAnalysis + "\n\n" +
                "【撰写要求】：\n" +
                "1. **逻辑推理**：不要只重复数字，要分析数字背后的原因（如：为何某网格进步快？是否是动作到位？）。\n" +
                "2. **管理洞察**：识别出潜在的风险点和机会点。\n" +
                "3. **指导信息**：针对未来工作，给出具体的、可操作的行动建议（分短期、中期）。\n" +
                "4. **文风**：专业、严谨、具有前瞻性。\n\n" +
                "请以正式报告的格式返回。";

        return callDeepSeekGeneric(prompt); // 复用之前的通用调用方法
    }
}