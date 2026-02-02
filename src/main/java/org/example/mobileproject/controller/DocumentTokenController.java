package org.example.mobileproject.controller;

import lombok.RequiredArgsConstructor;
import org.example.mobileproject.entity.DocumentToken;
import org.example.mobileproject.service.DocumentTokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/document-tokens")
@RequiredArgsConstructor
public class DocumentTokenController {
    private final DocumentTokenService tokenService;

    @GetMapping("/document/{docId}")
    public ResponseEntity<List<DocumentToken>> listByDocument(@PathVariable Long docId) {
        return ResponseEntity.ok(tokenService.getByDocumentId(docId));
    }
}
