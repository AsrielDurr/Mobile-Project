// 关系标注结果页：选择文档查看已标注的关系，支持编辑/删除，卡片三列展示（弹窗编辑 + 实体搜索）
import React, { useEffect, useMemo, useState } from "react";
import { getDocuments } from "../api/documents.js";
import { getDocumentTokensByDocument } from "../api/documentTokens.js";
import { getEntityItemsByDocument } from "../api/entityItems.js";
import { getRelationLabels } from "../api/relationLabels.js";
import {
  getRelationsByDocument,
  updateRelation,
  deleteRelation,
} from "../api/relations.js";
import { autoAlert, autoConfirm } from "../utils/autoDialog";


function normalizeResponsePayload(res) {
  if (!res && res !== 0) return null;
  if (res.data !== undefined) return res.data;
  return res;
}


function highlight(text, keyword) {
  if (!keyword) return text;
  const reg = new RegExp(`(${keyword})`, "ig");
  return text.split(reg).map((part, i) =>
      reg.test(part) ? <mark key={i}>{part}</mark> : part,
  );
}


function SearchableEntitySelect({
                                  label,
                                  value,
                                  onChange,
                                  entities,
                                  tokens,
                                }) {
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = React.useRef(null);

  function entityText(e) {
    if (!e) return "";
    return (
        e.text ||
        tokens
            .slice(e.tokenStart, e.tokenEnd + 1)
            .map((t) => t.tokenText)
            .join("")
    );
  }

  /** ========= 去重 + 搜索 ========= */
  const filtered = useMemo(() => {
    const seen = new Set();

    return entities.filter((e) => {
      const text = entityText(e);
      if (!text) return false;

      // 去重：同样的实体文本只保留一次
      if (seen.has(text)) return false;
      seen.add(text);

      // 搜索匹配
      return text.toLowerCase().includes(keyword.toLowerCase());
    });
  }, [entities, tokens, keyword]);

  function highlight(text) {
    if (!keyword) return text;
    const reg = new RegExp(`(${keyword})`, "ig");
    return text.split(reg).map((part, i) =>
        reg.test(part) ? (
            <span key={i} className="bg-yellow-200 font-semibold">
          {part}
        </span>
        ) : (
            part
        ),
    );
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedEntity = entities.find((e) => e.id === value);

  return (
      <div className="space-y-1">
        {label && (
            <div className="text-sm font-medium text-gray-700">{label}</div>
        )}

        <div className="relative" ref={wrapperRef}>
          <div
              className="input bg-[#f9fbff] cursor-pointer"
              onClick={() => setOpen((s) => !s)}
          >
            {selectedEntity ? entityText(selectedEntity) : "未选择"}
          </div>

          {open && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg">
                <input
                    className="input border-none border-b rounded-none"
                    placeholder="搜索实体..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                />

                <div className="max-h-48 overflow-y-auto">
                  {filtered.map((e) => {
                    const text = entityText(e);
                    return (
                        <div
                            key={e.id}
                            onClick={() => {
                              onChange(e.id);
                              setOpen(false);
                              setKeyword("");
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                          {highlight(text)}
                        </div>
                    );
                  })}

                  {filtered.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-400">
                        无匹配实体
                      </div>
                  )}
                </div>
              </div>
          )}
        </div>
      </div>
  );
}

export default function Relations3() {
  const [docs, setDocs] = useState([]);
  const [documentId, setDocumentId] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [entities, setEntities] = useState([]);
  const [relationLabels, setRelationLabels] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  // ===== 关系查询条件 =====
  const [relationQuery, setRelationQuery] = useState({
    keyword: "",
    headEntityId: "",
    tailEntityId: "",
    relationLabelId: "",
  });

  const [editingRelation, setEditingRelation] = useState(null);
  const [editingForm, setEditingForm] = useState({
    headEntityId: "",
    tailEntityId: "",
    relationLabelId: "",
  });

  useEffect(() => {
    setPage(1);
  }, [
    documentId,
    relationQuery.keyword,
    relationQuery.headEntityId,
    relationQuery.tailEntityId,
    relationQuery.relationLabelId,
  ]);


  useEffect(() => {
    loadDocuments();
    loadRelationLabels();
  }, []);


  useEffect(() => {
    if (documentId) loadDocData(documentId);
  }, [documentId]);


  async function loadDocuments() {
    try {
      const arr = normalizeResponsePayload(await getDocuments()) || [];
      setDocs(arr);
      if (arr.length && !documentId) setDocumentId(arr[0].id);
    } catch (e) {
      console.error(e);
    }
  }


  async function loadRelationLabels() {
    try {
      setRelationLabels(normalizeResponsePayload(await getRelationLabels()) || []);
    } catch (e) {
      console.error(e);
    }
  }


  async function loadDocData(docId) {
    setLoading(true);
    try {
      const [tok, items, rels] = await Promise.all([
        getDocumentTokensByDocument(docId),
        getEntityItemsByDocument(docId),
        getRelationsByDocument(docId),
      ]);
      setTokens(tok || []);
      setEntities(
          (normalizeResponsePayload(items) || []).map((it) => ({
            id: it.id ?? it.ID,
            text: it.text ?? it.entityValue ?? "",
            tokenStart: Number(it.tokenStart ?? it.startIndex ?? 0),
            tokenEnd: Number(it.tokenEnd ?? it.endIndex ?? 0),
          })),
      );
      setRelations(normalizeResponsePayload(rels) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }


  const entityText = (e) => {
    if (!e) return "[未知]";
    if (e.text) return e.text;
    return tokens.slice(e.tokenStart, e.tokenEnd + 1).map((t) => t.tokenText).join("");
  };

  // ===== 关系过滤 =====
  const filteredRelations = useMemo(() => {
    return relations.filter((r) => {
      // Head / Tail / Label 过滤
      if (
          relationQuery.headEntityId &&
          Number(r.headEntityId) !== Number(relationQuery.headEntityId)
      ) {
        return false;
      }

      if (
          relationQuery.tailEntityId &&
          Number(r.tailEntityId) !== Number(relationQuery.tailEntityId)
      ) {
        return false;
      }

      if (
          relationQuery.relationLabelId &&
          Number(r.relationLabelId) !== Number(relationQuery.relationLabelId)
      ) {
        return false;
      }

      // 关键词模糊搜索（实体文本 + 关系名）
      if (relationQuery.keyword) {
        const head = entities.find((e) => e.id === r.headEntityId);
        const tail = entities.find((e) => e.id === r.tailEntityId);
        const label = relationLabels.find(
            (l) => Number(l.id) === Number(r.relationLabelId),
        );

        const text = [
          entityText(head),
          entityText(tail),
          label?.relationName,
          label?.description,
        ]
            .join(" ")
            .toLowerCase();

        return text.includes(relationQuery.keyword.toLowerCase());
      }

      return true;
    });
  }, [relations, relationQuery, entities, relationLabels, tokens]);

  const totalPages = Math.max(1, Math.ceil(filteredRelations.length / PAGE_SIZE));
  const pagedRelations = filteredRelations.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);



  async function handleDeleteRelation(id) {
    const ok = await autoConfirm("确认删除该关系？");
    if (!ok) return;
    try {
      await deleteRelation(id);
      await loadDocData(documentId);
      await autoAlert("关系已删除");
    } catch (e) {
      console.error(e);
      await autoAlert("删除失败，请稍后重试");
    }
  }


  async function saveEdit() {
    try {
      await updateRelation({
        id: editingRelation.id,
        documentId,
        relationLabelId: Number(editingForm.relationLabelId),
        headEntityId: Number(editingForm.headEntityId),
        tailEntityId: Number(editingForm.tailEntityId),
      });
      setEditingRelation(null);
      await loadDocData(documentId);
      await autoAlert("关系已更新");
    } catch (e) {
      console.error(e);
      await autoAlert("更新失败，请稍后重试");
    }
  }

  return (
      <div className="page-section space-y-4">
        {/* Header */}
        <div className="section-header">
          <div>
            <div className="eyebrow">标注结果</div>
            <div className="section-title">关系标注结果</div>
          </div>
          <button
              className="btn btn-ghost"
              onClick={() => documentId && loadDocData(documentId)}
          >
            刷新
          </button>
        </div>

        {/* 文档选择 */}
        <div className="flex items-center gap-3">
          <label className="font-semibold">选择文档</label>
          <select
              className="input max-w-xs"
              value={documentId ?? ""}
              onChange={(e) => setDocumentId(Number(e.target.value))}
          >
            <option value="">-- 请选择文档 --</option>
            {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title || `文档 ${d.id}`}
                </option>
            ))}
          </select>
        </div>

        {/* ===== 关系查询 ===== */}
        <div className="card">
          <div className="card-body space-y-3">
            <div className="font-semibold">查询关系</div>

            <div className="flex flex-wrap gap-3 items-end">
              {/* 关键词搜索 */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  关键词
                </label>
                <input
                    className="input w-full"
                    placeholder="关键词搜索（实体 / 关系名 / 描述）"
                    value={relationQuery.keyword}
                    onChange={(e) =>
                        setRelationQuery((s) => ({ ...s, keyword: e.target.value }))
                    }
                />
              </div>

              {/* Head 实体 */}
              <div className="flex-1 min-w-[150px]">
                <SearchableEntitySelect
                    label="Head 实体"
                    value={relationQuery.headEntityId}
                    onChange={(id) =>
                        setRelationQuery((s) => ({ ...s, headEntityId: id }))
                    }
                    entities={entities}
                    tokens={tokens}
                />
              </div>

              {/* Tail 实体 */}
              <div className="flex-1 min-w-[150px]">
                <SearchableEntitySelect
                    label="Tail 实体"
                    value={relationQuery.tailEntityId}
                    onChange={(id) =>
                        setRelationQuery((s) => ({ ...s, tailEntityId: id }))
                    }
                    entities={entities}
                    tokens={tokens}
                />
              </div>

              {/* 关系标签 */}
              <div className="flex-1 min-w-[150px]">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  关系标签
                </label>
                <select
                    className="input w-full"
                    value={relationQuery.relationLabelId}
                    onChange={(e) =>
                        setRelationQuery((s) => ({
                          ...s,
                          relationLabelId: e.target.value,
                        }))
                    }
                >
                  <option value="">全部</option>
                  {relationLabels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.relationName}
                      </option>
                  ))}
                </select>
              </div>

              {/* 清空条件按钮 */}
              <div className="flex-none">
                <button
                    className="btn btn-ghost"
                    onClick={() =>
                        setRelationQuery({
                          keyword: "",
                          headEntityId: "",
                          tailEntityId: "",
                          relationLabelId: "",
                        })
                    }
                >
                  清空条件
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 关系卡片区 ===== */}
        <div className="card">
          <div className="card-body space-y-3">
            <div className="flex justify-between">
              <h3 className="font-semibold text-lg">已标注关系</h3>
              <span className="text-sm text-gray-500">
            共 {filteredRelations.length} 条
          </span>
            </div>

            {loading ? (
                <div className="text-gray-400 p-4">加载中...</div>
            ) : filteredRelations.length === 0 ? (
                <div className="text-gray-400 p-4">无匹配关系</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pagedRelations.map((r) => {
                    const head = entities.find((e) => e.id === r.headEntityId);
                    const tail = entities.find((e) => e.id === r.tailEntityId);
                    const label = relationLabels.find(
                        (l) => Number(l.id) === Number(r.relationLabelId),
                    );

                    return (
                        <div
                            key={r.id}
                            className="bg-white border rounded-lg shadow hover:shadow-md p-4 transition-shadow"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="text-xs text-gray-500">
                                ID: {r.id}
                              </div>
                              <div className="mt-1 font-semibold text-lg">
                                {highlight(
                                    label?.relationName || "(未命名)",
                                    relationQuery.keyword,
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {highlight(
                                    label?.description || "",
                                    relationQuery.keyword,
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <button
                                  className="btn btn-ghost text-sm"
                                  onClick={() => {
                                    setEditingRelation(r);
                                    setEditingForm({
                                      headEntityId: r.headEntityId,
                                      tailEntityId: r.tailEntityId,
                                      relationLabelId: r.relationLabelId,
                                    });
                                  }}
                              >
                                编辑
                              </button>
                              <button
                                  className="btn btn-danger text-sm"
                                  onClick={() => handleDeleteRelation(r.id)}
                              >
                                删除
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="p-2 border rounded-lg bg-yellow-50">
                              <div className="text-xs text-gray-500">Head</div>
                              <div className="font-medium">
                                {highlight(
                                    entityText(head),
                                    relationQuery.keyword,
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                ID: {r.headEntityId}
                              </div>
                            </div>

                            <div className="p-2 border rounded-lg bg-yellow-50">
                              <div className="text-xs text-gray-500">Tail</div>
                              <div className="font-medium">
                                {highlight(
                                    entityText(tail),
                                    relationQuery.keyword,
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                ID: {r.tailEntityId}
                              </div>
                            </div>
                          </div>
                        </div>
                    );
                  })}
                </div>
            )}

            {!loading && filteredRelations.length > 0 && (
              <div className="flex items-center justify-end gap-3 pt-3">
                <span className="text-sm text-gray-600">
                  第 {page} / {totalPages} 页
                </span>
                <div className="space-x-2">
                  <button
                    className="btn btn-ghost"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    上一页
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== 编辑弹窗 ===== */}
        {editingRelation && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl space-y-4">
                <h3 className="font-semibold text-lg">
                  编辑关系 #{editingRelation.id}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SearchableEntitySelect
                      label="Head 实体"
                      value={editingForm.headEntityId}
                      onChange={(id) =>
                          setEditingForm((s) => ({ ...s, headEntityId: id }))
                      }
                      entities={entities}
                      tokens={tokens}
                  />

                  <SearchableEntitySelect
                      label="Tail 实体"
                      value={editingForm.tailEntityId}
                      onChange={(id) =>
                          setEditingForm((s) => ({ ...s, tailEntityId: id }))
                      }
                      entities={entities}
                      tokens={tokens}
                  />
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    关系标签
                  </div>
                  <select
                      className="input w-full"
                      value={editingForm.relationLabelId}
                      onChange={(e) =>
                          setEditingForm((s) => ({
                            ...s,
                            relationLabelId: e.target.value,
                          }))
                      }
                  >
                    <option value="">选择关系标签</option>
                    {relationLabels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.relationName}
                        </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button className="btn btn-success" onClick={saveEdit}>
                    保存
                  </button>
                  <button
                      className="btn btn-ghost"
                      onClick={() => setEditingRelation(null)}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );

}
