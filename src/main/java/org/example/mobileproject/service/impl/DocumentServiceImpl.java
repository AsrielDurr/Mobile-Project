package org.example.mobileproject.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.mobileproject.entity.Document;
import org.example.mobileproject.entity.DocumentToken;
import org.example.mobileproject.entity.EntityItem;
import org.example.mobileproject.mapper.DocumentMapper;
import org.example.mobileproject.mapper.DocumentTokenMapper;
import org.example.mobileproject.mapper.EntityItemMapper;
import org.example.mobileproject.service.DocumentService;
import org.example.mobileproject.util.TokenDiffUtil;
import org.example.mobileproject.util.Tokenizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {

    private final DocumentMapper documentMapper;
    private final DocumentTokenMapper tokenMapper;
    private final EntityItemMapper entityItemMapper;

    @Override
    public Document getById(Long id) {
        return documentMapper.selectById(id);
    }

    @Override
    public List<Document> listAll() {
        return documentMapper.selectAll();
    }

    @Override
    @Transactional
    public Document create(Document doc) {
        documentMapper.insert(doc);
        // build tokens
        List<String> tokens = Tokenizer.tokenize(doc.getContent());
        tokenMapper.deleteByDocumentId(doc.getId());
        List<DocumentToken> tokenList = new ArrayList<>();
        for (int i = 0; i < tokens.size(); i++) {
            DocumentToken t = new DocumentToken();
            t.setDocumentId(doc.getId());
            t.setTokenIndex(i);
            t.setTokenText(tokens.get(i));
            t.setIsEntity(false);
            t.setEntityId(null);
            tokenList.add(t);
        }
        if (!tokenList.isEmpty()) tokenMapper.batchInsert(tokenList);
        // no entities initially
        return doc;
    }

    @Override
    @Transactional
    public Document update(Document doc) {
        // fetch old tokens
        List<DocumentToken> oldTokens = tokenMapper.selectByDocumentId(doc.getId());
        List<String> oldTokenTexts = new ArrayList<>();
        for (DocumentToken t: oldTokens) oldTokenTexts.add(t.getTokenText());

        // tokenize new content
        List<String> newTokenTexts = Tokenizer.tokenize(doc.getContent());

        // compute mapping oldIndex -> newIndex (some old may map to -1)
        Map<Integer, Integer> oldToNew = TokenDiffUtil.buildOldToNewIndexMap(oldTokenTexts, newTokenTexts);

        // update document content
        documentMapper.update(doc);

        // rebuild document_tokens (delete and insert new ones)
        tokenMapper.deleteByDocumentId(doc.getId());
        List<DocumentToken> newTokens = new ArrayList<>();
        for (int i = 0; i < newTokenTexts.size(); i++) {
            DocumentToken nt = new DocumentToken();
            nt.setDocumentId(doc.getId());
            nt.setTokenIndex(i);
            nt.setTokenText(newTokenTexts.get(i));
            nt.setIsEntity(false);
            nt.setEntityId(null);
            newTokens.add(nt);
        }
        if (!newTokens.isEmpty()) tokenMapper.batchInsert(newTokens);

        // update entities positions
        List<EntityItem> entities = entityItemMapper.selectByDocumentId(doc.getId());
        for (EntityItem e : entities) {
            int oldStart = e.getTokenStart();
            int oldEnd = e.getTokenEnd();
            // collect mapped indexes for range
            List<Integer> mapped = new ArrayList<>();
            for (int idx = oldStart; idx <= oldEnd; idx++) {
                Integer mappedIdx = oldToNew.get(idx);
                if (mappedIdx != null && mappedIdx >= 0) mapped.add(mappedIdx);
            }
            if (mapped.isEmpty()) {
                // entity tokens fully removed -> delete entity
                entityItemMapper.deleteById(e.getId());
            } else {
                int newStart = Collections.min(mapped);
                int newEnd = Collections.max(mapped);
                e.setTokenStart(newStart);
                e.setTokenEnd(newEnd);
                entityItemMapper.update(e);
            }
        }

        // finally, synchronize tokens' is_entity and entity_id according to updated entities
        // (mark tokens that belong to entities)
        List<DocumentToken> rebuiltTokens = tokenMapper.selectByDocumentId(doc.getId());
        // first reset all tokens
        for (DocumentToken t : rebuiltTokens) {
            t.setIsEntity(false);
            t.setEntityId(null);
            tokenMapper.update(t);
        }
        // fetch entities again
        List<EntityItem> finalEntities = entityItemMapper.selectByDocumentId(doc.getId());
        for (EntityItem e : finalEntities) {
            for (int i = e.getTokenStart(); i <= e.getTokenEnd(); i++) {
                DocumentToken dt = new DocumentToken();
                dt.setDocumentId(doc.getId());
                dt.setTokenIndex(i);
                dt.setIsEntity(true);
                dt.setEntityId(e.getId());
                // need to find token id: we'll update by matching documentId + tokenIndex via select list and update
                // Simple approach: fetch token by document id and token index from rebuiltTokens
                for (DocumentToken token : rebuiltTokens) {
                    if (token.getTokenIndex().equals(i)) {
                        token.setIsEntity(true);
                        token.setEntityId(e.getId());
                        tokenMapper.update(token);
                        break;
                    }
                }
            }
        }

        return doc;
    }

    @Override
    @Transactional
    public void delete(Long id) {
        // delete document_tokens
        tokenMapper.deleteByDocumentId(id);
        // delete entities (entity_items have FK to documents? if not, ensure deletion)
        List<EntityItem> items = entityItemMapper.selectByDocumentId(id);
        for (EntityItem e : items) {
            entityItemMapper.deleteById(e.getId());
        }
        // delete document
        documentMapper.deleteById(id);
    }
}
