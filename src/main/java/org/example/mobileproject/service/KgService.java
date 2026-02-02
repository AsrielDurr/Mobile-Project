package org.example.mobileproject.service;

import org.example.mobileproject.entity.KgEdge;
import org.example.mobileproject.entity.KgNode;

import java.util.List;

public interface KgService {

    // ----- Node ------
    KgNode createNode(KgNode node);
    KgNode updateNode(KgNode node);
    void deleteNode(Long id);
    List<KgNode> listNodesByDocument(Long documentId);

    // ----- Edge ------
    KgEdge createEdge(KgEdge edge);
    KgEdge updateEdge(KgEdge edge);
    void deleteEdge(Long id);
    List<KgEdge> listEdgesByDocument(Long documentId);

    // ----- Graph ------
    Object loadFullGraph(Long documentId);
}
