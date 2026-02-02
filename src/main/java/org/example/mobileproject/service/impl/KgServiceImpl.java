package org.example.mobileproject.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.mobileproject.common.BizException;
import org.example.mobileproject.entity.*;
import org.example.mobileproject.mapper.*;
import org.example.mobileproject.service.KgService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class KgServiceImpl implements KgService {

    private final KgNodeMapper nodeMapper;
    private final KgEdgeMapper edgeMapper;
    private final DocumentMapper documentMapper;
    private final EntityItemMapper entityItemMapper;
    private final EntityLabelMapper entityLabelMapper;
    private final RelationLabelMapper relationLabelMapper;
    private final RelationMapper relationMapper;

    // 创建新节点
    @Override
    @Transactional
    public KgNode createNode(KgNode node) {

        Long documentId = node.getDocumentId();
        Long entityId = node.getEntityId();
        Long labelId = node.getLabelId();

        // 必须指定 document
        if (documentId == null) {
            throw new BizException("documentId 不能为空");
        }
        if (documentMapper.selectById(documentId) == null) {
            throw new BizException("文档不存在: " + documentId);
        }

        // 必须至少关联实体 or 标签
        if (entityId == null && labelId == null) {
            throw new BizException("节点必须至少关联实体或实体标签");
        }

        // 情况 1：关联实体
        if (entityId != null) {
            EntityItem entity = entityItemMapper.selectById(entityId);
            if (entity == null) {
                throw new BizException("实体不存在: " + entityId);
            }

            // 校验实体所属文档
            if (!entity.getDocumentId().equals(documentId)) {
                throw new BizException("实体不属于该文档（实体 documentId=" + entity.getDocumentId()
                        + "，节点 documentId=" + documentId + "）");
            }

            // 自动设置节点名
            if (node.getName() == null || node.getName().isEmpty()) {
                node.setName(entity.getText());
            }

            // 实体绑定 → 强制标签同步实体标签
            if (labelId != null && !labelId.equals(entity.getLabelId())) {
                throw new BizException("节点标签必须与实体标签一致（实体标签=" + entity.getLabelId() + "）");
            }

            node.setLabelId(entity.getLabelId());
        }

        // 情况 2：只关联标签（未关联实体）
        if (entityId == null && labelId != null) {
            EntityLabel label = entityLabelMapper.selectById(labelId);
            if (label == null) {
                throw new BizException("标签不存在: " + labelId);
            }
        }

        nodeMapper.insert(node);
        return node;
    }




    @Override
    @Transactional
    public KgNode updateNode(KgNode node) {

        KgNode db = nodeMapper.selectById(node.getId());
        if (db == null) {
            throw new BizException("节点不存在: " + node.getId());
        }

        Long documentId = db.getDocumentId();   // 不允许被修改
        node.setDocumentId(documentId);

        Long entityId = node.getEntityId();
        Long labelId = node.getLabelId();

        // 必须至少关联一种
        if (entityId == null && labelId == null) {
            throw new BizException("节点必须至少关联实体或实体标签");
        }

        // 情况 1：绑定实体
        if (entityId != null) {
            EntityItem entity = entityItemMapper.selectById(entityId);
            if (entity == null) {
                throw new BizException("实体不存在: " + entityId);
            }
            if (!entity.getDocumentId().equals(documentId)) {
                throw new BizException("实体不属于该文档");
            }

            // 自动名（可选）
            if ((node.getName() == null || node.getName().isEmpty())) {
                node.setName(entity.getText());
            }

            // 标签同步实体标签
            if (labelId != null && !labelId.equals(entity.getLabelId())) {
                throw new BizException("节点标签必须与实体标签一致（实体标签=" + entity.getLabelId() + "）");
            }
            node.setLabelId(entity.getLabelId());
        }

        // 情况 2：未绑定实体，只绑定标签
        if (entityId == null && labelId != null) {
            EntityLabel label = entityLabelMapper.selectById(labelId);
            if (label == null) {
                throw new BizException("标签不存在: " + labelId);
            }
        }

        nodeMapper.update(node);
        return nodeMapper.selectById(node.getId());
    }


    @Override
    public void deleteNode(Long id) {
        nodeMapper.delete(id);
    }

    @Override
    public List<KgNode> listNodesByDocument(Long documentId) {
        return nodeMapper.selectByDocumentId(documentId);
    }


    @Override
    public KgEdge updateEdge(KgEdge edge) {
        edgeMapper.update(edge);
        return edgeMapper.selectById(edge.getId());
    }

    @Override
    public void deleteEdge(Long id) {
        edgeMapper.delete(id);
    }

    @Override
    public List<KgEdge> listEdgesByDocument(Long documentId) {
        return edgeMapper.selectByDocumentId(documentId);
    }

    // ----- Graph -----

    @Override
    public Object loadFullGraph(Long documentId) {
        List<KgNode> nodes = nodeMapper.selectByDocumentId(documentId);
        List<KgEdge> edges = edgeMapper.selectByDocumentId(documentId);

        Map<String, Object> graph = new HashMap<>();
        graph.put("nodes", nodes);
        graph.put("edges", edges);

        return graph;
    }

    @Override
    @Transactional
    public KgEdge createEdge(KgEdge edge) {

        // 1. 校验 source node 是否存在
        KgNode source = nodeMapper.selectById(edge.getSourceNodeId());
        if (source == null) {
            throw new BizException("sourceNodeId 不存在: " + edge.getSourceNodeId());
        }

        // 2. 校验 target node 是否存在
        KgNode target = nodeMapper.selectById(edge.getTargetNodeId());
        if (target == null) {
            throw new BizException("targetNodeId 不存在: " + edge.getTargetNodeId());
        }

        // 3. 校验 documentId 是否一致
        if (!Objects.equals(edge.getDocumentId(), source.getDocumentId()) ||
                !Objects.equals(edge.getDocumentId(), target.getDocumentId())) {
            throw new BizException("edge.documentId 与节点 documentId 不一致");
        }

        // 4. 校验 relationLabelId 是否存在
        if (edge.getRelationLabelId() != null) {
            if (relationLabelMapper.selectById(edge.getRelationLabelId()) == null) {
                throw new BizException("relationLabelId 不存在: " + edge.getRelationLabelId());
            }
        }

        // 5. 插入 edge
        edgeMapper.insert(edge);
        return edge;
    }




}
