package org.example.mobileproject.service;

import org.example.mobileproject.entity.EntityItem;

import java.util.List;

public interface EntityItemService {
    EntityItem getById(Long id);
    List<EntityItem> listByDocumentId(Long documentId);
    EntityItem create(EntityItem item);
    EntityItem update(EntityItem item);
    void delete(Long id);
}
