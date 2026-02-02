import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AiOutlineFileText,
  AiOutlineTags,
  AiOutlineHome,
  AiOutlineRobot,
} from "react-icons/ai";
import { PiGitForkLight } from "react-icons/pi";
import { RiNodeTree } from "react-icons/ri";
import { getDocuments } from "../api/documents.js";
import { getEntityItemsByDocument } from "../api/entityItems.js";
import { getRelationsByDocument } from "../api/relations.js";

function normalizeResponsePayload(res) {
  if (!res && res !== 0) return null;
  if (res.data !== undefined) return res.data;
  return res;
}

function formatDate(val) {
  if (!val) return "--";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString("zh-CN", { hour12: false });
}

function safeNumber(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

export default function Home() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const res = await getDocuments();
      const payload = normalizeResponsePayload(res) || [];
      const list = Array.isArray(payload) ? payload : [];

      // 与“文档管理”页保持一致：通过接口计算每篇文档的实体/关系数量
      const enriched = await Promise.all(
        list.map(async (doc) => {
          const [entityList, relationList] = await Promise.all([
            getEntityItemsByDocument(doc.id).catch(() => []),
            getRelationsByDocument(doc.id).catch(() => []),
          ]);

          return {
            ...doc,
            entityCount: Array.isArray(entityList) ? entityList.length : 0,
            relationCount: Array.isArray(relationList) ? relationList.length : 0,
          };
        })
      );

      setDocs(enriched);
    } catch (e) {
      setDocs([]);
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const stats = useMemo(() => {
    const totalDocs = docs.length;
    const totalEntities = docs.reduce(
      (sum, d) => sum + safeNumber(d.entityCount ?? d.entity_count),
      0
    );
    const totalRelations = docs.reduce(
      (sum, d) => sum + safeNumber(d.relationCount ?? d.relation_count),
      0
    );

    const touchedDocs = docs.filter(
      (d) =>
        safeNumber(d.entityCount ?? d.entity_count) > 0 ||
        safeNumber(d.relationCount ?? d.relation_count) > 0
    ).length;

    const latestTime = docs.reduce((max, d) => {
      const t = new Date(
        d.updatedAt ?? d.updated_at ?? d.createdAt ?? d.created_at ?? 0
      ).getTime();
      return Number.isFinite(t) && t > max ? t : max;
    }, 0);

    return {
      totalDocs,
      totalEntities,
      totalRelations,
      touchedDocs,
      latestTime: latestTime ? new Date(latestTime).toISOString() : "",
    };
  }, [docs]);

  const recentDocs = useMemo(() => {
    return [...docs]
      .sort((a, b) => {
        const ta = new Date(
          a.updatedAt ?? a.updated_at ?? a.createdAt ?? a.created_at ?? 0
        ).getTime();
        const tb = new Date(
          b.updatedAt ?? b.updated_at ?? b.createdAt ?? b.created_at ?? 0
        ).getTime();
        return tb - ta;
      })
      .slice(0, 6);
  }, [docs]);

  return (
    <div className="page-section space-y-4">
      <div className="section-header">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <AiOutlineHome />
            首页
          </div>
          <div className="section-title">系统概览</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={loadOverview} disabled={loading}>
            刷新
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/documents")}>
            进入文档管理
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div
          className="card-body"
          style={{
            background:
              "radial-gradient(1200px 600px at 20% 0%, rgba(59,130,246,0.18), transparent 55%), radial-gradient(900px 500px at 80% 10%, rgba(34,197,94,0.14), transparent 55%), linear-gradient(180deg, rgba(248,250,252,1), rgba(255,255,255,1))",
          }}
        >
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="text-2xl font-extrabold text-gray-900">
                智能数据系统 · 标注工作台
              </div>
              <div className="text-sm text-gray-600 leading-6 max-w-3xl">
                以“文档 → 实体 → 关系 → 图谱”为主线，统一管理标注数据与标签体系。首页展示关键指标与快捷入口，便于快速进入当前工作。
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="pill blue">文档管理</span>
                <span className="pill green">实体标注</span>
                <span className="pill orange">关系标注</span>
                <span className="pill purple">知识图谱</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`pill ${error ? "red" : "green"}`}
                title={error ? error : "服务连接正常"}
              >
                {loading ? "加载中…" : error ? "服务异常" : "服务正常"}
              </div>
              <div className="text-xs text-gray-500">
                最近更新：{stats.latestTime ? formatDate(stats.latestTime) : "--"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body space-y-2">
            <div className="flex items-center justify-between">
              <div className="pill blue">
                <AiOutlineFileText /> 文档
              </div>
              <button className="btn btn-ghost" onClick={() => navigate("/documents")}>
                管理
              </button>
            </div>
            <div className="text-3xl font-extrabold text-gray-900">
              {loading ? "—" : stats.totalDocs}
            </div>
            <div className="text-sm text-gray-600">
              已参与标注：{loading ? "—" : `${stats.touchedDocs} / ${stats.totalDocs}`}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-2">
            <div className="flex items-center justify-between">
              <div className="pill green">
                <AiOutlineTags /> 实体
              </div>
              <button className="btn btn-ghost" onClick={() => navigate("/entities")}>
                去标注
              </button>
            </div>
            <div className="text-3xl font-extrabold text-gray-900">
              {loading ? "—" : stats.totalEntities}
            </div>
            <div className="text-sm text-gray-600">累计实体标注数量</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-2">
            <div className="flex items-center justify-between">
              <div className="pill orange">
                <PiGitForkLight /> 关系
              </div>
              <button className="btn btn-ghost" onClick={() => navigate("/relations")}>
                去标注
              </button>
            </div>
            <div className="text-3xl font-extrabold text-gray-900">
              {loading ? "—" : stats.totalRelations}
            </div>
            <div className="text-sm text-gray-600">累计关系标注数量</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-2">
            <div className="flex items-center justify-between">
              <div className="pill purple">
                <RiNodeTree /> 图谱
              </div>
              <button className="btn btn-ghost" onClick={() => navigate("/kg/view")}>
                查看
              </button>
            </div>
            <div className="text-3xl font-extrabold text-gray-900">可视化</div>
            <div className="text-sm text-gray-600">将实体与关系映射到知识图谱</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <div>
              <div className="eyebrow">最近工作</div>
              <div className="font-semibold">最近文档</div>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate("/documents")}>
              查看全部
            </button>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-gray-500">加载中...</div>
            ) : error ? (
              <div className="text-gray-500">{error}（请确认后端已启动且接口可访问）</div>
            ) : recentDocs.length === 0 ? (
              <div className="text-gray-500">暂无文档，请先在“文档管理”中创建/导入。</div>
            ) : (
              <div className="space-y-2">
                {recentDocs.map((d) => (
                  <div key={d.id} className="tag-tile flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {d.title || `文档 ${d.id}`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        实体：{safeNumber(d.entityCount ?? d.entity_count)} · 关系：
                        {safeNumber(d.relationCount ?? d.relation_count)} · 更新时间：
                        {formatDate(d.updatedAt ?? d.updated_at ?? d.createdAt ?? d.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="pill blue">ID: {d.id}</span>
                      <button className="btn btn-ghost" onClick={() => navigate("/documents")}>
                        打开
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="eyebrow">快捷入口</div>
              <div className="font-semibold">常用功能</div>
            </div>
          </div>
          <div className="card-body space-y-3">
            <button
              className="btn btn-primary w-full justify-center"
              onClick={() => navigate("/entities")}
            >
              <AiOutlineTags /> 开始实体标注
            </button>
            <button
              className="btn btn-ghost w-full justify-center"
              onClick={() => navigate("/relations")}
            >
              <PiGitForkLight /> 开始关系标注
            </button>
            <button
              className="btn btn-ghost w-full justify-center"
              onClick={() => navigate("/kg/editor")}
            >
              <RiNodeTree /> 进入图谱编辑
            </button>
            <button
              className="btn btn-ghost w-full justify-center"
              onClick={() => navigate("/agent")}
            >
              <AiOutlineRobot /> 智能对话
            </button>

            <div className="tag-tile mt-2">
              <div className="pill purple">推荐流程</div>
              <div className="text-sm text-gray-700 mt-2 leading-6">
                1）文档管理导入/创建
                <br />
                2）维护实体/关系标签
                <br />
                3）实体标注 + 结果复核
                <br />
                4）关系标注 + 结果复核
                <br />
                5）图谱查看/编辑
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
