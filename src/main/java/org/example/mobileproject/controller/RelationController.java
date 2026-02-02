package org.example.mobileproject.controller;

import org.example.mobileproject.common.ApiResponse;
import org.example.mobileproject.entity.Relation;
import org.example.mobileproject.service.RelationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/relations")
public class RelationController {

    @Autowired
    private RelationService relationService;

    @PostMapping
    public ApiResponse<Integer> create(@RequestBody Relation relation) {
        int result = relationService.add(relation);
        return ApiResponse.success(result);
    }

    @GetMapping("/{id}")
    public ApiResponse<Relation> get(@PathVariable Long id) {
        Relation relation = relationService.getById(id);
        return ApiResponse.success(relation);
    }

    @GetMapping("/document/{documentId}")
    public ApiResponse<List<Relation>> listByDocument(@PathVariable Long documentId) {
        List<Relation> list = relationService.getByDocumentId(documentId);
        return ApiResponse.success(list);
    }

    @PutMapping
    public ApiResponse<Integer> update(@RequestBody Relation relation) {
        int result = relationService.update(relation);
        return ApiResponse.success(result);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Integer> delete(@PathVariable Long id) {
        int result = relationService.delete(id);
        return ApiResponse.success(result);
    }
}
