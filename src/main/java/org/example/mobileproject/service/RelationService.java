package org.example.mobileproject.service;

import org.example.mobileproject.entity.Relation;

import java.util.List;

public interface RelationService {
    int add(Relation relation);
    Relation getById(Long id);
    List<Relation> getByDocumentId(Long documentId);
    int update(Relation relation);
    int delete(Long id);
}
