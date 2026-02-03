package org.example.mobileproject.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * AI 服务配置类
 * 从 application.properties 读取配置，方便统一管理和修改
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "ai")
public class AIConfig {

    /**
     * API 密钥
     */
    private String apiKey;

    /**
     * API 基础 URL
     */
    private String baseUrl;

    /**
     * 默认使用的模型名称
     */
    private String model;

    /**
     * 实体提取专用模型（可选，不配置则使用默认模型）
     */
    private String entityExtractionModel;

    /**
     * 文档分析专用模型（可选，不配置则使用默认模型）
     */
    private String documentAnalysisModel;

    /**
     * 报告生成专用模型（可选，不配置则使用默认模型）
     */
    private String reportGenerationModel;

    /**
     * 获取实体提取使用的模型
     */
    public String getEntityExtractionModel() {
        return entityExtractionModel != null ? entityExtractionModel : model;
    }

    /**
     * 获取文档分析使用的模型
     */
    public String getDocumentAnalysisModel() {
        return documentAnalysisModel != null ? documentAnalysisModel : model;
    }

    /**
     * 获取报告生成使用的模型
     */
    public String getReportGenerationModel() {
        return reportGenerationModel != null ? reportGenerationModel : model;
    }
}