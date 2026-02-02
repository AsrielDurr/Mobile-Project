package org.example.mobileproject.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class KgEdge {
    private Long id;
    private Long documentId;
    private Long sourceNodeId;
    private Long targetNodeId;
    private Long relationLabelId;
    private String edgeName; // 新增字段

    private Map<String, Object> properties;
    private LocalDateTime createdAt;
}

