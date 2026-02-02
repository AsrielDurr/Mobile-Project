import React, { useEffect, useState } from "react";
import {
  getRelationLabels,
  createRelationLabel,
  updateRelationLabel,
  deleteRelationLabel,
} from "../api/relationLabels.js";
import { autoAlert, autoConfirm } from "../utils/autoDialog";

function normalizeResponsePayload(res) {
  if (!res && res !== 0) return null;
  if (res.data !== undefined) return res.data;
  return res;
}

export default function Relations2() {
  const [labels, setLabels] = useState([]);
  const [labelForm, setLabelForm] = useState({ id: null, relationName: "", description: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadLabels();
  }, []);

  async function loadLabels() {
    try {
      const res = await getRelationLabels();
      const arr = normalizeResponsePayload(res) || [];
      setLabels(arr);
    } catch (err) {
      console.error("loadLabels error:", err);
    }
  }

  function onLabelFormChange(field, value) {
    setLabelForm((s) => ({ ...s, [field]: value }));
  }

  async function saveLabel() {
    const name = (labelForm.relationName || "").trim();
    if (!name) return autoAlert("关系名称不能为空");

    const duplicate = labels.some(
        (l) =>
            l &&
            l.id !== labelForm.id &&
            (l.relationName || "").trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) return autoAlert("已存在同名标签，请更换名称");

    try {
      if (labelForm.id) {
        await updateRelationLabel({
          id: Number(labelForm.id),
          relationName: name,
          description: labelForm.description,
        });
      } else {
        await createRelationLabel({
          relationName: name,
          description: labelForm.description,
        });
      }
      await loadLabels();
      setLabelForm({ id: null, relationName: "", description: "" });
      setIsModalOpen(false);
      await autoAlert("标签保存成功");
    } catch (err) {
      console.error("saveLabel error:", err);
      await autoAlert("保存标签失败：" + err.message);
    }
  }

  async function handleDelete(id) {
    const ok = await autoConfirm("确认删除该关系标签？");
    if (!ok) return;
    try {
      await deleteRelationLabel(id);
      await loadLabels();
      await autoAlert("标签已删除");
    } catch (err) {
      console.error("handleDelete error:", err);
      await autoAlert("删除失败：" + err.message);
    }
  }

  function openModal(label = null) {
    if (label) {
      setLabelForm({ id: label.id, relationName: label.relationName, description: label.description });
    } else {
      setLabelForm({ id: null, relationName: "", description: "" });
    }
    setIsModalOpen(true);
  }

  // 过滤标签
  const filteredLabels = labels.filter((l) => {
    const text = searchText.trim().toLowerCase();
    return (
        !text ||
        (l.relationName || "").toLowerCase().includes(text) ||
        (l.description || "").toLowerCase().includes(text)
    );
  });

  // 高亮匹配文本
  function highlightText(text) {
    if (!searchText) return text;
    const regex = new RegExp(`(${searchText})`, "gi");
    return text.replace(regex, '<span class="bg-yellow-200">$1</span>');
  }

  return (
      <div className="page-section space-y-4">
        <div className="section-header">
          <div>
            <div className="eyebrow">关系标签</div>
            <div className="section-title">关系标签管理</div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="card">
            <div className="card-body space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">已有标签</h3>
                <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
                  新增标签
                </button>
              </div>

              {/* 搜索框 */}
              <input
                  type="text"
                  placeholder="搜索标签名称或描述"
                  className="input w-full mb-3"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
              />

              <div className="overflow-auto max-h-[720px] border border-[var(--border)] rounded-xl">
                <table className="table">
                  <thead>
                  <tr>
                    <th>ID</th>
                    <th>名称</th>
                    <th>描述</th>
                    <th>操作</th>
                  </tr>
                  </thead>
                  <tbody>
                  {filteredLabels.map((l, idx) => (
                      <tr key={l.id}>
                        <td>{idx + 1}</td>
                        <td dangerouslySetInnerHTML={{ __html: highlightText(l.relationName) }} />
                        <td dangerouslySetInnerHTML={{ __html: highlightText(l.description || "") }} />
                        <td className="space-x-2">
                          <button className="btn btn-ghost text-sm" onClick={() => openModal(l)}>
                            编辑
                          </button>
                          <button className="btn btn-danger text-sm" onClick={() => handleDelete(l.id)}>
                            删除
                          </button>
                        </td>
                      </tr>
                  ))}
                  {filteredLabels.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center text-gray-400 py-4">
                          暂无标签
                        </td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* 弹窗 */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
                <h3 className="text-lg font-semibold mb-4">{labelForm.id ? "编辑标签" : "新增标签"}</h3>
                <input
                    className="input w-full mb-2"
                    placeholder="关系名称"
                    value={labelForm.relationName}
                    onChange={(e) => onLabelFormChange("relationName", e.target.value)}
                />
                <textarea
                    className="input w-full mb-4"
                    rows="4"
                    placeholder="描述（可选）"
                    value={labelForm.description}
                    onChange={(e) => onLabelFormChange("description", e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                    取消
                  </button>
                  <button className="btn btn-primary" onClick={saveLabel}>
                    保存
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
