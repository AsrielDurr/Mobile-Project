package org.example.mobileproject.entity;

import lombok.Data;

@Data
public class DocumentToken {
    private Long id;
    private Long documentId;
    private Integer tokenIndex;
    private String tokenText;
    private Boolean isEntity;    // maps to TINYINT(1)
    private Long entityId;       // nullable
    private java.time.LocalDateTime createdAt;
}
