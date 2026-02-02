package org.example.mobileproject.service;

public interface AIService {
    /**
     * 调用大模型自动提取文档中的实体、标签及描述，并持久化到数据库
     * @param documentId 文档ID
     */
    void autoExtractAndSave(Long documentId);

    String analyzeDocumentWithCsv(Long documentId);

    String generateBusinessReport(String rawAnalysis);
}