// 关系标注页：选择已标注文档中的两个实体 + 已存在的关系标签，创建关系
import React, { useEffect, useState } from "react";
import { getDocuments } from "../api/documents.js";
import { getDocumentTokensByDocument } from "../api/documentTokens.js";
import { getEntityItemsByDocument } from "../api/entityItems.js";
import { getEntityLabels } from "../api/entityLabels.js";
import { getRelationLabels } from "../api/relationLabels.js";
import { createRelation } from "../api/relations.js";
import { autoAlert } from "../utils/autoDialog";

/* ========= 通用 ========= */
function normalizeResponsePayload(res) {
  if (!res && res !== 0) return null;
  if (res.data !== undefined) return res.data;
  return res;
}

/* ========= 颜色体系（与实体管理页一致） ========= */
const labelColors = [
  "bg-red-100 text-red-700",
  "bg-pink-100 text-pink-700",
  "bg-purple-100 text-purple-700",
  "bg-violet-100 text-violet-700",
  "bg-indigo-100 text-indigo-700",
  "bg-blue-100 text-blue-700",
  "bg-cyan-100 text-cyan-700",
  "bg-teal-100 text-teal-700",
  "bg-emerald-100 text-emerald-700",
  "bg-green-100 text-green-700",
  "bg-lime-100 text-lime-700",
  "bg-yellow-100 text-yellow-700",
  "bg-amber-100 text-amber-700",
  "bg-orange-100 text-orange-700",
];

function getLabelColor(labelId, labels) {
  const index = labels.findIndex((l) => Number(l.id) === Number(labelId));
  if (index === -1) return "bg-gray-100 text-gray-700";
  return labelColors[index % labelColors.length];
}

export default function Relations() {
  const [docs, setDocs] = useState([]);
  const [documentId, setDocumentId] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [entities, setEntities] = useState([]);
  const [entityLabels, setEntityLabels] = useState([]);
  const [relationLabels, setRelationLabels] = useState([]);
  const [loading, setLoading] = useState(false);

  const [headEntityId, setHeadEntityId] = useState(null);
  const [tailEntityId, setTailEntityId] = useState(null);
  const [selectedRelationLabelId, setSelectedRelationLabelId] = useState("");

  useEffect(() => {
    loadDocuments();
    loadRelationLabels();
    loadEntityLabels();
  }, []);

  useEffect(() => {
    if (documentId) {
      loadDocData(documentId);
    } else {
      setTokens([]);
      setEntities([]);
    }
  }, [documentId]);

  async function loadDocuments() {
    const res = await getDocuments();
    const arr = normalizeResponsePayload(res) || [];
    setDocs(arr);
    if (arr.length > 0 && !documentId) {
      setDocumentId(arr[0].id);
    }
  }

  async function loadRelationLabels() {
    const res = await getRelationLabels();
    setRelationLabels(normalizeResponsePayload(res) || []);
  }

  async function loadEntityLabels() {
    const res = await getEntityLabels();
    setEntityLabels(normalizeResponsePayload(res) || []);
  }

  async function loadDocData(docId) {
    setLoading(true);
    try {
      const [tok, items] = await Promise.all([
        getDocumentTokensByDocument(docId),
        getEntityItemsByDocument(docId),
      ]);

      setTokens(tok || []);

      const normalized = (normalizeResponsePayload(items) || []).map((it) => ({
        id: it.id ?? it.ID,
        labelId: Number(it.labelId ?? it.label_id ?? it.label),
        text: it.text ?? it.entityValue ?? "",
        tokenStart: Number(it.tokenStart ?? it.token_start ?? 0),
        tokenEnd: Number(it.tokenEnd ?? it.token_end ?? 0),
      }));

      setEntities(normalized);
    } finally {
      setLoading(false);
    }
  }

  const findEntityById = (id) => entities.find((e) => e.id === id);

  const entityText = (e) =>
      e?.text ||
      tokens
          .slice(e.tokenStart, e.tokenEnd + 1)
          .map((t) => t.tokenText)
          .join("");

  function resetSelection() {
    setHeadEntityId(null);
    setTailEntityId(null);
    setSelectedRelationLabelId("");
  }

  function onEntityClick(id) {
    if (!headEntityId) return setHeadEntityId(id);
    if (!tailEntityId && id !== headEntityId) return setTailEntityId(id);
    setHeadEntityId(id);
    setTailEntityId(null);
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

    const filtered = entities.filter((e) => {
      const text =
          e.text ||
          tokens
              .slice(e.tokenStart, e.tokenEnd + 1)
              .map((t) => t.tokenText)
              .join("");
      return text.toLowerCase().includes(keyword.toLowerCase());
    });

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
          )
      );
    }
    useEffect(() => {
      function handleClickOutside(e) {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
          setOpen(false);
        }
      }

      if (open) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [open]);

    return (
        <div className="relative" ref={wrapperRef}>
          <div
              className="input bg-[#f9fbff] cursor-pointer"
              onClick={() => setOpen((s) => !s)}
          >
            {value
                ? entities.find((e) => e.id === value)?.text
                : "未选择"}
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
                    const text =
                        e.text ||
                        tokens
                            .slice(e.tokenStart, e.tokenEnd + 1)
                            .map((t) => t.tokenText)
                            .join("");
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
    );
  }


  async function handleCreateRelation() {
    if (!documentId) return autoAlert("请先选择文档");
    if (!headEntityId || !tailEntityId)
      return autoAlert("请选择 Head / Tail 实体");
    if (!selectedRelationLabelId)
      return autoAlert("请选择关系标签");

    await createRelation({
      documentId,
      relationLabelId: Number(selectedRelationLabelId),
      headEntityId,
      tailEntityId,
    });

    await autoAlert("关系创建成功");
    resetSelection();
  }

  return (
      <div className="page-section space-y-4">
        {/* Header */}
        <div className="section-header">
          <div>
            <div className="section-title">关系标注</div>
          </div>
        </div>

        {/* 文档选择 */}
        <div className="flex flex-wrap items-center gap-3">
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 左侧：文档内容 */}
          <div className="lg:col-span-8 card">
            <div className="card-body space-y-3 h-[800px] lg:h-[940px] flex flex-col">
              <h3 className="font-semibold text-lg">
                文档内容（点击实体选择 Head / Tail）
              </h3>

              {loading ? (
                  <div className="muted text-sm">加载中...</div>
              ) : !documentId ? (
                  <div className="text-gray-400">未选择文档</div>
              ) : (
                  <div
                      id="doc-content"
                      className="flex-1 whitespace-pre-wrap break-words border border-[var(--border)] rounded-2xl p-4 overflow-y-auto bg-[#f9fbff]"
                  >
                    {tokens.map((t, idx) => {
                      const ent = entities.find(
                          (e) => idx >= e.tokenStart && idx <= e.tokenEnd
                      );
                      const isHead = ent && headEntityId === ent.id;
                      const isTail = ent && tailEntityId === ent.id;
                      const color = ent
                          ? getLabelColor(ent.labelId, entityLabels)
                          : "";

                      return (
                          <span
                              key={idx}
                              onClick={() => ent && onEntityClick(ent.id)}
                              title={ent ? `${entityText(ent)} (ID:${ent.id})` : undefined}
                              className={`
                                px-[1px] py-[1px]
                                inline rounded cursor-pointer select-none
                                ${color}
                                ${isHead ? "ring-2 ring-blue-400" : ""}
                                ${isTail ? "ring-2 ring-green-400" : ""}
                            `}
                                                    >
                            {t.tokenText}
                          </span>

                      );
                    })}
                  </div>
              )}

              <div className="text-sm text-gray-600">
                Head：
                <span className="font-medium ml-1">
              {headEntityId
                  ? entityText(findEntityById(headEntityId))
                  : "无"}
            </span>
                {" | "}
                Tail：
                <span className="font-medium ml-1">
              {tailEntityId
                  ? entityText(findEntityById(tailEntityId))
                  : "无"}
            </span>
              </div>
            </div>
          </div>

          {/* 右侧：关系创建 */}
          <div className="lg:col-span-4 card">
            <div className="card-body space-y-4 h-[800px] lg:h-[940px] overflow-y-auto">
              <h3 className="font-semibold text-lg">创建关系</h3>

              <div>
                <div className="text-sm text-gray-500 mb-1">关系标签</div>
                <select
                    className="input w-full"
                    value={selectedRelationLabelId}
                    onChange={(e) => setSelectedRelationLabelId(e.target.value)}
                >
                  <option value="">选择关系标签</option>
                  {relationLabels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.relationName}
                      </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Head</div>
                  <SearchableEntitySelect
                      value={headEntityId}
                      onChange={(id) => {
                        setHeadEntityId(id);
                        if (id === tailEntityId) setTailEntityId(null);
                      }}
                      entities={entities}
                      tokens={tokens}
                  />
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Tail</div>
                  <SearchableEntitySelect
                      value={tailEntityId}
                      onChange={(id) => {
                        setTailEntityId(id);
                        if (id === headEntityId) setHeadEntityId(null);
                      }}
                      entities={entities}
                      tokens={tokens}
                  />
                </div>

              </div>

              <div className="rounded-lg border border-dashed border-[var(--border)] bg-[#f8fafc] p-3 text-sm text-gray-700 space-y-1">
                <div>Step 1：在左侧点击实体，依次选择 Head / Tail</div>
                <div>Step 2：选择关系标签</div>
                <div>Step 3：点击下方按钮完成标注</div>
              </div>

              <div className="flex gap-2">
                <button
                    className="btn btn-primary flex-1"
                    onClick={handleCreateRelation}
                >
                  创建关系
                </button>
                <button className="btn btn-ghost" onClick={resetSelection}>
                  重选
                </button>
              </div>

              <div className="text-xs text-gray-500">
                说明：关系标注依赖已完成的实体标注，未着色文本无法参与关系创建。
              </div>
            </div>
          </div>
        </div>
      </div>
  );

}
