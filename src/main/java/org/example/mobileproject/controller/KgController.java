package org.example.mobileproject.controller;

import lombok.RequiredArgsConstructor;
import org.example.mobileproject.entity.KgEdge;
import org.example.mobileproject.entity.KgNode;
import org.example.mobileproject.service.KgService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/kg")
@RequiredArgsConstructor
public class KgController {

    private final KgService kgService;

    // ---------- Nodes ----------

    @PostMapping("/nodes")
    public ResponseEntity<KgNode> createNode(@RequestBody KgNode node) {
        return ResponseEntity.ok(kgService.createNode(node));
    }

    @PutMapping("/nodes/{id}")
    public ResponseEntity<KgNode> updateNode(
            @PathVariable Long id,
            @RequestBody KgNode node) {
        node.setId(id);
        return ResponseEntity.ok(kgService.updateNode(node));
    }

    @DeleteMapping("/nodes/{id}")
    public ResponseEntity<Void> deleteNode(@PathVariable Long id) {
        kgService.deleteNode(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/nodes/document/{docId}")
    public ResponseEntity<?> listNodes(@PathVariable Long docId) {
        return ResponseEntity.ok(kgService.listNodesByDocument(docId));
    }

    // ---------- Edges ----------

    @PostMapping("/edges")
    public ResponseEntity<KgEdge> createEdge(@RequestBody KgEdge edge) {
        return ResponseEntity.ok(kgService.createEdge(edge));
    }

    @PutMapping("/edges/{id}")
    public ResponseEntity<KgEdge> updateEdge(
            @PathVariable Long id,
            @RequestBody KgEdge edge) {
        edge.setId(id);
        return ResponseEntity.ok(kgService.updateEdge(edge));
    }

    @DeleteMapping("/edges/{id}")
    public ResponseEntity<Void> deleteEdge(@PathVariable Long id) {
        kgService.deleteEdge(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/edges/document/{docId}")
    public ResponseEntity<?> listEdges(@PathVariable Long docId) {
        return ResponseEntity.ok(kgService.listEdgesByDocument(docId));
    }

    // ---------- Graph ----------

    @GetMapping("/graph/{docId}")
    public ResponseEntity<?> loadGraph(@PathVariable Long docId) {
        return ResponseEntity.ok(kgService.loadFullGraph(docId));
    }
}
