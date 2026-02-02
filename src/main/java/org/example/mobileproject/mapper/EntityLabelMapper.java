package org.example.mobileproject.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.mobileproject.entity.EntityLabel;

import java.util.List;

@Mapper
public interface EntityLabelMapper {
    EntityLabel selectById(Long id);
    List<EntityLabel> selectAll();
    int insert(EntityLabel label);
    int update(EntityLabel label);
    int deleteById(Long id);
}
