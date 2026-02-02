package org.example.mobileproject.entity;

import lombok.Data;

@Data
public class Relation {
    private Long id;
    private Long documentId;        // documents.id
    private Long relationLabelId;   // relation_labels.id
    private Long headEntityId;      // entities.id (head)
    private Long tailEntityId;      // entities.id (tail)
    private String createdAt;
}
