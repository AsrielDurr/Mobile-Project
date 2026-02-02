package org.example.mobileproject.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.mobileproject.entity.Document;

import java.util.List;

@Mapper
public interface DocumentMapper {
    Document selectById(Long id);
    List<Document> selectAll();
    int insert(Document doc);
    int update(Document doc);
    int deleteById(Long id);
}
