package org.example.mobileproject.mapper;

import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Mapper;
import org.example.mobileproject.entity.EntityItem;

import java.util.List;

@Mapper
public interface EntityItemMapper {
    EntityItem selectById(Long id);
    List<EntityItem> selectByDocumentId(Long documentId);
    EntityItem selectByDocumentIdAndTokenRange(
            @Param("documentId") Long documentId,
            @Param("tokenStart") Integer tokenStart,
            @Param("tokenEnd") Integer tokenEnd
    );
    int insert(EntityItem item);
    int update(EntityItem item);
    int deleteById(Long id);
}
