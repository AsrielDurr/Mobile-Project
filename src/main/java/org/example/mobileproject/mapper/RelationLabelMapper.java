package org.example.mobileproject.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.example.mobileproject.entity.RelationLabel;

import java.util.List;

@Mapper
public interface RelationLabelMapper {
    int insert(RelationLabel label);
    RelationLabel selectById(@Param("id") Long id);
    List<RelationLabel> selectAll();
    int update(RelationLabel label);
    int delete(@Param("id") Long id);
}
