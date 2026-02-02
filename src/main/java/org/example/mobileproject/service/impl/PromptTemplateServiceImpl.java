package org.example.mobileproject.service.impl;

import org.example.mobileproject.entity.PromptTemplate;
import org.example.mobileproject.mapper.PromptTemplateMapper;
import org.example.mobileproject.service.PromptTemplateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PromptTemplateServiceImpl implements PromptTemplateService {

    @Autowired
    private PromptTemplateMapper promptTemplateMapper;

    @Override
    public int add(PromptTemplate template) {
        return promptTemplateMapper.insert(template);
    }

    @Override
    public PromptTemplate getById(Long id) {
        return promptTemplateMapper.selectById(id);
    }

    @Override
    public List<PromptTemplate> getAll() {
        return promptTemplateMapper.selectAll();
    }

    @Override
    public List<PromptTemplate> getByTaskType(String taskType) {
        return promptTemplateMapper.selectByTaskType(taskType);
    }

    @Override
    public List<PromptTemplate> getByModel(String model) {
        return promptTemplateMapper.selectByModel(model);
    }

    @Override
    public int update(PromptTemplate template) {
        return promptTemplateMapper.update(template);
    }

    @Override
    public int delete(Long id) {
        return promptTemplateMapper.delete(id);
    }

    @Override
    public int setActive(Long id, Integer isActive) {
        return promptTemplateMapper.setActive(id, isActive);
    }
}
