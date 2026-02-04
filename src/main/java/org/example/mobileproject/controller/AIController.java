package org.example.mobileproject.controller;

import lombok.RequiredArgsConstructor;
import org.example.mobileproject.service.AIService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
    public ResponseEntity<String> analyzeCsv(
            @PathVariable Long documentId,
            @RequestBody(required = false) Map<String, List<String>> request) {
        List<String> files = request != null ? request.get("files") : null;
        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().body("\u8bf7\u5148\u9009\u62e9CSV\u6587\u4ef6");
        }
        String report = aiService.analyzeDocumentWithCsv(documentId, files);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/csv-files")
    public ResponseEntity<List<String>> listCsvFiles() {
        return ResponseEntity.ok(aiService.listCsvFileNames());
    }

    // 根据关联信息得到业务分析报告
    @PostMapping("/generate-business-report")
    public ResponseEntity<String> generateBusinessReport(@RequestBody Map<String, String> request) {
        // 从请求体中获取第一次分析的结果
        String rawAnalysis = request.get("rawAnalysis");

        if (rawAnalysis == null || rawAnalysis.isEmpty()) {
            return ResponseEntity.badRequest().body("原始分析数据不能为空");
        }

        // 调用 Service 进行深度推理
        String businessReport = aiService.generateBusinessReport(rawAnalysis);
        return ResponseEntity.ok(businessReport);
    }
}
