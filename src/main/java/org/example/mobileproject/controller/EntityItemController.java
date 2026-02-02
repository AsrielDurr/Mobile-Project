package org.example.mobileproject.controller;

import lombok.RequiredArgsConstructor;
import org.example.mobileproject.entity.EntityItem;
import org.example.mobileproject.service.EntityItemService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/entity-items")
@RequiredArgsConstructor
public class EntityItemController {
    private final EntityItemService itemService;

    @GetMapping("/{id}")
    public ResponseEntity<EntityItem> get(@PathVariable Long id) {
        EntityItem it = itemService.getById(id);
        if (it == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(it);
    }

    @GetMapping("/document/{docId}")
    public ResponseEntity<List<EntityItem>> listByDocument(@PathVariable Long docId) {
        return ResponseEntity.ok(itemService.listByDocumentId(docId));
    }

    @PostMapping
    public ResponseEntity<EntityItem> create(@RequestBody EntityItem item) {
        return ResponseEntity.ok(itemService.create(item));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EntityItem> update(@PathVariable Long id, @RequestBody EntityItem item) {
        item.setId(id);
        return ResponseEntity.ok(itemService.update(item));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        itemService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
