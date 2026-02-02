package org.example.mobileproject.controller;

import org.example.mobileproject.common.ApiResponse;
import org.example.mobileproject.entity.PromptTemplate;
import org.example.mobileproject.service.PromptTemplateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prompts")
public class PromptTemplateController {

    @Autowired
    private PromptTemplateService promptTemplateService;

    @PostMapping
    public ApiResponse<Integer> create(@RequestBody PromptTemplate template) {
        int res = promptTemplateService.add(template);
        return ApiResponse.success(res);
    }

    @GetMapping("/{id}")
    public ApiResponse<PromptTemplate> get(@PathVariable Long id) {
        PromptTemplate t = promptTemplateService.getById(id);
        return ApiResponse.success(t);
    }

    @GetMapping
    public ApiResponse<List<PromptTemplate>> list(
            @RequestParam(required = false) String taskType,
            @RequestParam(required = false) String model) {

        List<PromptTemplate> list;
        if (taskType != null && !taskType.isEmpty()) {
            list = promptTemplateService.getByTaskType(taskType);
        } else if (model != null && !model.isEmpty()) {
            list = promptTemplateService.getByModel(model);
        } else {
            list = promptTemplateService.getAll();
        }
        return ApiResponse.success(list);
    }

    @PutMapping
    public ApiResponse<Integer> update(@RequestBody PromptTemplate template) {
        int res = promptTemplateService.update(template);
        return ApiResponse.success(res);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Integer> delete(@PathVariable Long id) {
        int res = promptTemplateService.delete(id);
        return ApiResponse.success(res);
    }

    @PostMapping("/{id}/activate")
    public ApiResponse<Integer> activate(@PathVariable Long id) {
        int res = promptTemplateService.setActive(id, 1);
        return ApiResponse.success(res);
    }

    @PostMapping("/{id}/deactivate")
    public ApiResponse<Integer> deactivate(@PathVariable Long id) {
        int res = promptTemplateService.setActive(id, 0);
        return ApiResponse.success(res);
    }
}
