package org.example.mobileproject.service;

import org.example.mobileproject.entity.RelationLabel;

import java.util.List;

public interface RelationLabelService {
    int add(RelationLabel label);
    RelationLabel getById(Long id);
    List<RelationLabel> getAll();
    int update(RelationLabel label);
    int delete(Long id);
}
