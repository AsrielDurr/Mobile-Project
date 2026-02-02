package org.example.mobileproject.service.impl;

import org.example.mobileproject.entity.Relation;
import org.example.mobileproject.mapper.RelationMapper;
import org.example.mobileproject.service.RelationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RelationServiceImpl implements RelationService {

    @Autowired
    private RelationMapper relationMapper;

    @Override
    public int add(Relation relation) {
        return relationMapper.insert(relation);
    }

    @Override
    public Relation getById(Long id) {
        return relationMapper.selectById(id);
    }

    @Override
    public List<Relation> getByDocumentId(Long documentId) {
        return relationMapper.selectByDocumentId(documentId);
    }

    @Override
    public int update(Relation relation) {
        return relationMapper.update(relation);
    }

    @Override
    public int delete(Long id) {
        return relationMapper.delete(id);
    }
}
