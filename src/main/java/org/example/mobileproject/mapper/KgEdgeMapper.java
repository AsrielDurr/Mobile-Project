package org.example.mobileproject.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.mobileproject.entity.KgEdge;

import java.util.List;

@Mapper
public interface KgEdgeMapper {
    KgEdge selectById(Long id);
    List<KgEdge> selectByDocumentId(Long documentId);
    int insert(KgEdge edge);
    int update(KgEdge edge);
    int delete(Long id);
}
