package org.example.mobileproject.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.mobileproject.common.BizException;
import org.example.mobileproject.entity.DocumentToken;
import org.example.mobileproject.entity.EntityItem;
import org.example.mobileproject.mapper.DocumentTokenMapper;
import org.example.mobileproject.mapper.EntityItemMapper;
import org.example.mobileproject.service.EntityItemService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EntityItemServiceImpl implements EntityItemService {

    private final EntityItemMapper itemMapper;
    private final DocumentTokenMapper tokenMapper;

    @Override
    public EntityItem getById(Long id) {
        return itemMapper.selectById(id);
    }

    @Override
    public List<EntityItem> listByDocumentId(Long documentId) {
        return itemMapper.selectByDocumentId(documentId);
    }

    @Override
    @Transactional
    public EntityItem create(EntityItem item) {
        validateEntityRange(item);
        EntityItem existing = itemMapper.selectByDocumentIdAndTokenRange(
                item.getDocumentId(),
                item.getTokenStart(),
                item.getTokenEnd()
        );
        if (existing != null) {
            throw new BizException("该区间已存在实体标注（tokenStart/tokenEnd 相同），请勿重复标注");
        }
        itemMapper.insert(item);
        // update tokens marking
        markTokensForEntity(item);
        return item;
    }

    @Override
    @Transactional
    public EntityItem update(EntityItem item) {
        if (item.getId() == null) {
            throw new BizException("实体 id 不能为空");
        }
        validateEntityRange(item);
        EntityItem existing = itemMapper.selectByDocumentIdAndTokenRange(
                item.getDocumentId(),
                item.getTokenStart(),
                item.getTokenEnd()
        );
        if (existing != null && !existing.getId().equals(item.getId())) {
            throw new BizException("该区间已存在实体标注（tokenStart/tokenEnd 相同），请勿重复标注");
        }
        itemMapper.update(item);
        markTokensForEntity(item);
        return item;
    }

    @Override
    @Transactional
    public void delete(Long id) {
        EntityItem e = itemMapper.selectById(id);
        if (e != null) {
            // unmark tokens that were associated
            List<DocumentToken> tokens = tokenMapper.selectByDocumentId(e.getDocumentId());
            for (DocumentToken t : tokens) {
                if (t.getIsEntity() != null && t.getIsEntity() && t.getEntityId() != null && t.getEntityId().equals(e.getId())) {
                    t.setIsEntity(false);
                    t.setEntityId(null);
                    tokenMapper.update(t);
                }
            }
            itemMapper.deleteById(id);
        }
    }

    private void markTokensForEntity(EntityItem e) {
        List<DocumentToken> tokens = tokenMapper.selectByDocumentId(e.getDocumentId());
        for (DocumentToken t : tokens) {
            if (t.getTokenIndex() >= e.getTokenStart() && t.getTokenIndex() <= e.getTokenEnd()) {
                t.setIsEntity(true);
                t.setEntityId(e.getId());
                tokenMapper.update(t);
            } else {
                // if token previously belonged to this entity, but now out of range, clear it
                if (t.getIsEntity() != null && t.getIsEntity() && t.getEntityId() != null && t.getEntityId().equals(e.getId())) {
                    t.setIsEntity(false);
                    t.setEntityId(null);
                    tokenMapper.update(t);
                }
            }
        }
    }

    private void validateEntityRange(EntityItem item) {
        if (item.getDocumentId() == null) {
            throw new BizException("documentId 不能为空");
        }
        if (item.getTokenStart() == null || item.getTokenEnd() == null) {
            throw new BizException("tokenStart/tokenEnd 不能为空");
        }
        if (item.getTokenStart() < 0 || item.getTokenEnd() < 0) {
            throw new BizException("tokenStart/tokenEnd 不能为负数");
        }
        if (item.getTokenStart() > item.getTokenEnd()) {
            throw new BizException("tokenStart 不能大于 tokenEnd");
        }
    }
}
