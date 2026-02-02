// src/pages/KGEditor.jsx
import { useEffect, useState } from "react";
import {
    getNodesByDocument,
    createNode,
    updateNode,
    deleteNode,
} from "../api/kgNodes.js";
import {
    getEdgesByDocument,
    createEdge,
    updateEdge,
    deleteEdge,
} from "../api/kgEdges.js";
import { getDocuments } from "../api/documents.js";
import { getDocumentTokensByDocument } from "../api/documentTokens.js";
import { getEntityItemsByDocument } from "../api/entityItems.js";
import { getEntityLabels } from "../api/entityLabels.js";
import { getRelationLabels } from "../api/relationLabels.js";
import SearchableSelect from "../utils/SearchableSelect.jsx"

export default function KGEditor() {
    const [documents, setDocuments] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState("");

    const [nodeFilter, setNodeFilter] = useState("");
    const [edgeFilter, setEdgeFilter] = useState("");

    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [docTokens, setDocTokens] = useState([]);

    const [entities, setEntities] = useState([]); // 实体项（含 tokenStart/tokenEnd）
    const [entityLabels, setEntityLabels] = useState([]); // 标签集合
    const [relationLabels, setRelationLabels] = useState([]);

    const [showNodeModal, setShowNodeModal] = useState(false);
    const [nodeForm, setNodeForm] = useState({
        id: null,
        documentId: "",
        name: "",
        text: "",
        entityId: null,
        labelId: null,
        propertiesList: [],
    });

    const [showEdgeModal, setShowEdgeModal] = useState(false);
    const [edgeForm, setEdgeForm] = useState({
        id: null,
        documentId: "",
        sourceNodeId: "",
        targetNodeId: "",
        relationId: null,
        edgeName: "",
        propertiesList: [],
    });

    // -------------------------
    // 初始化加载
    // -------------------------
    useEffect(() => {
        loadDocuments();
        loadRelationLabels();
        loadEntityLabels();
    }, []);

    async function loadDocuments() {
        try {
            const data = await getDocuments();
            setDocuments(data || []);
            if (data?.length) setSelectedDocId(String(data[0].id));
        } catch (err) {
            console.error("加载 documents 失败", err);
            setDocuments([]);
        }
    }

    async function loadRelationLabels() {
        try {
            const data = await getRelationLabels();
            setRelationLabels(data || []);
        } catch (err) {
            console.error("加载 relation labels 失败", err);
            setRelationLabels([]);
        }
    }

    async function loadEntityLabels() {
        try {
            const data = await getEntityLabels();
            setEntityLabels(data || []);
        } catch (err) {
            console.error("加载 entity labels 失败", err);
            setEntityLabels([]);
        }
    }

    // -------------------------
    // 文档切换 -> 加载相关数据
    // -------------------------
    useEffect(() => {
        if (!selectedDocId) return;
        loadNodes();
        loadEdges();
        loadTokens();
        loadEntities();
    }, [selectedDocId]);

    async function loadNodes() {
        try {
            const data = await getNodesByDocument(selectedDocId);
            setNodes(data || []);
        } catch (err) {
            console.error("加载节点失败", err);
            setNodes([]);
        }
    }

    async function loadEdges() {
        try {
            const data = await getEdgesByDocument(selectedDocId);
            setEdges(data || []);
        } catch (err) {
            console.error("加载边失败", err);
            setEdges([]);
        }
    }

    async function loadTokens() {
        try {
            const tokens = await getDocumentTokensByDocument(selectedDocId);
            setDocTokens(tokens || []);
        } catch (err) {
            console.error("加载 tokens 失败", err);
            setDocTokens([]);
        }
    }

    // 加载实体项（并尝试读取 tokenStart/tokenEnd 字段）
    async function loadEntities() {
        try {
            const items = await getEntityItemsByDocument(selectedDocId);
            const normalized = (items || []).map((e) => {
                // 支持多种命名：tokenStart / token_start / start / start_offset
                const tokenStart = e.tokenStart ?? e.token_start ?? e.start ?? e.start_offset ?? null;
                const tokenEnd = e.tokenEnd ?? e.token_end ?? e.end ?? e.end_offset ?? null;
                return {
                    id: e.id,
                    text: e.text,
                    labelId: e.labelId ?? e.label_id ?? null,
                    documentId: e.documentId ?? e.document_id ?? null,
                    tokenStart,
                    tokenEnd,
                };
            });
            setEntities(normalized);
        } catch (err) {
            console.error("加载实体项失败", err);
            setEntities([]);
        }
    }

    // -------------------------
    // 文本选中 -> 创建节点（鼠标选取）
    // -------------------------
    function handleMouseUp() {
        const sel = window.getSelection();
        const text = sel.toString().trim();
        if (!text) return;

        setNodeForm({
            id: null,
            documentId: selectedDocId,
            name: text,
            text,
            entityId: null,
            labelId: null,
            propertiesList: [],
        });
        setShowNodeModal(true);
    }

    // -------------------------
    // 保存节点（新增 or 更新）
    // 说明：
    // - 如果 nodeForm.id 有值则走 updateNode
    // - 新建时对 label 去重；编辑时跳过该去重检查
    // - 如果 entityId 被设置且已有节点绑定该 entityId，则直接打开编辑该节点
    // -------------------------
    async function handleCreateNode() {
        const propsObj = {};
        nodeForm.propertiesList.forEach((p) => {
            if (p.key) propsObj[p.key] = p.value;
        });

        const payload = {
            documentId: Number(selectedDocId),
            name: nodeForm.name,
            text: nodeForm.text || nodeForm.name,
            properties: Object.keys(propsObj).length ? propsObj : null,
        };

        // 保存优先级：如果 labelId 明确存在，则以 labelId 为主（并清除 entityId）。
        // 如果 entityId 存在并且 labelId 为空，则以 entityId 保存（并同步 labelId 为实体的标签）。
        if (nodeForm.labelId) {
            payload.labelId = nodeForm.labelId;
            payload.entityId = null;
        } else if (nodeForm.entityId) {
            payload.entityId = nodeForm.entityId;
            payload.labelId = null;
        } else {
            payload.entityId = null;
            payload.labelId = null;
        }

        try {
            // 如果选择了 entityId，先检测是否已有节点绑定该实体（避免后端 unique 冲突）
            if (payload.entityId) {
                const existing = nodes.find(
                    (n) => n.entityId && Number(n.entityId) === Number(payload.entityId)
                );
                if (existing) {
                    // 如果用户当前是编辑这个 existing 节点，则允许继续更新；否则打开编辑窗口以更新该节点
                    if (!nodeForm.id || Number(nodeForm.id) !== Number(existing.id)) {
                        openNodeEdit(existing);
                        alert("该实体已被绑定到节点，已打开编辑窗口以更新该节点。");
                        return;
                    }
                }
            }

            // 新建时的去重：仅在没有 nodeForm.id（即创建）时检查
            if (!nodeForm.id) {
                if (!payload.entityId && payload.labelId) {
                    const dup = nodes.find(
                        (n) =>
                            Number(n.documentId) === Number(selectedDocId) &&
                            n.labelId &&
                            Number(n.labelId) === Number(payload.labelId) &&
                            n.name === payload.name
                    );
                    if (dup) {
                        alert("相同文档下已存在相同名称且相同标签的节点，已阻止重复创建。");
                        return;
                    }
                }
            }

            if (nodeForm.id) {
                // 编辑：调用 updateNode
                await updateNode(nodeForm.id, payload);
            } else {
                // 新建
                await createNode(payload);
            }

            setShowNodeModal(false);
            await loadNodes();
        } catch (err) {
            console.error("保存节点失败", err);
            alert("保存节点失败，请检查控制台日志：" + (err?.message || err));
        }
    }

    async function handleDeleteNode(id) {
        try {
            await deleteNode(id);
            await loadNodes();
        } catch (err) {
            console.error("删除节点失败", err);
            alert("删除节点失败，请检查控制台日志");
        }
    }

    // -------------------------
    // 保存边（新增 / 编辑）
    // -------------------------
    async function handleSaveEdge() {
        const propsObj = {};
        edgeForm.propertiesList.forEach((p) => {
            if (p.key) propsObj[p.key] = p.value;
        });

        const payload = {
            documentId: Number(selectedDocId),
            sourceNodeId: Number(edgeForm.sourceNodeId),
            targetNodeId: Number(edgeForm.targetNodeId),
            relationLabelId: edgeForm.relationId ?? null,
            edgeName: edgeForm.edgeName || "",
            properties: Object.keys(propsObj).length ? propsObj : null,
        };

        try {
            if (edgeForm.id) {
                await updateEdge(edgeForm.id, payload);
            } else {
                await createEdge(payload);
            }
            setShowEdgeModal(false);
            await loadEdges();
        } catch (err) {
            console.error("保存边失败", err);
            alert("保存边失败，请检查控制台日志：" + (err?.message || err));
        }
    }

    async function handleDeleteEdge(id) {
        try {
            await deleteEdge(id);
            await loadEdges();
        } catch (err) {
            console.error("删除边失败", err);
            alert("删除边失败，请检查控制台日志");
        }
    }

    const openEdgeModal = (edge = null) => {
        if (edge) {
            setEdgeForm({
                id: edge.id,
                documentId: edge.documentId,
                sourceNodeId: Number(edge.sourceNodeId),
                targetNodeId: Number(edge.targetNodeId),
                relationId: edge.relationLabelId ?? null,
                edgeName: edge.edgeName || "",
                propertiesList: edge.properties
                    ? Object.entries(edge.properties).map(([k, v]) => ({ key: k, value: v }))
                    : [],
            });
        } else {
            setEdgeForm({
                id: null,
                documentId: selectedDocId,
                sourceNodeId: "",
                targetNodeId: "",
                relationId: null,
                edgeName: "",
                propertiesList: [],
            });
        }
        setShowEdgeModal(true);
    };

    // -------------------------
    // 打开节点编辑窗口（prefill）
    // -------------------------
    const openNodeEdit = (node) => {
        // 尝试找到实体项以同步实体对应标签（优先同步）
        const ent = node.entityId ? entities.find((e) => Number(e.id) === Number(node.entityId)) : null;
        setNodeForm({
            id: node.id,
            documentId: node.documentId,
            name: node.name,
            text: node.text,
            entityId: node.entityId ?? null,
            labelId: ent ? ent.labelId ?? node.labelId ?? null : node.labelId ?? null,
            propertiesList: node.properties
                ? Object.entries(node.properties).map(([k, v]) => ({ key: k, value: v }))
                : [],
        });
        setShowNodeModal(true);
    };

    // -------------------------
    // 渲染文档 tokens，其中高亮已标注实体（并一次性渲染实体全文本）
    // 逻辑：遍历 token array，用 idx 作为 token index。若 token index 恰为某实体 tokenStart，则渲染一个 entity span 并跳过实体覆盖长度。
    // -------------------------
    function renderDocWithEntities() {
        if (!docTokens || docTokens.length === 0) return null;

        const elements = [];
        // Build an index->entityStart map (以 tokenStart 为准)
        const startMap = new Map();
        entities.forEach((ent) => {
            if (ent.tokenStart != null && ent.tokenEnd != null) {
                startMap.set(Number(ent.tokenStart), ent);
            }
        });

        let idx = 0;
        while (idx < docTokens.length) {
            const token = docTokens[idx];
            // token index: prefer explicit tokenIndex property, otherwise use array index
            const tokenIndex = token.tokenIndex ?? token.index ?? idx;

            const ent = startMap.get(Number(tokenIndex));
            if (ent) {
                // build the full entity text from tokens tokenStart..tokenEnd (if tokens provide tokenText)
                const pieces = [];
                const endIdx = Number(ent.tokenEnd);
                for (let j = tokenIndex; j <= endIdx && j < docTokens.length; j++) {
                    pieces.push(docTokens[j].tokenText ?? "");
                }
                const entText = pieces.join("");

                elements.push(
                    <span
                        key={`ent-${ent.id}-${tokenIndex}`}
                        className="px-0.5 py-0.5 bg-yellow-200 cursor-pointer hover:bg-yellow-300 rounded"
                        onClick={() => {
                            // 如果当前实体已经有节点绑定（同文档），打开编辑；否则以 entityId 创建新节点（prefill）
                            const existingNode = nodes.find((n) => n.entityId && Number(n.entityId) === Number(ent.id));
                            if (existingNode) {
                                openNodeEdit(existingNode);
                                return;
                            }
                            setNodeForm({
                                id: null,
                                documentId: selectedDocId,
                                name: ent.text,
                                text: ent.text,
                                entityId: ent.id,
                                labelId: ent.labelId ?? null,
                                propertiesList: [],
                            });
                            setShowNodeModal(true);
                        }}
                    >
                        {entText}
                    </span>
                );
                // advance idx to token after entity end
                idx = endIdx + 1;
                continue;
            }

            // no entity starting here -> render single token
            elements.push(
                <span key={`tok-${idx}`} className="px-0.5 py-0.5">
                    {token.tokenText ?? ""}
                </span>
            );
            idx++;
        }

        return elements;
    }

    // -------------------------
    // 页面 UI
    // -------------------------
    return (
        <div className="page-body">
            <h1 className="text-2xl font-bold mb-4">知识图谱编辑器</h1>

            {/* 文档选择 */}
            <div className="card mb-4">
                <div className="card-header">选择文档</div>
                <div className="card-body">
                    <select
                        className="input"
                        value={selectedDocId}
                        onChange={(e) => setSelectedDocId(String(e.target.value))}
                    >
                        {documents.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.title}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 文档内容（高亮实体，可点击一键创建实体绑定节点；也可选中文本创建节点） */}
            <div className="card mb-4">
                <div className="card-header">当前文档内容（选中文本可创建节点 / 点击高亮实体一键创建节点）</div>
                <div className="card-body">
                    <div
                        id="kg-doc-content"
                        className="border rounded-xl p-3 max-h-[220px] overflow-auto cursor-text bg-[#f9fbff]"
                        onMouseUp={handleMouseUp}
                    >
                        {renderDocWithEntities()}
                    </div>
                </div>
            </div>

            {/* 节点列表 */}
            <div className="card mb-4">
                <div className="card-header flex items-center justify-between gap-2">
        <span className="text-lg font-semibold flex items-center gap-2">
            节点列表
            {/* 新增节点按钮放在标题右边 */}
            <button
                className="btn btn-primary whitespace-nowrap text-center"
                onClick={() => {
                    setNodeForm({
                        id: null,
                        documentId: selectedDocId,
                        name: "",
                        text: "",
                        entityId: null,
                        labelId: null,
                        propertiesList: [],
                    });
                    setShowNodeModal(true);
                }}
            >
                新增节点
            </button>
        </span>

                    {/* 搜索框和按钮 */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            className="input w-64 border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="搜索节点..."
                            value={nodeFilter}
                            onChange={(e) => setNodeFilter(e.target.value)}
                        />
                        <button
                            className="btn btn-primary whitespace-nowrap text-center"
                            onClick={() => setNodeFilter(nodeFilter)}
                        >
                            搜索
                        </button>
                        <button
                            className="btn btn-ghost whitespace-nowrap text-center"
                            onClick={() => setNodeFilter("")}
                        >
                            取消
                        </button>
                    </div>
                </div>

                <div className="card-body space-y-2">
                    {nodes
                        .filter((n) =>
                            n.name.toLowerCase().includes(nodeFilter.toLowerCase())
                        )
                        .map((n) => {
                            const entity = entities.find((e) => e.id === n.entityId);
                            const label = entityLabels.find((l) => l.id === n.labelId);

                            const highlightText = (text, query) => {
                                if (!query) return text;
                                const parts = text.split(new RegExp(`(${query})`, "gi"));
                                return parts.map((part, idx) =>
                                    part.toLowerCase() === query.toLowerCase() ? (
                                        <span key={idx} className="bg-yellow-200">{part}</span>
                                    ) : (
                                        part
                                    )
                                );
                            };

                            return (
                                <div key={n.id} className="p-4 border rounded bg-white shadow-sm">
                                    <div className="text-lg font-bold">{highlightText(n.name, nodeFilter)}</div>
                                    <div className="text-sm mt-1"><b>实体：</b>{entity ? entity.text : "未关联"}</div>
                                    <div className="text-sm mt-1"><b>实体标签：</b>{label ? label.labelName : "未关联"}</div>
                                    <div className="text-sm mt-3">
                                        <b>属性：</b>
                                        {!n.properties || Object.keys(n.properties).length === 0 ? (
                                            <div className="mt-1 text-gray-400 italic">无</div>
                                        ) : (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {Object.entries(n.properties).map(([key, value]) => (
                                                    <div key={key} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs shadow-sm border border-blue-100 hover:shadow transition cursor-default max-w-full"
                                                         title={`${key}: ${typeof value === "object" ? JSON.stringify(value, null, 2) : value}`}>
                                                        <span className="font-semibold">{key}</span><span className="mx-1">:</span>
                                                        <span className="truncate inline-block max-w-[180px] align-middle">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3 flex justify-end space-x-2">
                                        <button className="btn btn-ghost" onClick={() => openNodeEdit(n)}>编辑</button>
                                        <button className="btn btn-danger" onClick={() => handleDeleteNode(n.id)}>删除</button>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* 边列表 */}
            <div className="card mb-4">
                <div className="card-header flex items-center justify-between gap-2">
        <span className="text-lg font-semibold flex items-center gap-2">
            边列表
            {/* 新增边按钮放在标题右边 */}
            <button
                className="btn btn-primary whitespace-nowrap text-center"
                onClick={() => openEdgeModal()}
            >
                新增边
            </button>
        </span>

                    {/* 搜索框和按钮 */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            className="input w-64 border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="搜索边..."
                            value={edgeFilter}
                            onChange={(e) => setEdgeFilter(e.target.value)}
                        />
                        <button
                            className="btn btn-primary whitespace-nowrap text-center"
                            onClick={() => setEdgeFilter(edgeFilter)}
                        >
                            搜索
                        </button>
                        <button
                            className="btn btn-ghost whitespace-nowrap text-center"
                            onClick={() => setEdgeFilter("")}
                        >
                            取消
                        </button>
                    </div>
                </div>

                <div className="card-body space-y-2">
                    {edges
                        .filter((e) => {
                            const sourceNode = nodes.find((n) => n.id === e.sourceNodeId);
                            const targetNode = nodes.find((n) => n.id === e.targetNodeId);
                            const edgeName = e.edgeName || "";
                            const query = edgeFilter.toLowerCase();

                            return (
                                sourceNode?.name.toLowerCase().includes(query) ||
                                targetNode?.name.toLowerCase().includes(query) ||
                                edgeName.toLowerCase().includes(query)
                            );
                        })
                        .map((e) => {
                            const sourceNode = nodes.find((n) => n.id === e.sourceNodeId);
                            const targetNode = nodes.find((n) => n.id === e.targetNodeId);
                            const rel = relationLabels.find((r) => r.id === e.relationLabelId);

                            const highlightText = (text, query) => {
                                if (!query) return text;
                                const parts = text.split(new RegExp(`(${query})`, "gi"));
                                return parts.map((part, idx) =>
                                    part.toLowerCase() === query.toLowerCase() ? (
                                        <span key={idx} className="bg-yellow-200">{part}</span>
                                    ) : (
                                        part
                                    )
                                );
                            };

                            return (
                                <div key={e.id} className="p-3 border rounded flex flex-col">
                                    <div>
                                        <b>{highlightText(sourceNode?.name || "未知源节点", edgeFilter)}</b>
                                        {" → "}
                                        <b>{highlightText(e.edgeName || "未命名", edgeFilter)}</b>
                                        {" → "}
                                        <b>{highlightText(targetNode?.name || "未知目标节点", edgeFilter)}</b>
                                    </div>
                                    <div className="text-sm text-gray-600">关系标签：{rel?.relationName || "无"}</div>
                                    <div className="flex space-x-2 mt-2">
                                        <button className="btn btn-ghost" onClick={() => openEdgeModal(e)}>编辑</button>
                                        <button className="btn btn-danger" onClick={() => handleDeleteEdge(e.id)}>删除</button>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>



            {/* Node Modal */}
            {showNodeModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h3 className="text-xl mb-2">{nodeForm.id ? "编辑节点" : "创建节点"}</h3>

                        {/* 名称 */}
                        <input
                            className="input mb-2 rounded-lg px-3 py-2 w-full border-none"
                            placeholder="节点名称"
                            value={nodeForm.name}
                            onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                        />

                        {/* 搜索实体 */}
                        <SearchableSelect
                            label="关联实体（可选）"
                            options={[
                                { value: null, label: "不绑定实体" },
                                ...entities.map((ent) => ({
                                    value: ent.id,
                                    label: `${ent.text}（标签 ${ent.labelId ?? "无"}）`,
                                })),
                            ]}
                            value={nodeForm.entityId}
                            onChange={(val) => {
                                const ent = entities.find((x) => x.id === val);
                                setNodeForm({
                                    ...nodeForm,
                                    entityId: val,
                                    labelId: ent ? ent.labelId : null,
                                });
                            }}
                            className="rounded-lg border-none"
                        />

                        {/* 搜索标签 */}
                        <SearchableSelect
                            label="关联实体标签（可选）"
                            options={[
                                { value: null, label: "不绑定标签" },
                                ...entityLabels.map((l) => ({ value: l.id, label: l.labelName })),
                            ]}
                            value={nodeForm.labelId}
                            onChange={(val) =>
                                setNodeForm({
                                    ...nodeForm,
                                    labelId: val,
                                    entityId: val ? null : nodeForm.entityId,
                                })
                            }
                            className="rounded-lg border-none"
                        />

                        {/* 属性 */}
                        <div className="mb-2">
                            <label className="font-bold">属性</label>
                            {nodeForm.propertiesList.map((p, idx) => (
                                <div key={idx} className="flex space-x-2 mb-1">
                                    <input
                                        className="input rounded-lg px-3 py-2 w-full border-none"
                                        placeholder="属性名"
                                        value={p.key}
                                        onChange={(e) => {
                                            const newList = [...nodeForm.propertiesList];
                                            newList[idx].key = e.target.value;
                                            setNodeForm({ ...nodeForm, propertiesList: newList });
                                        }}
                                    />
                                    <input
                                        className="input rounded-lg px-3 py-2 w-full border-none"
                                        placeholder="属性值"
                                        value={p.value}
                                        onChange={(e) => {
                                            const newList = [...nodeForm.propertiesList];
                                            newList[idx].value = e.target.value;
                                            setNodeForm({ ...nodeForm, propertiesList: newList });
                                        }}
                                    />
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => {
                                            const newList = nodeForm.propertiesList.filter((_, i) => i !== idx);
                                            setNodeForm({ ...nodeForm, propertiesList: newList });
                                        }}
                                    >
                                        删除
                                    </button>
                                </div>
                            ))}
                            <button
                                className="btn btn-ghost"
                                onClick={() =>
                                    setNodeForm({
                                        ...nodeForm,
                                        propertiesList: [...nodeForm.propertiesList, { key: "", value: "" }],
                                    })
                                }
                            >
                                新增属性
                            </button>
                        </div>

                        <div className="flex space-x-2">
                            <button className="btn btn-primary" onClick={handleCreateNode}>
                                提交
                            </button>
                            <button className="btn btn-ghost" onClick={() => setShowNodeModal(false)}>
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edge Modal */}
            {showEdgeModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h3 className="text-xl mb-2">{edgeForm.id ? "编辑边" : "创建边"}</h3>

                        <SearchableSelect
                            label="源节点"
                            options={nodes.map((n) => ({ value: n.id, label: n.name }))}
                            value={edgeForm.sourceNodeId}
                            onChange={(val) => setEdgeForm({ ...edgeForm, sourceNodeId: val })}
                            placeholder="请选择源节点"
                        />

                        <SearchableSelect
                            label="目标节点"
                            options={nodes.map((n) => ({ value: n.id, label: n.name }))}
                            value={edgeForm.targetNodeId}
                            onChange={(val) => setEdgeForm({ ...edgeForm, targetNodeId: val })}
                            placeholder="请选择目标节点"
                        />


                        {/* 边名称文本框 */}
                        <div className="mb-2">
                            <label className="font-bold mb-1 block">边名称</label>
                            <input
                                className="input rounded-lg px-3 py-2 w-full border border-gray-300"
                                placeholder="请输入边名称"
                                value={edgeForm.edgeName || ""}
                                onChange={(e) => setEdgeForm({ ...edgeForm, edgeName: e.target.value })}
                            />
                        </div>

                        {/* 关系标签下拉 */}
                        <SearchableSelect
                            label="关系标签"
                            options={[{ value: null, label: "不关联关系标签" }, ...relationLabels.map((r) => ({ value: r.id, label: r.relationName }))]}
                            value={edgeForm.relationId}
                            onChange={(val) => setEdgeForm({ ...edgeForm, relationId: val })}
                        />

                        {/* 属性列表 */}
                        <div className="mb-2">
                            <label className="font-bold">属性</label>
                            {edgeForm.propertiesList.map((p, idx) => (
                                <div key={idx} className="flex space-x-2 mb-1">
                                    <input
                                        className="input rounded-lg px-3 py-2 w-full border border-gray-300"
                                        placeholder="属性名"
                                        value={p.key}
                                        onChange={(e) => {
                                            const newList = [...edgeForm.propertiesList];
                                            newList[idx].key = e.target.value;
                                            setEdgeForm({ ...edgeForm, propertiesList: newList });
                                        }}
                                    />
                                    <input
                                        className="input rounded-lg px-3 py-2 w-full border border-gray-300"
                                        placeholder="属性值"
                                        value={p.value}
                                        onChange={(e) => {
                                            const newList = [...edgeForm.propertiesList];
                                            newList[idx].value = e.target.value;
                                            setEdgeForm({ ...edgeForm, propertiesList: newList });
                                        }}
                                    />
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => {
                                            const newList = edgeForm.propertiesList.filter((_, i) => i !== idx);
                                            setEdgeForm({ ...edgeForm, propertiesList: newList });
                                        }}
                                    >
                                        删除
                                    </button>
                                </div>
                            ))}
                            <button
                                className="btn btn-ghost"
                                onClick={() =>
                                    setEdgeForm({
                                        ...edgeForm,
                                        propertiesList: [...edgeForm.propertiesList, { key: "", value: "" }],
                                    })
                                }
                            >
                                新增属性
                            </button>
                        </div>

                        {/* 提交/取消按钮 */}
                        <div className="flex space-x-2">
                            <button className="btn btn-primary" onClick={handleSaveEdge}>
                                提交
                            </button>
                            <button className="btn btn-ghost" onClick={() => setShowEdgeModal(false)}>
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
