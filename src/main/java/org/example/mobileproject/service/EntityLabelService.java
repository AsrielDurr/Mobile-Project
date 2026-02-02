package org.example.mobileproject.service;

import org.example.mobileproject.entity.EntityLabel;

import java.util.List;

public interface EntityLabelService {
    EntityLabel getById(Long id);
    List<EntityLabel> listAll();
    EntityLabel create(EntityLabel label);
    EntityLabel update(EntityLabel label);
    void delete(Long id);
}
