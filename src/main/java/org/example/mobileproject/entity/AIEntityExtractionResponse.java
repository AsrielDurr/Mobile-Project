package org.example.mobileproject.entity;

import lombok.Data;
import java.util.List;

@Data
public class AIEntityExtractionResponse {
    private List<EntityDetail> entities;

    @Data
    public static class EntityDetail {
        private String text;        // 实体在原文中的文字
        private String label;       // 标签名，如 "人物", "组织"
        private String description; // AI 对该标签的定义描述
    }
}