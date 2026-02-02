package org.example.mobileproject.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.example.mobileproject.entity.PromptTemplate;

import java.util.List;

@Mapper
public interface PromptTemplateMapper {
    int insert(PromptTemplate template);
    PromptTemplate selectById(@Param("id") Long id);
    List<PromptTemplate> selectAll();
    List<PromptTemplate> selectByTaskType(@Param("taskType") String taskType);
    List<PromptTemplate> selectByModel(@Param("model") String model);
    int update(PromptTemplate template);
    int delete(@Param("id") Long id);

    // 状态切换
    int setActive(@Param("id") Long id, @Param("isActive") Integer isActive);
}
