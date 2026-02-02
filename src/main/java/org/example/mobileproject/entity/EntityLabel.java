package org.example.mobileproject.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class EntityLabel {
    private Long id;
    private String labelName;
    private String description;
    private LocalDateTime createdAt;
}
