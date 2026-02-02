import { useEffect, useMemo, useState } from "react";
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from "../api/documents.js";
import { getDocumentTokensByDocument } from "../api/documentTokens.js";
import { getEntityItemsByDocument, createEntityItem } from "../api/entityItems.js";
import { createEntityLabel, getEntityLabels } from "../api/entityLabels.js";
import { getRelationsByDocument } from "../api/relations.js";
import { autoAlert, autoConfirm } from "../utils/autoDialog";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammothBrowser from "mammoth/mammoth.browser.js";
import { autoExtractEntities } from "../api/ai.js";

// 30 种颜色配置（Tailwind class）
const LABEL_COLORS = [
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

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [docTable, setDocTable] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [docTokens, setDocTokens] = useState([]);
  const [entities, setEntities] = useState([]);
  const [labels, setLabels] = useState([]);
  const [textOffsets, setTextOffsets] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // 弹窗
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ id: null, title: "", content: "" });
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [newEntity, setNewEntity] = useState({
    text: "",
    labelName: "",
    description: "",
    tokenStart: 0,
    tokenEnd: 0,
  });
  const [isEditingContent, setIsEditingContent] = useState(false);

  const [searchText, setSearchText] = useState(""); // 输入框值
  const [searchQuery, setSearchQuery] = useState(""); // 回车触发的搜索

  // 在组件顶部增加一个 loading 状态
  const [isAiProcessing, setIsAiProcessing] = useState(false);

// 添加处理方法
  async function handleAIAutoExtract() {
    if (!selectedDocId) return;

    const ok = await autoConfirm("AI 将自动分析文档并标注实体。这可能需要几秒钟时间，确定开始吗？");
    if (!ok) return;

    setIsAiProcessing(true); // 开始加载
    try {
      await autoExtractEntities(selectedDocId);

      // 关键：AI 执行完后，必须刷新当前页面的数据
      await fetchTokensAndEntities(selectedDocId); // 刷新右侧高亮
      await fetchDocs(); // 刷新左侧列表计数

      autoAlert("AI 自动标注完成！");
    } catch (err) {
      console.error("AI Error:", err);
      autoAlert("AI 提取失败：" + err.message);
    } finally {
      setIsAiProcessing(false); // 结束加载
    }
  }

  function getLabelColorIndex(labelId) {
    const index = labels.findIndex((l) => l.id === labelId);
    if (index >= 0) return index % LABEL_COLORS.length;
    const fallback = Math.abs(Number(labelId) || 0);
    return fallback % LABEL_COLORS.length;
  }

  const sortedEntities = useMemo(() => {
    return [...entities].sort((a, b) => {
      const aStart = Number(a.tokenStart ?? 0);
      const bStart = Number(b.tokenStart ?? 0);
      if (aStart !== bStart) return aStart - bStart;
      const aEnd = Number(a.tokenEnd ?? 0);
      const bEnd = Number(b.tokenEnd ?? 0);
      if (aEnd !== bEnd) return aEnd - bEnd;
      return String(a.id ?? "").localeCompare(String(b.id ?? ""));
    });
  }, [entities]);

  const entityColorIndexByKey = useMemo(() => {
    const map = new Map();
    const usedLength = LABEL_COLORS.length;
    let prevColorIndex = null;

    for (const entity of sortedEntities) {
      const key =
        entity?.id != null
          ? String(entity.id)
          : `${entity?.labelId ?? ""}-${entity?.tokenStart ?? ""}-${entity?.tokenEnd ?? ""}`;

      let colorIndex = getLabelColorIndex(entity?.labelId);
      if (prevColorIndex != null && usedLength > 1 && colorIndex === prevColorIndex) {
        colorIndex = (colorIndex + 1) % usedLength;
      }

      map.set(key, colorIndex);
      prevColorIndex = colorIndex;
    }

    return map;
  }, [sortedEntities, labels]);

  function getEntityColorClass(entity) {
    if (!entity) return "";
    const key =
      entity?.id != null
        ? String(entity.id)
        : `${entity?.labelId ?? ""}-${entity?.tokenStart ?? ""}-${entity?.tokenEnd ?? ""}`;
    const idx = entityColorIndexByKey.get(key);
    return LABEL_COLORS[(idx ?? getLabelColorIndex(entity.labelId)) % LABEL_COLORS.length];
  }

  // 搜索过滤后的文档列表
  const filteredDocs = docTable.filter(doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
  const pageData = filteredDocs.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    fetchDocs();
    fetchLabels();
  }, []);

  useEffect(() => {
    if (!selectedDocId) return;
    fetchTokensAndEntities(selectedDocId);
  }, [selectedDocId]);

  // 页码修正
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const selectedDoc = docTable.find((d) => d.id === selectedDocId);

  function formatDate(val) {
    if (!val) return "--";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val;
    return d.toLocaleString("zh-CN", { hour12: false });
  }

  function getLabelName(labelId) {
    const label = labels.find((l) => l.id === labelId);
    return label?.labelName || `标签 #${labelId}`;
  }

  async function fetchDocs() {
    try {
      const data = await getDocuments();
      const list = data || [];
      setDocs(list);

      // 计算表格所需的标注/关系数量
      const enriched = await Promise.all(
          list.map(async (doc) => {
            const [entityList, relationList] = await Promise.all([
              getEntityItemsByDocument(doc.id).catch(() => []),
              getRelationsByDocument(doc.id).catch(() => []),
            ]);
            const entityCount = (entityList || []).length;
            const relationCount = (relationList || []).length;
            return {
              ...doc,
              entityCount,
              relationCount,
              annotated: entityCount > 0,
            };
          })
      );

      setDocTable(enriched);
      setPage(1); // 重置分页
      if (!selectedDocId && enriched.length > 0) {
        setSelectedDocId(enriched[0].id);
      }
    } catch (err) {
      await autoAlert("获取文档列表失败：" + err.message);
    }
  }

  async function fetchLabels() {
    const data = await getEntityLabels();
    setLabels(data || []);
  }

  async function fetchTokensAndEntities(docId) {
    const tokens = await getDocumentTokensByDocument(docId);
    setDocTokens(tokens || []);

    const offsets = [];
    let charIndex = 0;
    (tokens || []).forEach((token) => {
      offsets.push({
        start: charIndex,
        end: charIndex + token.tokenText.length - 1,
      });
      charIndex += token.tokenText.length;
    });
    setTextOffsets(offsets);

    const items = await getEntityItemsByDocument(docId);
    setEntities(items || []);
  }

  // ---------------- 文档 CRUD ----------------

  function openNewDoc() {
    setDocForm({ id: null, title: "", content: "" });
    setIsEditingContent(true); // 新建默认可编辑
    setShowDocModal(true);
  }

  async function handleSaveDoc() {
    if (!docForm.title.trim()) return autoAlert("标题不能为空");

    if (docForm.id) {
      await updateDocument(docForm.id, docForm);
    } else {
      await createDocument(docForm);
    }

    await fetchDocs();
    setShowDocModal(false);
    setIsEditingContent(false); // 重置编辑状态
  }

  async function handleDeleteDoc(id) {
    const ok = await autoConfirm("确认删除该文档吗？");
    if (!ok) return;
    await deleteDocument(id);
    await fetchDocs();
    setSelectedDocId(null);
  }

  function openEditDoc() {
    if (!selectedDocId) return;
    const doc = docs.find((d) => d.id === selectedDocId);
    if (!doc) return;

    setDocForm({
      id: doc.id,
      title: doc.title,
      content: doc.content || "",
    });

    setIsEditingContent(false); // 编辑内容默认只读
    setShowDocModal(true);
  }

  // ---------------- 文件上传 ----------------

  async function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || "");
      reader.onerror = () => reject(new Error("读取文件失败"));
      reader.readAsText(file, "utf-8");
    });
  }

  if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }

  async function extractDocx(file) {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammothBrowser.extractRawText({ arrayBuffer });
    return value || "";
  }

  async function extractPdf(file) {
    const typedArray = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjsLib.getDocument({ data: typedArray }).promise;
    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join("") + "\n";
    }
    return text.trim();
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = Array.from(files).find((f) => {
      const name = f.name.toLowerCase();
      return (
          f.type?.startsWith("text/") ||
          name.endsWith(".txt") ||
          name.endsWith(".docx") ||
          name.endsWith(".pdf")
      );
    });
    if (!file) {
      autoAlert("目前支持 txt / docx / pdf 文件");
      return;
    }

    try {
      const name = file.name.toLowerCase();
      let content = "";
      if (name.endsWith(".docx")) {
        content = await extractDocx(file);
      } else if (name.endsWith(".pdf")) {
        content = await extractPdf(file);
      } else {
        content = await readTextFile(file);
      }

      if (!content) {
        await autoAlert("未能读取到文本内容");
        return;
      }

      setDocForm((s) => ({
        ...s,
        content,
        title: s.title || file.name,
      }));
    } catch (err) {
      console.error("handleFiles error", err);
      await autoAlert("读取文件失败: " + err.message);
    }
  }

  // ---------------- 文本选中 -> 新增实体 ----------------

  function getSelectionOffsets(containerEl) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);

    const pre = range.cloneRange();
    pre.selectNodeContents(containerEl);
    pre.setEnd(range.startContainer, range.startOffset);

    const start = pre.toString().length;
    const end = start + range.toString().length - 1;

    return { start, end };
  }

  function getTokenIndexFromCharOffset(offset) {
    for (let i = 0; i < textOffsets.length; i++) {
      if (offset >= textOffsets[i].start && offset <= textOffsets[i].end) return i;
    }
    return -1;
  }

  async function handleMouseUp() {
    const el = document.getElementById("doc-content");
    const sel = window.getSelection();
    const text = sel.toString().trim();
    if (!text) return;

    const offsets = getSelectionOffsets(el);
    if (!offsets) return;

    const tokenStart = getTokenIndexFromCharOffset(offsets.start);
    const tokenEnd = getTokenIndexFromCharOffset(offsets.end);

    if (tokenStart === -1 || tokenEnd === -1) return;

    const hasSameRange = entities.some(
      (e) => e.tokenStart === tokenStart && e.tokenEnd === tokenEnd
    );
    if (hasSameRange) {
      await autoAlert("该区间已存在实体标注，请勿重复标注");
      return;
    }

    setNewEntity({
      text,
      labelName: "",
      description: "",
      tokenStart,
      tokenEnd,
    });

    setShowEntityModal(true);
  }

  async function handleEntitySubmit() {
    try {
      const hasSameRange = entities.some(
        (e) => e.tokenStart === newEntity.tokenStart && e.tokenEnd === newEntity.tokenEnd
      );
      if (hasSameRange) {
        await autoAlert("该区间已存在实体标注，请勿重复标注");
        return;
      }

      const label = await createEntityLabel({
        labelName: newEntity.labelName,
        description: newEntity.description,
      });

      await createEntityItem({
        documentId: selectedDocId,
        labelId: label.id,
        text: newEntity.text,
        tokenStart: newEntity.tokenStart,
        tokenEnd: newEntity.tokenEnd,
      });

      await fetchTokensAndEntities(selectedDocId);
      await fetchDocs(); // 更新表格中的标注数量
      setShowEntityModal(false);
    } catch (err) {
      await autoAlert("新增实体失败: " + err.message);
    }
  }

  function isTokenEntity(idx) {
    return entities.some((e) => idx >= e.tokenStart && idx <= e.tokenEnd);
  }


  // -------------------- UI --------------------
  return (
      <div className="page-section h-full flex flex-col gap-4">
        <div className="flex gap-4 flex-1 min-h-0">
          {/* 左侧文档列表 */}
          <div className="w-[420px] flex-shrink-0 card flex flex-col">
            <div className="card-header">
              <div>
                <div className="eyebrow">文档列表</div>
                <div className="section-title text-base flex gap-2">
                  <input
                      type="text"
                      className="input flex-1"
                      placeholder="搜索文档..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setSearchQuery(searchText);
                          setPage(1);
                        }
                      }}
                  />
                  <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setSearchQuery(searchText);
                        setPage(1);
                      }}
                  >
                    搜索
                  </button>
                  <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        setSearchText("");
                        setSearchQuery("");
                        setPage(1);
                      }}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body flex-1 overflow-auto p-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10 border-b">
                <tr className="text-left text-gray-600">
                  <th className="px-3 py-2">名称</th>
                  <th className="px-2 py-2 text-center">标注</th>
                  <th className="px-2 py-2 text-center">关系</th>
                </tr>
                </thead>
                <tbody>
                {filteredDocs.slice((page - 1) * pageSize, page * pageSize).map((doc) => (
                    <tr
                        key={doc.id}
                        className={`cursor-pointer border-b ${
                            selectedDocId === doc.id ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedDocId(doc.id)}
                    >
                      <td className="px-3 py-2 font-medium truncate">
                        {searchQuery ? (
                            <>
                              {doc.title.split(new RegExp(`(${searchQuery})`, "gi")).map((part, i) =>
                                  part.toLowerCase() === searchQuery.toLowerCase() ? (
                                      <span key={i} className="bg-yellow-200">{part}</span>
                                  ) : (
                                      <span key={i}>{part}</span>
                                  )
                              )}
                            </>
                        ) : (
                            doc.title
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">{doc.entityCount}</td>
                      <td className="px-2 py-2 text-center">{doc.relationCount}</td>
                    </tr>
                ))}
                {filteredDocs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-gray-500 py-6">
                        暂无文档
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>

            {filteredDocs.length > 0 && (
                <div className="border-t p-3 flex justify-between items-center text-sm">
            <span className="text-gray-500">
              {page} / {Math.max(1, Math.ceil(filteredDocs.length / pageSize))}
            </span>
                  <div className="flex gap-2">
                    <button
                        className="btn btn-ghost px-2 py-1"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      上一页
                    </button>
                    <button
                        className="btn btn-ghost px-2 py-1"
                        disabled={page === Math.ceil(filteredDocs.length / pageSize)}
                        onClick={() => setPage((p) => Math.min(Math.ceil(filteredDocs.length / pageSize), p + 1))}
                    >
                      下一页
                    </button>
                  </div>
                </div>
            )}
          </div>

          {/* 右侧文档内容 */}
          <div className="flex-1 card flex flex-col min-w-0">
            <div className="card-header flex items-center justify-between">
              <div>
                <div className="eyebrow">文档内容</div>
                <div className="section-title text-base">{selectedDoc?.title || "请选择文档"}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-success" onClick={openNewDoc}>
                  新建文档
                </button>
                {selectedDoc && (
                    <>
                      <button
                          className={`
    relative flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition-all duration-300
    ${isAiProcessing
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:scale-105 hover:shadow-lg active:scale-95'
                          }
  `}
                          onClick={handleAIAutoExtract}
                          disabled={isAiProcessing}
                      >
                        {isAiProcessing ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>AI 正在分析...</span>
                            </>
                        ) : (
                            <>
                              <span className="text-lg"></span>
                              <span>AI 自动标注</span>
                            </>
                        )}
                      </button>
                      <button className="btn btn-primary" onClick={openEditDoc}>
                        编辑
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDeleteDoc(selectedDocId)}>
                        删除
                      </button>
                      <div className="pill blue ml-2">ID: {selectedDoc.id}</div>
                    </>
                )}
              </div>
            </div>

            <div className="card-body flex-1 overflow-auto">
              {!selectedDoc && <div className="text-gray-500">请从左侧选择一个文档</div>}
              {selectedDoc && (
                  <>
                    <div className="text-sm text-gray-600 mb-3">
                      标注：{selectedDoc.entityCount} · 关系：{selectedDoc.relationCount} · 创建时间：{formatDate(selectedDoc.createdAt)}
                    </div>

                    {/* 文档内容多颜色显示 */}
                    <div id="doc-content" className="border rounded-xl p-4 bg-[#f9fbff] mb-4 whitespace-pre-wrap">
                      {docTokens.map((t, idx) => {
                        const entity = entities.find(e => idx >= e.tokenStart && idx <= e.tokenEnd);
                        const colorClass = entity ? getEntityColorClass(entity) : "";
                        return (
                            <span key={idx} className={`px-0.5 py-0.5 rounded font-semibold ${colorClass}`}>
                      {t.tokenText}
                    </span>
                        );
                      })}
                    </div>

                    {/* 实体列表多颜色显示 */}
                    <div className="mt-4">
                      <div className="font-semibold text-sm mb-2">已标注实体</div>
                      {sortedEntities.length === 0 ? (
                          <div className="text-sm text-gray-500">暂无实体</div>
                      ) : (
                          <div className="space-y-2">
                            {sortedEntities.map((e) => (
                                <div key={e.id} className="border rounded-lg px-3 py-2 flex justify-between items-center">
                                  <div>
                                    <div className="font-medium">{e.text}</div>
                                    <div className="text-xs text-gray-500">
                                      {getLabelName(e.labelId)} · {e.tokenStart}-{e.tokenEnd}
                                    </div>
                                  </div>
                                  <span className={`px-2 py-1 text-xs rounded-full font-semibold ${getEntityColorClass(e)}`}>
                          {getLabelName(e.labelId)}
                        </span>
                                </div>
                            ))}
                          </div>
                      )}
                    </div>
                  </>
              )}
            </div>
          </div>
        </div>

        {/* ================= 新建 / 编辑文档弹窗 ================= */}
        {showDocModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div
                  className={`bg-white rounded-2xl shadow-xl p-6 overflow-hidden
              ${docForm.id ? "w-[900px] h-[85vh]" : "w-[620px] max-h-[90vh] overflow-auto"}`}
              >
                <div className="flex flex-col h-full">
                  <h2 className="text-lg font-bold mb-4">
                    {docForm.id ? "编辑文档" : "新建文档"}
                  </h2>

                  {/* 文档信息（只读） */}
                  {docForm.id && selectedDoc && (
                      <div className="mb-4 rounded-xl border bg-gray-50 p-4 text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="font-semibold">文档信息</span>
                          <span className="text-gray-500">ID: {selectedDoc.id}</span>
                        </div>
                        <div className="text-gray-600 space-y-1">
                          <div>创建时间：{formatDate(selectedDoc.createdAt)}</div>
                          <div>已标注实体：{selectedDoc.entityCount}</div>
                        </div>
                      </div>
                  )}

                  {/* 标题输入 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">文档标题</label>
                    <input
                        className="input"
                        placeholder="请输入文档标题"
                        value={docForm.title}
                        onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                    />
                  </div>

                  {/* 内容区域 */}
                  <div className="mb-4 flex flex-col flex-1 min-h-0">
                    <label className="block text-sm font-medium mb-1">文档内容</label>
                    <textarea
                        className={`w-full resize-none rounded-xl border p-4 text-sm leading-relaxed flex-1 min-h-[400px]
                    ${docForm.id && !isEditingContent ? "bg-gray-50 text-gray-700 cursor-not-allowed" : "bg-white"}`}
                        value={docForm.content}
                        readOnly={docForm.id && !isEditingContent}
                        onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                    />
                    {docForm.id && !isEditingContent && (
                        <button
                            className="btn btn-ghost mt-2 self-start"
                            onClick={() => setIsEditingContent(true)}
                        >
                          编辑内容
                        </button>
                    )}

                    {docForm.id && selectedDoc?.entityCount > 0 && isEditingContent && (
                        <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                          修改文档内容可能导致已有实体标注位置失效，请谨慎操作。
                        </div>
                    )}
                  </div>

                  {/* 新建模式：上传文件 */}
                  {!docForm.id && (
                      <div className="border rounded-xl p-4 bg-gray-50 mb-4">
                        <div className="font-semibold mb-1">上传文档</div>
                        <div className="text-sm text-gray-500 mb-2">支持 txt / docx / pdf</div>
                        <input
                            type="file"
                            multiple
                            onChange={(e) => handleFiles(e.target.files)}
                            className="input"
                        />
                      </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setShowDocModal(false);
                          setIsEditingContent(false);
                        }}
                    >
                      取消
                    </button>
                    <button className="btn btn-primary" onClick={handleSaveDoc}>
                      {docForm.id ? "保存修改" : "创建文档"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
