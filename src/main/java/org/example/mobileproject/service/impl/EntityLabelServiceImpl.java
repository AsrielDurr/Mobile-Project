package org.example.mobileproject.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.mobileproject.entity.EntityLabel;
import org.example.mobileproject.mapper.EntityLabelMapper;
import org.example.mobileproject.service.EntityLabelService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EntityLabelServiceImpl implements EntityLabelService {

    private final EntityLabelMapper labelMapper;

    @Override
    public EntityLabel getById(Long id) {
        return labelMapper.selectById(id);
    }

    @Override
    public List<EntityLabel> listAll() {
        return labelMapper.selectAll();
    }

    @Override
    @Transactional
    public EntityLabel create(EntityLabel label) {
        labelMapper.insert(label);
        return label;
    }

    @Override
    @Transactional
    public EntityLabel update(EntityLabel label) {
        labelMapper.update(label);
        return label;
    }

    @Override
    @Transactional
    public void delete(Long id) {
        // Note: deleting a label will not automatically delete entities in this impl.
        // If you want cascade delete, handle it here: find entity_items with labelId and delete them,
        // and update document_tokens accordingly. For safety we will just delete label.
        labelMapper.deleteById(id);
    }
}
