package org.example.mobileproject.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class KgNode {
    private Long id;
    private Long documentId;
    private Long entityId;
    private Long labelId;
    private String name;

    private Map<String, Object> properties;  // 修改为 Map

    private LocalDateTime createdAt;
}
