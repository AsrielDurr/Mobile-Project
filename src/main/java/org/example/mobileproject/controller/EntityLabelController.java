package org.example.mobileproject.controller;

import lombok.RequiredArgsConstructor;
import org.example.mobileproject.entity.EntityLabel;
import org.example.mobileproject.service.EntityLabelService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/entity-labels")
@RequiredArgsConstructor
public class EntityLabelController {
    private final EntityLabelService labelService;

    @GetMapping("/{id}")
    public ResponseEntity<EntityLabel> get(@PathVariable Long id) {
        EntityLabel l = labelService.getById(id);
        if (l == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(l);
    }

    @GetMapping
    public ResponseEntity<List<EntityLabel>> list() {
        return ResponseEntity.ok(labelService.listAll());
    }

    @PostMapping
    public ResponseEntity<EntityLabel> create(@RequestBody EntityLabel label) {
        return ResponseEntity.ok(labelService.create(label));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EntityLabel> update(@PathVariable Long id, @RequestBody EntityLabel label) {
        label.setId(id);
        return ResponseEntity.ok(labelService.update(label));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        labelService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
