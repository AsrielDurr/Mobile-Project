package org.example.mobileproject.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class EntityItem {
    private Long id;
    private Long documentId;
    private Long labelId;
    private String text;
    private Integer tokenStart; // inclusive
    private Integer tokenEnd;   // inclusive
    private LocalDateTime createdAt;
}
