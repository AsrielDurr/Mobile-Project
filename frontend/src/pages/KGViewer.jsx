// src/pages/KGViewer.jsx

import { useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { getNodesByDocument } from "../api/kgNodes";
import { getEdgesByDocument } from "../api/kgEdges";
import { getEntityLabels } from "../api/entityLabels";
import { getRelationLabels } from "../api/relationLabels";
import { getDocuments } from "../api/documents";

export default function KGViewer() {
    const [documents, setDocuments] = useState([]);
    const [documentId, setDocumentId] = useState("");
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [entityLabels, setEntityLabels] = useState([]);
    const [relationLabels, setRelationLabels] = useState([]);
    const [hoveredLink, setHoveredLink] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const fgRef = useRef();
    const containerRef = useRef();

    // 初始化加载文档、实体标签和关系标签
    useEffect(() => {
        async function loadInitialData() {
            const docs = await getDocuments();
            setDocuments(docs || []);
            if (docs?.length) setDocumentId(docs[0].id);

            const entities = await getEntityLabels();
            setEntityLabels(entities || []);

            const relations = await getRelationLabels();
            setRelationLabels(relations || []);
        }
        loadInitialData();
    }, []);

    // 加载知识图谱数据
    async function loadGraph(docId) {
        if (!docId) return;

        const nodes = await getNodesByDocument(docId);
        const edges = await getEdgesByDocument(docId);

        const savedLayout = JSON.parse(localStorage.getItem(`kg-layout-${docId}`) || "{}");

        const labelColorMap = {};
        entityLabels.forEach((l, idx) => {
            const colors = ["#f94144", "#f3722c", "#f9c74f", "#90be6d", "#43aa8b", "#577590"];
            labelColorMap[l.id] = colors[idx % colors.length];
        });

        setGraphData({
            nodes: nodes.map((n) => ({
                id: n.id,
                name: n.name,
                labelId: n.labelId,
                color: labelColorMap[n.labelId] || "#888",
                fx: savedLayout[n.id]?.fx ?? null,
                fy: savedLayout[n.id]?.fy ?? null,
            })),
            links: edges.map((e) => ({
                source: e.sourceNodeId,
                target: e.targetNodeId,
                relationLabelId: e.relationLabelId,
                name: e.edgeName || relationLabels.find(r => r.id === e.relationLabelId)?.relationName || "",
                properties: e.properties || {},
            })),
        });
    }

    useEffect(() => {
        if (documentId) loadGraph(documentId);
    }, [documentId, entityLabels, relationLabels]);

    // 节点拖拽后固定位置
    const handleNodeDragEnd = (node) => {
        node.fx = node.x;
        node.fy = node.y;
    };

    // 保存布局按钮
    const saveLayout = () => {
        const layout = {};
        graphData.nodes.forEach(n => {
            layout[n.id] = { fx: n.fx, fy: n.fy };
        });
        localStorage.setItem(`kg-layout-${documentId}`, JSON.stringify(layout));
        alert("布局已保存！");
    };

    // 边点击显示属性
    const handleLinkClick = (link) => {
        setHoveredLink(link);
    };

    // 边 hover
    const handleLinkHover = (link, prevLink) => {
        setHoveredLink(link);
    };

    // 鼠标位置
    const handleMouseMove = (e) => {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left + 10, y: e.clientY - rect.top + 10 });
    };

    const tooltipStyle = {
        position: "absolute",
        padding: "10px 14px",
        background: "rgba(50,50,50,0.95)",
        color: "#fff",
        borderRadius: "8px",
        pointerEvents: "none",
        fontSize: "14px",
        zIndex: 1000,
        whiteSpace: "pre-line",
        maxWidth: "320px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        transition: "all 0.1s ease",
    };

    return (
        <div className="page-body">
            <h1 className="text-2xl font-bold mb-4">知识图谱预览</h1>

            {/* 文档选择 */}
            <div className="card mb-4">
                <div className="card-header flex items-center justify-between gap-3">
                    <span>选择文档</span>
                    <button className="btn btn-primary" onClick={saveLayout}>保存布局</button>
                </div>
                <div className="card-body flex items-center gap-3 flex-wrap">
                    <label className="font-semibold text-gray-700">文档</label>
                    <select
                        className="input w-64"
                        value={documentId}
                        onChange={(e) => setDocumentId(e.target.value)}
                    >
                        {documents.map((d) => (
                            <option key={d.id} value={d.id}>{d.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 知识图谱画布 */}
            <div className="card">
                <div className="card-header">知识图谱画布</div>
                <div
                    className="card-body relative"
                    style={{ height: "72vh", padding: 0 }}
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                >
                    <div style={{ width: "100%", height: "100%", position: "relative" }}>
                        <ForceGraph2D
                            ref={fgRef}
                            graphData={graphData}
                            nodeLabel={(node) =>
                                `名称: ${node.name}\n标签: ${entityLabels.find(l => l.id === node.labelId)?.labelName || "无"}`
                            }
                            nodeCanvasObject={(node, ctx, globalScale) => {
                                const fontSize = 16;
                                ctx.fillStyle = node.color;
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
                                ctx.fill();

                                ctx.font = `${fontSize}px Sans-Serif`;
                                ctx.fillStyle = "#000";
                                ctx.textAlign = "center";
                                ctx.textBaseline = "top";
                                ctx.fillText(node.name, node.x, node.y + 10);
                            }}
                            linkCanvasObjectMode={() => 'after'}
                            linkCanvasObject={(link, ctx) => {
                                const start = link.source;
                                const end = link.target;
                                if (typeof start !== 'object' || typeof end !== 'object') return;

                                const dx = end.x - start.x;
                                const dy = end.y - start.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);

                                const fontSize = 14;
                                ctx.font = `${fontSize}px Sans-Serif`;
                                ctx.fillStyle = '#000';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';

                                if (dist > 50 && link.name) {
                                    const x = (start.x + end.x) / 2;
                                    const y = (start.y + end.y) / 2;
                                    ctx.fillText(link.name, x, y);
                                }
                            }}
                            linkDirectionalArrowLength={6}
                            linkDirectionalArrowRelPos={1}
                            linkWidth={1.5}
                            linkCurvature={0.2}
                            enableNodeDrag={true}
                            onNodeDragEnd={handleNodeDragEnd}
                            onLinkClick={handleLinkClick}
                            onLinkHover={handleLinkHover}
                        />

                        {/* 边的 tooltip */}
                        {hoveredLink && (
                            <div style={{ ...tooltipStyle, left: mousePos.x, top: mousePos.y }}>
                                <b>{hoveredLink.name || "无名称"}</b>
                                {hoveredLink.properties && Object.keys(hoveredLink.properties).length > 0 && (
                                    <div style={{ marginTop: 6 }}>
                                        {Object.entries(hoveredLink.properties).map(([k, v]) => (
                                            <div key={k}>{k}: {v}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
