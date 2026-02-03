import { useEffect, useState } from "react";
import { getDocuments } from "../api/documents.js";
import {
  getEntityItemsByDocument,
  updateEntityItem,
  deleteEntityItem,
} from "../api/entityItems.js";
import { getEntityLabels } from "../api/entityLabels.js";
import { autoAlert, autoConfirm } from "../utils/autoDialog";
import { analyzeCsvData } from "../api/ai.js";
import { exportBusinessWord } from "../utils/exportBusinessWord.js";
import { getEnhancedBusinessReport } from "../api/ai.js";

function normalizeResponsePayload(res) {
  if (!res && res !== 0) return null;
  if (res.data !== undefined) return res.data;
  return res;
}

/* ===== 标签颜色池 ===== */
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
  "bg-yellow-100 text-yellow-700",
  "bg-amber-100 text-amber-700",
  "bg-orange-100 text-orange-700",
];

function getLabelColor(labelId, labels) {
  const index = labels.findIndex((l) => Number(l.id) === Number(labelId));
  if (index === -1) return "bg-gray-100 text-gray-700";
  return labelColors[index % labelColors.length];
}

/* ===== 高亮命中关键字 ===== */
function highlightText(text, keyword) {
  if (!keyword) return text;
  if (!text) return "";

  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "ig");

  return text.split(regex).map((part, idx) =>
      regex.test(part) ? (
          <mark
              key={idx}
              className="bg-yellow-200 text-gray-900 font-semibold px-0.5 rounded"
          >
            {part}
          </mark>
      ) : (
          part
      )
  );
}

export default function EntityManagement3() {
  const PAGE_SIZE = 10;
  const ROW_HEIGHT = 64;
  const HEADER_HEIGHT = 64;
  const PAGINATION_HEIGHT = 96;
  const EXTRA_HEIGHT = 28;
  const TABLE_HEIGHT = HEADER_HEIGHT + ROW_HEIGHT * PAGE_SIZE;
  const TABLE_CONTAINER_HEIGHT =
      TABLE_HEIGHT + PAGINATION_HEIGHT + EXTRA_HEIGHT;

  const [docs, setDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [entities, setEntities] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editEntity, setEditEntity] = useState(null);
  const [page, setPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState("");

  const [analysisReport, setAnalysisReport] = useState("");
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);

  async function handleGenerateWordReport() {
    if (!analysisReport) return;

    setIsExporting(true);
    try {
      // 1. 调用后端获取深度报告
      const enhancedReport = await getEnhancedBusinessReport(analysisReport);

      // 2. 调用工具类生成并下载 Word
      await exportBusinessWord(enhancedReport, `业务指导报告_${selectedDocId}`);

      // 3. 成功后：显示提示弹窗
      setShowExportSuccess(true);

      // 4. 定时消失：3秒后自动关闭提示
      setTimeout(() => {
        setShowExportSuccess(false);
      }, 3000);

    } catch (err) {
      autoAlert("生成报告失败：" + err.message);
    } finally {
      setIsExporting(false);
    }
  }

  useEffect(() => {
    fetchDocs();
    fetchLabels();
  }, []);

  useEffect(() => {
    if (selectedDocId != null) fetchEntities(selectedDocId);
    else setEntities([]);
  }, [selectedDocId]);

  // labels 异步加载完成后，重新映射实体，避免“未命名”
  useEffect(() => {
    if (selectedDocId != null && labels.length) {
      fetchEntities(selectedDocId);
    }
  }, [labels, selectedDocId]);

  useEffect(() => {
    setPage(1);
  }, [selectedDocId, searchKeyword]);

  async function fetchDocs() {
    const res = await getDocuments();
    const payload = normalizeResponsePayload(res) || [];
    setDocs(payload);
    if (payload.length && selectedDocId == null) {
      setSelectedDocId(payload[0].id);
    }
  }

  async function handleAnalyze() {
    if (!selectedDocId) return autoAlert("请先选择一个文档");

    setIsAnalyzing(true);
    try {
      const report = await analyzeCsvData(selectedDocId);
      setAnalysisReport(report);
      setShowAnalysisModal(true);
    } catch (err) {
      autoAlert("分析失败：" + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function fetchLabels() {
    const res = await getEntityLabels();
    setLabels(normalizeResponsePayload(res) || []);
  }

  async function fetchEntities(docId) {
    try {
      setLoading(true);
      const res = await getEntityItemsByDocument(docId);
      const items = normalizeResponsePayload(res) || [];

      const labelMap = {};
      labels.forEach((l) => (labelMap[l.id] = l));

      setEntities(
          items.map((it) => {
            const lid = Number(it.labelId ?? it.label);
            const label = labelMap[lid] || {};
            return {
              ...it,
              labelId: lid,
              labelName: label.labelName ?? "",
              text: it.text,
              tokenStart: Number(it.tokenStart),
              tokenEnd: Number(it.tokenEnd),
            };
          })
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    const nextTokenStart = Number(editEntity.tokenStart);
    const nextTokenEnd = Number(editEntity.tokenEnd);
    const hasSameRange = entities.some(
      (e) =>
        String(e.id) !== String(editEntity.id) &&
        Number(e.tokenStart) === nextTokenStart &&
        Number(e.tokenEnd) === nextTokenEnd
    );
    if (hasSameRange) {
      await autoAlert("该区间已存在实体标注，请勿重复标注");
      return;
    }

    await updateEntityItem(editEntity.id, editEntity);
    await fetchEntities(selectedDocId);
    setEditEntity(null);
    autoAlert("更新成功");
  }

  async function removeEntity(id) {
    if (!(await autoConfirm("确认删除该实体？"))) return;
    await deleteEntityItem(id);
    await fetchEntities(selectedDocId);
    autoAlert("删除成功");
  }

  /* ===== 搜索过滤 ===== */
  const filteredEntities = (() => {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return entities;
    return entities.filter(
        (e) =>
            (e.text || "").toLowerCase().includes(kw) ||
            (e.labelName || "").toLowerCase().includes(kw)
    );
  })();

  /* ===== 排序 ===== */
  const sortedEntities = [...filteredEntities].sort((a, b) => {
    if (a.labelId !== b.labelId) return a.labelId - b.labelId;
    return a.tokenStart - b.tokenStart;
  });

  const totalPages = Math.max(
      1,
      Math.ceil(sortedEntities.length / PAGE_SIZE)
  );

  const pagedEntities = sortedEntities.slice(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE
  );

  return (
      <div className="page-section space-y-4">
        {/* ===== 页面标题 ===== */}
        <div className="section-header">
          <div>
            <div className="eyebrow">实体与标签</div>
            <div className="section-title">标注结果</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-4">

            {/* ===== 文档选择 + 搜索 ===== */}
            <div className="flex items-center justify-between gap-8 flex-wrap">
              {/* 左侧：文档选择 */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  选择文档
                </label>

                <select
                    value={selectedDocId ?? ""}
                    onChange={(e) => setSelectedDocId(Number(e.target.value))}
                    className="input"
                    style={{ width: "24rem" }}
                >
                  <option value="">-- 请选择 --</option>
                  {docs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title || `文档 ${d.id}`}
                      </option>
                  ))}
                </select>
              </div>

              {/* 右侧：AI分析按钮 + 搜索 + 统计 */}
              <div className="flex items-center gap-4 mr-6">
                {/* 新增 AI 数据关联分析按钮 */}
                <button
                    className={`btn flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white transition-all shadow-md ${
                        isAnalyzing
                            ? "bg-gray-400 cursor-wait"
                            : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 active:scale-95"
                    }`}
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>分析中...</span>
                      </>
                  ) : (
                      <>
                        <span>📊 AI 数据关联分析</span>
                      </>
                  )}
                </button>

                <input
                    className="input"
                    style={{ width: "18rem" }}
                    placeholder="搜索文本或标签"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                />

                <span className="text-sm text-gray-500 whitespace-nowrap">
                  当前实体：{filteredEntities.length} 条
                </span>
              </div>
            </div>


            {/* ===== 表格容器 ===== */}
            <div
                className="border border-[var(--border)] rounded-xl"
                style={{
                  minHeight: `${TABLE_CONTAINER_HEIGHT}px`,
                  display: "flex",
                  flexDirection: "column",
                }}
            >
              <div style={{ minHeight: `${TABLE_HEIGHT}px`, overflowY: "auto" }}>
                <table className="table" style={{ tableLayout: "fixed" }}>
                  <thead>
                  <tr style={{ height: `${HEADER_HEIGHT}px` }}>
                    <th className="text-center w-[8%]">序号</th>
                    <th className="w-[38%]">文本</th>
                    <th className="w-[16%]">标签</th>
                    <th className="text-center w-[18%]">区间</th>
                    <th className="text-center w-[20%]">操作</th>
                  </tr>
                  </thead>
                  <tbody>
                  {pagedEntities.map((it, idx) => (
                      <tr key={it.id} style={{ height: `${ROW_HEIGHT}px` }}>
                        <td className="text-center">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="truncate" title={it.text}>
                          {highlightText(it.text, searchKeyword)}
                        </td>
                        <td>
                        <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getLabelColor(
                                it.labelId,
                                labels
                            )}`}
                        >
                          {highlightText(
                              it.labelName || "未命名",
                              searchKeyword
                          )}
                        </span>
                        </td>
                        <td className="text-center">
                          {it.tokenStart} - {it.tokenEnd}
                        </td>
                        <td className="text-center">
                          <div className="inline-flex gap-2">
                            <button
                                className="btn btn-ghost"
                                onClick={() => setEditEntity(it)}
                            >
                              编辑
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => removeEntity(it.id)}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                  ))}

                  {pagedEntities.length === 0 && (
                      <tr style={{ height: `${ROW_HEIGHT}px` }}>
                        <td colSpan={5} className="text-center text-gray-500">
                          {loading
                              ? "加载中..."
                              : searchKeyword
                                  ? "未找到匹配的实体"
                                  : "暂无实体"}
                        </td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>

              <div
                  className="flex items-center justify-end gap-3 px-4"
                  style={{ height: `${PAGINATION_HEIGHT}px` }}
              >
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
                      onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                      }
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 编辑实体 Modal ===== */}
        {editEntity && (
            <div className="modal">
              <div className="modal-content max-w-xl w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">编辑实体</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">文本</label>
                    <input
                        className="input w-full"
                        value={editEntity.text}
                        onChange={(e) =>
                            setEditEntity({
                              ...editEntity,
                              text: e.target.value,
                            })
                        }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">标签</label>
                    <select
                        className="input w-full"
                        value={editEntity.labelId}
                        onChange={(e) =>
                            setEditEntity({
                              ...editEntity,
                              labelId: Number(e.target.value),
                            })
                        }
                    >
                      <option value="">请选择标签</option>
                      {labels.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.labelName}
                          </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        tokenStart
                      </label>
                      <input
                          type="number"
                          className="input"
                          value={editEntity.tokenStart}
                          onChange={(e) =>
                              setEditEntity({
                                ...editEntity,
                                tokenStart: Number(e.target.value),
                              })
                          }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        tokenEnd
                      </label>
                      <input
                          type="number"
                          className="input"
                          value={editEntity.tokenEnd}
                          onChange={(e) =>
                              setEditEntity({
                                ...editEntity,
                                tokenEnd: Number(e.target.value),
                              })
                          }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button className="btn btn-primary" onClick={handleUpdate}>
                      保存
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => setEditEntity(null)}
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* ===== 新增：AI 分析报告 Modal ===== */}
        {showAnalysisModal && (
            <div className="modal" style={{ zIndex: 100 }}>
              <div className="modal-content max-w-4xl w-full flex flex-col shadow-2xl" style={{ height: '85vh' }}>
                <div className="flex items-center justify-between mb-4 border-b pb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-2xl">📝</span> AI 数据关联分析报告
                  </h3>
                  <button
                      className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                      onClick={() => setShowAnalysisModal(false)}
                  >
                    &times;
                  </button>
                </div>

                <div className="flex-1 overflow-auto bg-gray-50 rounded-xl p-6 border border-gray-200 shadow-inner">
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                    {analysisReport}
                  </div>
                </div>

                <div className="flex justify-end pt-4 mt-2">
                  <div className="flex justify-end gap-3 pt-4 mt-2">
                    {/* 新增：生成业务报告按钮 */}
                    <button
                        className={`btn flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-all ${
                            isExporting
                                ? "bg-gray-400 cursor-wait"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg active:scale-95"
                        }`}
                        onClick={handleGenerateWordReport}
                        disabled={isExporting}
                    >
                      {isExporting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>正在生成专家意见...</span>
                          </>
                      ) : (
                          <>
                            <span>📄 生成并导出 Word 业务报告</span>
                          </>
                      )}
                    </button>

                    <button
                        className="btn btn-primary px-10 py-2 rounded-lg font-bold"
                        onClick={() => setShowAnalysisModal(false)}
                    >
                      确认收悉
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* ===== 导出成功自动消失的提示 ===== */}
        {showExportSuccess && (
            <div className="fixed inset-0 flex items-center justify-center z-[200] pointer-events-none">
              <div className="bg-gray-900/80 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce-in">
                <div className="bg-emerald-500 rounded-full p-1">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold">导出成功</span>
                  <span className="text-sm opacity-80">Word 文档已保存至下载目录</span>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
