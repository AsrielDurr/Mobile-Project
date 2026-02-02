package org.example.mobileproject.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.mobileproject.entity.DocumentToken;
import org.example.mobileproject.entity.EntityItem;
import org.example.mobileproject.mapper.DocumentTokenMapper;
import org.example.mobileproject.mapper.EntityItemMapper;
import org.example.mobileproject.service.DocumentTokenService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentTokenServiceImpl implements DocumentTokenService {

    private final DocumentTokenMapper tokenMapper;
    private final EntityItemMapper entityItemMapper;

    @Override
    public List<DocumentToken> getByDocumentId(Long documentId) {
        return tokenMapper.selectByDocumentId(documentId);
    }

    @Override
    @Transactional
    public void rebuildTokensForDocument(Long documentId, List<String> tokens) {
        tokenMapper.deleteByDocumentId(documentId);
        if (tokens == null || tokens.isEmpty()) return;
        List<DocumentToken> list = new java.util.ArrayList<>();
        for (int i = 0; i < tokens.size(); i++) {
            DocumentToken t = new DocumentToken();
            t.setDocumentId(documentId);
            t.setTokenIndex(i);
            t.setTokenText(tokens.get(i));
            t.setIsEntity(false);
            t.setEntityId(null);
            list.add(t);
        }
        tokenMapper.batchInsert(list);
    }

    @Override
    @Transactional
    public void markTokensForEntities(Long documentId) {
        // reset
        List<DocumentToken> tokens = tokenMapper.selectByDocumentId(documentId);
        for (DocumentToken t : tokens) {
            t.setIsEntity(false);
            t.setEntityId(null);
            tokenMapper.update(t);
        }

        // mark according to entity_items
        List<EntityItem> entities = entityItemMapper.selectByDocumentId(documentId);
        for (EntityItem e : entities) {
            for (int idx = e.getTokenStart(); idx <= e.getTokenEnd(); idx++) {
                for (DocumentToken t : tokens) {
                    if (t.getTokenIndex().equals(idx)) {
                        t.setIsEntity(true);
                        t.setEntityId(e.getId());
                        tokenMapper.update(t);
                        break;
                    }
                }
            }
        }
    }
}
