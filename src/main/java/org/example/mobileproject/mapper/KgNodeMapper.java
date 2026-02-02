package org.example.mobileproject.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.mobileproject.entity.KgNode;

import java.util.List;

@Mapper
public interface KgNodeMapper {
    KgNode selectById(Long id);
    List<KgNode> selectByDocumentId(Long documentId);
    int insert(KgNode node);
    int update(KgNode node);
    int delete(Long id);
}
