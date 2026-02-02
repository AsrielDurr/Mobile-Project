package org.example.mobileproject.entity;

import lombok.Data;

@Data
public class RelationLabel {
    private Long id;
    private String relationName;
    private String description;
    private String createdAt;
}
