package org.example.mobileproject.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class Document {
    private Long id;
    private String title;
    private String content;
    private LocalDateTime createdAt;
}
