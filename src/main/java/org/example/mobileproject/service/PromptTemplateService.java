package org.example.mobileproject.service;

import org.example.mobileproject.entity.PromptTemplate;

import java.util.List;

public interface PromptTemplateService {
    int add(PromptTemplate template);
    PromptTemplate getById(Long id);
    List<PromptTemplate> getAll();
    List<PromptTemplate> getByTaskType(String taskType);
    List<PromptTemplate> getByModel(String model);
    int update(PromptTemplate template);
    int delete(Long id);
    int setActive(Long id, Integer isActive);
}
