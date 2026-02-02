package org.example.mobileproject.service;

import org.example.mobileproject.entity.Document;

import java.util.List;

public interface DocumentService {
    Document getById(Long id);
    List<Document> listAll();
    Document create(Document doc);
    Document update(Document doc);
    void delete(Long id);
}
