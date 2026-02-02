import { useEffect, useState } from "react";
import { getDocuments } from "../api/documents.js";
import {
  getEntityItemsByDocument,
  createEntityItem,
  updateEntityItem,
  deleteEntityItem,
} from "../api/entityItems.js";
import {
  getEntityLabels,
  createEntityLabel,
  updateEntityLabel,
  deleteEntityLabel,
} from "../api/entityLabels.js";
import { getDocumentTokensByDocument } from "../api/documentTokens.js";
import { autoAlert, autoConfirm } from "../utils/autoDialog";

function normalizeResponsePayload(res) {
  if (!res && res !== 0) return null;
  if (res.data !== undefined) return res.data;
  return res;
}

// ===== 统一颜色池 =====
const labelColors = [
  "bg-red-100 text-red-700",
  "bg-pink-100 text-pink-700",
  "bg-purple-100 text-purple-700",
  "bg-violet-100 text-violet-700",
  "bg-indigo-100 text-indigo-700",
  "bg-blue-100 text-blue-700",
  "bg-lightBlue-100 text-lightBlue-700",
  "bg-cyan-100 text-cyan-700",
  "bg-teal-100 text-teal-700",
  "bg-emerald-100 text-emerald-700",
  "bg-green-100 text-green-700",
  "bg-lime-100 text-lime-700",
  "bg-yellow-100 text-yellow-700",
  "bg-amber-100 text-amber-700",
  "bg-orange-100 text-orange-700",
  "bg-red-200 text-red-900",
  "bg-pink-200 text-pink-900",
  "bg-purple-200 text-purple-900",
  "bg-violet-200 text-violet-900",
  "bg-indigo-200 text-indigo-900",
  "bg-blue-200 text-blue-900",
  "bg-lightBlue-200 text-lightBlue-900",
  "bg-cyan-200 text-cyan-900",
  "bg-teal-200 text-teal-900",
  "bg-emerald-200 text-emerald-900",
  "bg-green-200 text-green-900",
  "bg-lime-200 text-lime-900",
  "bg-yellow-200 text-yellow-900",
  "bg-amber-200 text-amber-900",
  "bg-orange-200 text-orange-900",
];

// ===== 获取标签颜色 =====
function getLabelColor(labelId, labels) {
  const index = labels.findIndex((l) => l.id === labelId);
  if (index === -1) return "bg-gray-100 text-gray-700";
  return labelColors[index % labelColors.length];
}

// ===== 通用 Modal 组件 =====
function Modal({ visible, title, onClose, children }) {
  if (!visible) return null;
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          {children}
        </div>
      </div>
  );
}

export default function EntityManagement() {
  const [docs, setDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [docTokens, setDocTokens] = useState([]);
  const [textOffsets, setTextOffsets] = useState([]);
  const [entities, setEntities] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityForm, setEntityForm] = useState({
    id: null,
    labelId: "",
    text: "",
    tokenStart: "",
    tokenEnd: "",
  });
  const [entityModalVisible, setEntityModalVisible] = useState(false);

  const [labelForm, setLabelForm] = useState({
    id: null,
    labelName: "",
    description: "",
  });
  const [labelModalVisible, setLabelModalVisible] = useState(false);

  useEffect(() => {
    fetchDocs();
    fetchLabels();
  }, []);

  useEffect(() => {
    if (selectedDocId != null) {
      fetchEntitiesAndMerge(selectedDocId);
      fetchTokens(selectedDocId);
    } else {
      setEntities([]);
      setDocTokens([]);
    }
  }, [selectedDocId]);

  // ===== 数据获取 =====
  async function fetchDocs() {
    try {
      const res = await getDocuments();
      const payload = normalizeResponsePayload(res) || [];
      const docsArray = Array.isArray(payload) ? payload : payload?.data ?? [];
      setDocs(docsArray);
      if (docsArray.length > 0 && selectedDocId == null) {
        setSelectedDocId(docsArray[0].id);
      }
    } catch (err) {
      console.error("fetchDocs error:", err);
    }
  }

  async function fetchLabels() {
    try {
      const res = await getEntityLabels();
      const payload = normalizeResponsePayload(res) || [];
      const labelsArray = Array.isArray(payload) ? payload : payload?.data ?? [];
      setLabels(labelsArray);
    } catch (err) {
      console.error("fetchLabels error:", err);
    }
  }

  async function fetchTokens(docId) {
    try {
      const tokens = await getDocumentTokensByDocument(docId);
      setDocTokens(tokens || []);

      const offsets = [];
      let charIndex = 0;
      (tokens || []).forEach((token) => {
        offsets.push({ start: charIndex, end: charIndex + token.tokenText.length - 1 });
        charIndex += token.tokenText.length;
      });
      setTextOffsets(offsets);
    } catch (err) {
      console.error("fetchTokens error:", err);
    }
  }

  async function fetchEntitiesAndMerge(docId) {
    try {
      setLoading(true);
      const [itemsRes, labelsRes] = await Promise.all([
        getEntityItemsByDocument(docId),
        getEntityLabels(),
      ]);
      const itemsPayload = normalizeResponsePayload(itemsRes) || [];
      const labelsPayload = normalizeResponsePayload(labelsRes) || [];
      const itemsArray = Array.isArray(itemsPayload) ? itemsPayload : itemsPayload?.data ?? [];
      const labelsArray = Array.isArray(labelsPayload) ? labelsPayload : labelsPayload?.data ?? [];

      const labelMap = {};
      labelsArray.forEach((l) => {
        labelMap[Number(l.id)] = l;
      });

      const merged = itemsArray.map((it) => {
        const lid = Number(it.labelId ?? it.label_id ?? it.label);
        const labelObj = labelMap[lid] || {};
        return {
          ...it,
          id: it.id ?? it.ID ?? it.entityId,
          documentId: it.documentId ?? it.document_id ?? it.docId,
          labelId: lid,
          text: it.text ?? it.entityValue ?? it.name,
          tokenStart: Number(it.tokenStart ?? it.token_start ?? it.startIndex ?? 0),
          tokenEnd: Number(it.tokenEnd ?? it.token_end ?? it.endIndex ?? 0),
          labelName: labelObj.labelName ?? labelObj.name ?? "",
          description: labelObj.description ?? "",
        };
      });

      setEntities(merged);
      setLabels(labelsArray);
    } catch (err) {
      console.error("fetchEntitiesAndMerge error:", err);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  }

  // ===== 表单操作 =====
  function onDocChange(e) {
    const id = Number(e.target.value);
    setSelectedDocId(id);
  }

  function openNewEntity() {
    setSelectedEntity(null);
    setEntityForm({ id: null, labelId: "", text: "", tokenStart: "", tokenEnd: "" });
    setEntityModalVisible(true);
  }

  function openEditEntity(it) {
    setSelectedEntity(it);
    setEntityForm({
      id: it.id,
      labelId: it.labelId ?? "",
      text: it.text ?? "",
      tokenStart: it.tokenStart ?? "",
      tokenEnd: it.tokenEnd ?? "",
    });
    setEntityModalVisible(true);
  }

  function onEntityFormChange(field, value) {
    setEntityForm((s) => ({ ...s, [field]: value }));
  }

  function openNewLabel() {
    setLabelForm({ id: null, labelName: "", description: "" });
    setLabelModalVisible(true);
  }

  function openEditLabel(label) {
    setLabelForm({
      id: label.id,
      labelName: label.labelName,
      description: label.description,
    });
    setLabelModalVisible(true);
  }

  function onLabelFormChange(field, value) {
    setLabelForm((s) => ({ ...s, [field]: value }));
  }

  // ===== 保存实体 =====
  async function saveEntity() {
    try {
      if (!selectedDocId) return autoAlert("请先选择文档");
      if (!entityForm.text || entityForm.text.trim() === "") return autoAlert("实体文本不能为空");
      if (!entityForm.labelId) return autoAlert("请选择标签");

      const isEdit = !!entityForm.id;

      if (isEdit) {
        const nextTokenStart = Number(entityForm.tokenStart);
        const nextTokenEnd = Number(entityForm.tokenEnd);
        const hasSameRange = entities.some(
          (e) =>
            String(e.id) !== String(entityForm.id) &&
            Number(e.tokenStart) === nextTokenStart &&
            Number(e.tokenEnd) === nextTokenEnd
        );
        if (hasSameRange) {
          await autoAlert("该区间已存在实体标注，请勿重复标注");
          return;
        }

        await updateEntityItem(entityForm.id, {
          documentId: Number(selectedDocId),
          labelId: Number(entityForm.labelId),
          text: String(entityForm.text),
          tokenStart: Number(entityForm.tokenStart),
          tokenEnd: Number(entityForm.tokenEnd),
        });
        await fetchEntitiesAndMerge(selectedDocId);
        await autoAlert("保存成功");
        return;
      }

      // 新增实体，自动匹配全文
      const targetText = entityForm.text.trim();
      const fullText = docTokens.map((t) => t.tokenText).join("");
      const regex = new RegExp(targetText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      let match;
      const allMatches = [];

      while ((match = regex.exec(fullText)) !== null) {
        allMatches.push({ charStart: match.index, charEnd: match.index + targetText.length - 1 });
      }

      if (allMatches.length === 0) {
        await autoAlert("在全文中找不到相同实体文本：" + targetText);
        return;
      }

      const matchTokenRanges = allMatches
          .map((m) => {
            const tokenStart = textOffsets.findIndex((t) => m.charStart >= t.start && m.charStart <= t.end);
            const tokenEnd = textOffsets.findIndex((t) => m.charEnd >= t.start && m.charEnd <= t.end);
            if (tokenStart !== -1 && tokenEnd !== -1) return { tokenStart, tokenEnd };
            return null;
          })
          .filter(Boolean);

      const existingRangeKeys = new Set(
        (entities || []).map((e) => `${Number(e.tokenStart)}-${Number(e.tokenEnd)}`)
      );
      const toCreate = [];
      const seen = new Set();
      for (const range of matchTokenRanges) {
        const key = `${Number(range.tokenStart)}-${Number(range.tokenEnd)}`;
        if (existingRangeKeys.has(key) || seen.has(key)) continue;
        seen.add(key);
        toCreate.push(range);
      }

      if (toCreate.length === 0) {
        await autoAlert("匹配到的实体区间已全部存在，未新增");
        return;
      }

      for (const range of toCreate) {
        await createEntityItem({
          documentId: Number(selectedDocId),
          labelId: Number(entityForm.labelId),
          text: targetText,
          tokenStart: range.tokenStart,
          tokenEnd: range.tokenEnd,
        });
      }

      await fetchEntitiesAndMerge(selectedDocId);
      await autoAlert(`自动新增成功，新增 ${toCreate.length} 个（共匹配 ${matchTokenRanges.length} 个）`);

      setSelectedEntity(null);
      setEntityForm({ id: null, labelId: "", text: "", tokenStart: "", tokenEnd: "" });
    } catch (err) {
      console.error("saveEntity error:", err);
      await autoAlert("保存实体失败: " + err.message);
    }
  }

  async function removeEntity(id) {
    const ok = await autoConfirm("确认删除该实体？");
    if (!ok) return;
    try {
      await deleteEntityItem(id);
      await fetchEntitiesAndMerge(selectedDocId);
      await autoAlert("删除成功");
    } catch (err) {
      console.error("removeEntity error:", err);
      await autoAlert("删除失败: " + err.message);
    }
  }

  // ===== 保存标签 =====
  async function saveLabel() {
    try {
      if (!labelForm.labelName || labelForm.labelName.trim() === "") {
        return autoAlert("标签名称不能为空");
      }

      if (labelForm.id) {
        await updateEntityLabel(Number(labelForm.id), {
          labelName: labelForm.labelName,
          description: labelForm.description,
        });
      } else {
        const created = await createEntityLabel({
          labelName: labelForm.labelName,
          description: labelForm.description,
        });
        const createdPayload = normalizeResponsePayload(created) || {};
        const newLabelObj = Array.isArray(createdPayload) ? createdPayload[0] : createdPayload;
        setLabelForm((s) => ({ ...s, id: newLabelObj?.id ?? s.id }));
      }

      await fetchLabels();
      await fetchEntitiesAndMerge(selectedDocId);
      await autoAlert("标签保存成功");
    } catch (err) {
      console.error("saveLabel error:", err);
      await autoAlert("保存标签失败: " + err.message);
    }
  }

  async function removeLabel(id) {
    const ok = await autoConfirm("确认删除该标签？删除后相关实体的标签可能失效");
    if (!ok) return;
    try {
      await deleteEntityLabel(id);
      await fetchLabels();
      await fetchEntitiesAndMerge(selectedDocId);
      await autoAlert("标签删除成功");
    } catch (err) {
      console.error("removeLabel error:", err);
      await autoAlert("删除标签失败: " + err.message);
    }
  }

  // ===== 文本选中事件 =====
  function handleMouseUp() {
    const containerEl = document.getElementById("doc-content");
    if (!containerEl) return;
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (!text) return;

    const range = selection.getRangeAt(0);
    const preSelection = range.cloneRange();
    preSelection.selectNodeContents(containerEl);
    preSelection.setEnd(range.startContainer, range.startOffset);
    const start = preSelection.toString().length;
    const end = start + range.toString().length - 1;

    const tokenStart = textOffsets.findIndex((t) => start >= t.start && start <= t.end);
    const tokenEnd = textOffsets.findIndex((t) => end >= t.start && end <= t.end);

    if (tokenStart === -1 || tokenEnd === -1) return;

    setSelectedEntity(null);
    setEntityForm({
      id: null,
      labelId: "",
      text,
      tokenStart,
      tokenEnd,
    });
    setEntityModalVisible(true);
  }

  function isTokenEntity(tokenIndex) {
    return entities.find((it) => tokenIndex >= it.tokenStart && tokenIndex <= it.tokenEnd);
  }

  // ===== 渲染文档内容 token =====
  function renderTokens() {
    if (loading) return <div className="muted text-sm">加载中...</div>;
    return docTokens.map((t, idx) => {
      const entity = isTokenEntity(idx);
      const colorClass = entity ? getLabelColor(entity.labelId, labels) : "";
      return (
          <span
              key={idx}
              className={`px-0.5 py-0.5 rounded font-semibold ${colorClass}`}
              title={entity ? entity.labelName : ""}
          >
        {t.tokenText}
      </span>
      );
    });
  }

  const sortedEntities = [...entities].sort((a, b) => {
    // 1. 先按标签 id 排序
    if (a.labelId !== b.labelId) {
      return a.labelId - b.labelId;
    }
    // 2. 同一标签内，按 tokenStart 排序
    return a.tokenStart - b.tokenStart;
  });

  return (
      <div className="page-section space-y-4">
        {/* 页面头部 */}
        <div className="section-header">
          <div>
            <div className="eyebrow">实体与标签</div>
            <div className="section-title">实体管理</div>
          </div>
        </div>

        {/* 文档选择 */}
        <div className="card">
          <div className="card-body space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">选择文档</label>
              <select
                  value={selectedDocId ?? ""}
                  onChange={onDocChange}
                  className="input flex-1"
              >
                <option value="">-- 请选择 --</option>
                {docs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title || `文档 ${d.id}`}
                    </option>
                ))}
              </select>
            </div>

            {/* 文档内容显示 */}
            <div
                id="doc-content"
                className="border border-[var(--border)] rounded-2xl p-4 max-h-[320px] overflow-auto cursor-text bg-[#f9fbff]"
                onMouseUp={handleMouseUp}
            >
              {renderTokens()}
            </div>
            <div className="muted text-sm">
              提示：在上方选中文本，会自动填充下方实体表单的范围和文本。
            </div>
          </div>
        </div>

        {/* 实体列表 */}
        <div className="card">
          <div className="card-body space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">当前文档实体</h3>
              <button className="btn btn-primary" onClick={openNewEntity}>
                新增实体
              </button>
            </div>
            <div className="overflow-auto border border-[var(--border)] rounded-xl">
              <table className="table">
                <thead>
                <tr>
                  <th>序号</th>
                  <th>文本</th>
                  <th>标签</th>
                  <th>区间</th>
                  <th>操作</th>
                </tr>
                </thead>
                <tbody>
                {sortedEntities.map((it, index) => (
                    <tr key={it.id}>
                      <td>{index + 1}</td>
                      <td>{it.text}</td>
                      <td>
                    <span
                        className={`px-2 py-1 text-xs rounded-full font-semibold ${getLabelColor(
                            it.labelId,
                            labels
                        )}`}
                    >
                      {it.labelName}
                    </span>
                      </td>
                      <td>
                        {it.tokenStart} - {it.tokenEnd}
                      </td>
                      <td className="space-x-2">
                        <button
                            className="btn btn-ghost"
                            onClick={() => openEditEntity(it)}
                        >
                          编辑
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={() => removeEntity(it.id)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                ))}
                {entities.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-gray-500">
                        暂无实体
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 标签列表 */}
        <div className="card">
          <div className="card-body space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">已有标签</h3>
              <button className="btn btn-success" onClick={openNewLabel}>
                新增标签
              </button>
            </div>
            <div className="overflow-auto max-h-[480px] border border-[var(--border)] rounded-xl">
              <table className="table">
                <thead>
                <tr>
                  <th>序号</th>
                  <th>名称</th>
                  <th>描述</th>
                  <th>操作</th>
                </tr>
                </thead>
                <tbody>
                {labels.map((l, index) => (
                    <tr key={l.id}>
                      <td>{index + 1}</td>
                      <td>
                    <span
                        className={`px-2 py-1 text-xs rounded-full font-semibold ${getLabelColor(
                            l.id,
                            labels
                        )}`}
                    >
                      {l.labelName}
                    </span>
                      </td>
                      <td>{l.description}</td>
                      <td className="space-x-2">
                        <button
                            className="btn btn-ghost"
                            onClick={() => openEditLabel(l)}
                        >
                          编辑
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={() => removeLabel(l.id)}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                ))}
                {labels.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-gray-500">
                        暂无标签
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 实体 Modal - 两栏布局 */}
        <Modal visible={entityModalVisible} title={selectedEntity ? "编辑实体" : "新增实体"} onClose={() => setEntityModalVisible(false)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">标签</label>
              <select
                  className="input w-full"
                  value={entityForm.labelId}
                  onChange={(e) => onEntityFormChange("labelId", e.target.value)}
              >
                <option value="">请选择标签</option>
                {labels.map((l) => (
                    <option key={l.id} value={l.id}>{l.labelName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">实体文本</label>
              <input
                  className="input w-full"
                  value={entityForm.text}
                  onChange={(e) => onEntityFormChange("text", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">tokenStart</label>
              <input
                  type="number"
                  className="input w-full"
                  value={entityForm.tokenStart}
                  onChange={(e) => onEntityFormChange("tokenStart", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">tokenEnd</label>
              <input
                  type="number"
                  className="input w-full"
                  value={entityForm.tokenEnd}
                  onChange={(e) => onEntityFormChange("tokenEnd", e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 flex-wrap">
            <button className="btn btn-ghost" onClick={() => setEntityModalVisible(false)}>取消</button>
            <button
                className="btn btn-primary"
                onClick={async () => {
                  await saveEntity();
                  setEntityModalVisible(false);
                }}
            >
              保存实体
            </button>
          </div>
        </Modal>

        {/* 标签 Modal - 两栏布局 */}
        <Modal visible={labelModalVisible} title={labelForm.id ? "编辑标签" : "新增标签"} onClose={() => setLabelModalVisible(false)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">标签名称</label>
              <input
                  className="input w-full"
                  value={labelForm.labelName}
                  onChange={(e) => onLabelFormChange("labelName", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">描述</label>
              <textarea
                  className="input w-full"
                  rows="3"
                  value={labelForm.description}
                  onChange={(e) => onLabelFormChange("description", e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 flex-wrap">
            <button className="btn btn-ghost" onClick={() => setLabelModalVisible(false)}>取消</button>
            <button
                className="btn btn-success"
                onClick={async () => {
                  await saveLabel();
                  setLabelModalVisible(false);
                }}
            >
              保存标签
            </button>
          </div>
        </Modal>
      </div>
  );
}
