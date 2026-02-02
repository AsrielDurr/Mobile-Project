package org.example.mobileproject.service;

import org.example.mobileproject.entity.DocumentToken;

import java.util.List;

public interface DocumentTokenService {
    List<DocumentToken> getByDocumentId(Long documentId);
    void rebuildTokensForDocument(Long documentId, List<String> tokens);
    void markTokensForEntities(Long documentId);
}
