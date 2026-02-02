package org.example.mobileproject.service.impl;

import org.example.mobileproject.entity.RelationLabel;
import org.example.mobileproject.mapper.RelationLabelMapper;
import org.example.mobileproject.service.RelationLabelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RelationLabelServiceImpl implements RelationLabelService {

    @Autowired
    private RelationLabelMapper relationLabelMapper;

    @Override
    public int add(RelationLabel label) {
        return relationLabelMapper.insert(label);
    }

    @Override
    public RelationLabel getById(Long id) {
        return relationLabelMapper.selectById(id);
    }

    @Override
    public List<RelationLabel> getAll() {
        return relationLabelMapper.selectAll();
    }

    @Override
    public int update(RelationLabel label) {
        return relationLabelMapper.update(label);
    }

    @Override
    public int delete(Long id) {
        return relationLabelMapper.delete(id);
    }
}
