package org.example.mobileproject.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PromptTemplate {
    private Long id;
    private String name;
    private String taskType;
    private String description;
    private String templateText;
    private String model;
    private Integer version;
    private Integer isActive; // 0 = disabled, 1 = enabled
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
