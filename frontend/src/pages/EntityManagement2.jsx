import { useEffect, useMemo, useState } from "react";
import {
  getEntityLabels,
  createEntityLabel,
  updateEntityLabel,
  deleteEntityLabel,
} from "../api/entityLabels.js";
import { autoAlert, autoConfirm } from "../utils/autoDialog";

function normalizeResponsePayload(res) {
  if (!res && res !== 0) return null;
  if (res.data !== undefined) return res.data;
  return res;
}

const EMPTY_FORM = { id: null, labelName: "", description: "" };

export default function EntityLabelManagement() {
  const [labels, setLabels] = useState([]);
  const [labelForm, setLabelForm] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    fetchLabels();
  }, []);

  async function fetchLabels() {
    try {
      const res = await getEntityLabels();
      const payload = normalizeResponsePayload(res) || [];
      setLabels(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error("fetchLabels error:", err);
    }
  }

  function openCreateModal() {
    setLabelForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditModal(label) {
    setLabelForm({
      id: label.id,
      labelName: label.labelName ?? "",
      description: label.description ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setLabelForm(EMPTY_FORM);
  }

  function onLabelFormChange(field, value) {
    setLabelForm((s) => ({ ...s, [field]: value }));
  }

  async function saveLabel() {
    try {
      const name = (labelForm.labelName || "").trim();
      if (!name) return autoAlert("标签名称不能为空");

      const duplicate = labels.some(
          (l) =>
              l.id !== labelForm.id &&
              (l.labelName || "").trim().toLowerCase() === name.toLowerCase()
      );
      if (duplicate) return autoAlert("已存在同名标签，请使用其他名称");

      if (labelForm.id) {
        await updateEntityLabel(labelForm.id, {
          labelName: name,
          description: labelForm.description,
        });
      } else {
        await createEntityLabel({
          labelName: name,
          description: labelForm.description,
        });
      }

      await fetchLabels();
      closeModal();
      await autoAlert("标签保存成功");
    } catch (err) {
      console.error("saveLabel error:", err);
      await autoAlert("保存标签失败: " + err.message);
    }
  }

  async function removeLabel(id) {
    const ok = await autoConfirm("确认删除该标签？");
    if (!ok) return;

    try {
      await deleteEntityLabel(id);
      await fetchLabels();
      if (id === labelForm.id) closeModal();
      await autoAlert("标签删除成功");
    } catch (err) {
      console.error("removeLabel error:", err);
      await autoAlert("删除标签失败: " + err.message);
    }
  }

  /** 模糊搜索后的列表 */
  const filteredLabels = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return labels;

    return labels.filter((l) => {
      const name = (l.labelName || "").toLowerCase();
      const desc = (l.description || "").toLowerCase();
      return name.includes(keyword) || desc.includes(keyword);
    });
  }, [labels, searchKeyword]);

  /** 高亮命中关键字 */
  function highlightText(text, keyword) {
    if (!keyword) return text;
    if (!text) return "";

    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "ig");

    return text.split(regex).map((part, index) =>
        regex.test(part) ? (
            <mark
                key={index}
                className="bg-yellow-200 text-gray-900 font-semibold px-0.5 rounded"
            >
              {part}
            </mark>
        ) : (
            part
        )
    );
  }

  return (
      <div className="page-section space-y-4">
        <div className="section-header flex items-center justify-between">
          <div>
            <div className="eyebrow">实体与标签</div>
            <div className="section-title">标签管理</div>
          </div>
          <button className="btn btn-success" onClick={openCreateModal}>
            新增标签
          </button>
        </div>

        <div className="card">
          <div className="card-body space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">
                已有标签
                <span className="ml-2 text-sm text-gray-500">
                （共 {filteredLabels.length} 个）
              </span>
              </h3>

              <input
                  className="input w-64"
                  placeholder="搜索标签名称或描述"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>

            <div className="overflow-auto max-h-[720px] border border-[var(--border)] rounded-xl">
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
                {filteredLabels.map((l, index) => (
                    <tr key={l.id}>
                      <td>{index + 1}</td>
                      <td>{highlightText(l.labelName, searchKeyword)}</td>
                      <td>{highlightText(l.description, searchKeyword)}</td>
                      <td className="space-x-2">
                        <button
                            className="btn btn-ghost"
                            onClick={() => openEditModal(l)}
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

                {filteredLabels.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-gray-500">
                        未找到匹配的标签
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl w-full max-w-lg shadow-lg">
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {labelForm.id ? "编辑标签" : "新增标签"}
                  </h3>
                  <button className="btn btn-ghost" onClick={closeModal}>
                    ✕
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      标签名称
                    </label>
                    <input
                        className="input"
                        value={labelForm.labelName}
                        onChange={(e) =>
                            onLabelFormChange("labelName", e.target.value)
                        }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      描述
                    </label>
                    <textarea
                        className="input"
                        rows="3"
                        value={labelForm.description}
                        onChange={(e) =>
                            onLabelFormChange("description", e.target.value)
                        }
                    />
                  </div>
                </div>

                <div className="px-5 py-4 border-t flex justify-end gap-3">
                  <button className="btn btn-success" onClick={saveLabel}>
                    保存
                  </button>
                  <button className="btn btn-ghost" onClick={closeModal}>
                    取消
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
