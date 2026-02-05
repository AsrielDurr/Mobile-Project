package org.example.mobileproject.controller;

import lombok.RequiredArgsConstructor;
import org.example.mobileproject.service.AIService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    // 注入接口，Spring 会自动寻找实现了该接口的 @Service 丢进来
    private final AIService aiService;

    @PostMapping("/extract/{id}")
    public ResponseEntity<String> autoExtract(@PathVariable Long id) {
        aiService.autoExtractAndSave(id);
        return ResponseEntity.ok("Success");
    }


    // 结合 CSV 数据进行关联分析
    @PostMapping("/analyze-csv/{documentId}")
    public ResponseEntity<String> analyzeCsv(@PathVariable Long documentId) {
        String report = aiService.analyzeDocumentWithCsv(documentId);
        return ResponseEntity.ok(report);
    }

    // 根据关联信息得到业务分析报告
    @PostMapping("/generate-business-report")
    public ResponseEntity<String> generateBusinessReport(@RequestBody Map<String, Object> request) {
        // 1. 获取 documentId
        Object docIdObj = request.get("documentId");
        if (docIdObj == null) {
            return ResponseEntity.badRequest().body("文档 ID 不能为空");
        }
        Long documentId = Long.valueOf(docIdObj.toString());

        // 2. 获取第一次分析的结果
        String rawAnalysis = (String) request.get("rawAnalysis");
        if (rawAnalysis == null || rawAnalysis.isEmpty()) {
            return ResponseEntity.badRequest().body("原始分析数据不能为空");
        }

        // 3. 调用更新后的 Service 进行深度推理
        String businessReport = aiService.generateBusinessReport(documentId, rawAnalysis);

        return ResponseEntity.ok(businessReport);
    }
}