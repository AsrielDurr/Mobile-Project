package org.example.mobileproject.controller;

import org.example.mobileproject.common.ApiResponse;
import org.example.mobileproject.entity.RelationLabel;
import org.example.mobileproject.service.RelationLabelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/relation-labels")
public class RelationLabelController {

    @Autowired
    private RelationLabelService relationLabelService;

    @PostMapping
    public ApiResponse<Integer> create(@RequestBody RelationLabel label) {
        int result = relationLabelService.add(label);
        return ApiResponse.success(result);
    }

    @GetMapping("/{id}")
    public ApiResponse<RelationLabel> get(@PathVariable Long id) {
        RelationLabel label = relationLabelService.getById(id);
        return ApiResponse.success(label);
    }

    @GetMapping
    public ApiResponse<List<RelationLabel>> list() {
        List<RelationLabel> list = relationLabelService.getAll();
        return ApiResponse.success(list);
    }

    @PutMapping
    public ApiResponse<Integer> update(@RequestBody RelationLabel label) {
        int result = relationLabelService.update(label);
        return ApiResponse.success(result);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Integer> delete(@PathVariable Long id) {
        int result = relationLabelService.delete(id);
        return ApiResponse.success(result);
    }
}
