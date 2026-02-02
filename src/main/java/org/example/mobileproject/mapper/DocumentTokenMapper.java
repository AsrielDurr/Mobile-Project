package org.example.mobileproject.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.mobileproject.entity.DocumentToken;

import java.util.List;

@Mapper
public interface DocumentTokenMapper {
    List<DocumentToken> selectByDocumentId(Long documentId);
    int batchInsert(List<DocumentToken> tokens);
    int deleteByDocumentId(Long documentId);
    int update(DocumentToken token);
    int insert(DocumentToken token);
}
