// src/pages/Prompts.jsx
import React, { useEffect, useState } from "react";
import {
  getPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  activatePrompt,
  deactivatePrompt,
} from "../api/prompts.js";
import { AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
import { autoAlert, autoConfirm } from "../utils/autoDialog";

export default function Prompts() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editingPrompt, setEditingPrompt] = useState({
    id: null,
    name: "",
    taskType: "",
    description: "",
    templateText: "",
    model: "",
    version: 1,
    isActive: 1,
  });

  const [showForm, setShowForm] = useState(false);
  const [filterTaskType, setFilterTaskType] = useState("");
  const [filterModel, setFilterModel] = useState("");

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    setLoading(true);
    try {
      const data = await getPrompts(filterTaskType, filterModel);
      setPrompts(data || []);
    } catch (err) {
      await autoAlert("获取提示词失败：" + err.message);
    } finally {
      setLoading(false);
    }
  }

  function openNewPrompt() {
    setEditingPrompt({
      id: null,
      name: "",
      taskType: "",
      description: "",
      templateText: "",
      model: "",
      version: 1,
      isActive: 1,
    });
    setShowForm(true);
  }

  function openEditPrompt(p) {
    setEditingPrompt({ ...p });
    setShowForm(true);
  }

  async function savePrompt() {
    if (!editingPrompt.name || !editingPrompt.templateText) {
      return autoAlert("名称和模板内容不能为空");
    }
    try {
      if (editingPrompt.id) {
        await updatePrompt(editingPrompt);
      } else {
        await createPrompt(editingPrompt);
      }
      setShowForm(false);
      loadPrompts();
    } catch (err) {
      await autoAlert("保存失败：" + err.message);
    }
  }

  async function handleDelete(id) {
    const ok = await autoConfirm("确认删除该提示词吗？");
    if (!ok) return;
    try {
      await deletePrompt(id);
      loadPrompts();
    } catch (err) {
      await autoAlert("删除失败：" + err.message);
    }
  }

  async function handleToggleActive(p) {
    try {
      if (p.isActive) {
        await deactivatePrompt(p.id);
      } else {
        await activatePrompt(p.id);
      }
      loadPrompts();
    } catch (err) {
      await autoAlert("操作失败：" + err.message);
    }
  }

  return (
    <div className="page-section space-y-4">
      <div className="section-header">
        <div>
          <div className="eyebrow">提示词</div>
          <div className="section-title">提示词管理</div>
        </div>
        <button className="btn btn-success" onClick={openNewPrompt}>
          新增提示词
        </button>
      </div>

      <div className="card">
        <div className="card-body flex gap-2 flex-wrap items-center">
          <input
            placeholder="任务类型筛选"
            className="input flex-1 min-w-[180px]"
            value={filterTaskType}
            onChange={(e) => setFilterTaskType(e.target.value)}
          />
          <input
            placeholder="模型筛选"
            className="input flex-1 min-w-[180px]"
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
          />
          <button className="btn btn-primary" onClick={loadPrompts}>
            筛选
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="card-body">加载中..</div>
        </div>
      ) : prompts.length === 0 ? (
        <div className="card">
          <div className="card-body text-gray-500">暂无提示词</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prompts.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-[var(--border)] rounded-2xl shadow p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg">{p.name}</div>
                    <div className="text-sm text-gray-500">{p.description}</div>
                    <div className="text-xs mt-1 space-x-2">
                      <span className="pill blue">
                        任务类型: {p.taskType || "-"}
                      </span>
                      <span className="pill purple">
                        模型: {p.model || "-"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost p-2" onClick={() => openEditPrompt(p)}>
                      <AiOutlineEdit />
                    </button>
                    <button className="btn btn-danger p-2" onClick={() => handleDelete(p.id)}>
                      <AiOutlineDelete />
                    </button>
                  </div>
                </div>
                <pre className="mt-2 p-3 bg-[#f9fbff] border border-[var(--border)] rounded text-sm whitespace-pre-wrap break-words">
                  {p.templateText}
                </pre>
              </div>
              <div className="mt-3">
                <button
                  className={`btn ${p.isActive ? "btn-success" : "btn-ghost"}`}
                  onClick={() => handleToggleActive(p)}
                >
                  {p.isActive ? "已激活" : "已停用"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal">
          <div className="modal-content w-full max-w-xl">
            <h3 className="text-lg font-semibold mb-3">
              {editingPrompt.id ? "编辑提示词" : "新增提示词"}
            </h3>

            <div className="grid-gap-12">
              <input
                className="input"
                placeholder="名称"
                value={editingPrompt.name}
                onChange={(e) => setEditingPrompt((s) => ({ ...s, name: e.target.value }))}
              />
              <input
                className="input"
                placeholder="任务类型"
                value={editingPrompt.taskType}
                onChange={(e) => setEditingPrompt((s) => ({ ...s, taskType: e.target.value }))}
              />
              <input
                className="input"
                placeholder="模型"
                value={editingPrompt.model}
                onChange={(e) => setEditingPrompt((s) => ({ ...s, model: e.target.value }))}
              />
              <input
                className="input"
                placeholder="描述"
                value={editingPrompt.description}
                onChange={(e) => setEditingPrompt((s) => ({ ...s, description: e.target.value }))}
              />
              <textarea
                className="input"
                rows={6}
                placeholder="提示词模板内容"
                value={editingPrompt.templateText}
                onChange={(e) =>
                  setEditingPrompt((s) => ({ ...s, templateText: e.target.value }))
                }
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>
                取消
              </button>
              <button className="btn btn-success" onClick={savePrompt}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
