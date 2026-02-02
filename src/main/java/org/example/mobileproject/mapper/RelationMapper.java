package org.example.mobileproject.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.example.mobileproject.entity.Relation;

import java.util.List;

@Mapper
public interface RelationMapper {
    int insert(Relation relation);
    Relation selectById(@Param("id") Long id);
    List<Relation> selectByDocumentId(@Param("documentId") Long documentId);
    int update(Relation relation);
    int delete(@Param("id") Long id);

    Relation selectByDocumentAndLabel(
            @Param("documentId") Long documentId,
            @Param("relationLabelId") Long relationLabelId,
            @Param("headEntityId") Long headEntityId,
            @Param("tailEntityId") Long tailEntityId
    );

}
