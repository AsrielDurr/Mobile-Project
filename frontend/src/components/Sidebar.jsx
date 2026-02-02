import { NavLink } from "react-router-dom";
import {
  AiOutlineHome,
  AiOutlineFileText,
  AiOutlineTags,
  AiOutlineEdit,
  AiOutlineUnorderedList,
  AiOutlineSetting,
  AiOutlineRobot,
} from "react-icons/ai";
import { PiGitForkLight } from "react-icons/pi";
import { RiNodeTree, RiGitBranchLine } from "react-icons/ri";

/**
 * Sidebar 配置（严格按业务层级）
 */
const SIDEBAR_CONFIG = [
  {
    links: [
      { name: "首页", path: "/", icon: <AiOutlineHome />, exact: true },
      { name: "文档管理", path: "/documents", icon: <AiOutlineFileText /> },
    ],
  },
  {
    group: { name: "实体标注", icon: <AiOutlineTags /> },
    links: [
      { name: "实体标注", path: "/entities", icon: <AiOutlineEdit />, exact: true },
      { name: "标注结果", path: "/entities/results", icon: <AiOutlineUnorderedList /> },
      { name: "标签管理", path: "/entities/labels", icon: <AiOutlineTags /> },
    ],
  },
  {
    group: { name: "关系标注", icon: <PiGitForkLight /> },
    links: [
      { name: "关系标注", path: "/relations", icon: <PiGitForkLight />, exact: true },
      { name: "标注结果", path: "/relations/results", icon: <RiGitBranchLine /> },
      { name: "关系标签", path: "/relations/labels", icon: <AiOutlineTags /> },
    ],
  },
  {
    group: { name: "知识图谱", icon: <RiNodeTree /> },
    links: [
      { name: "图谱编辑", path: "/kg/editor", icon: <RiNodeTree /> },
      { name: "图谱查看", path: "/kg/view", icon: <RiGitBranchLine /> },
    ],
  },
  {
    group: { name: "系统配置", icon: <AiOutlineSetting /> },
    links: [
      { name: "提示词管理", path: "/prompts", icon: <AiOutlineFileText /> },
      { name: "智能对话", path: "/agent", icon: <AiOutlineRobot /> },
    ],
  },
];

export default function Sidebar() {
  return (
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <span className="brand-dot" />
          <span>智能数据系统</span>
        </div>

        <nav>
          {SIDEBAR_CONFIG.map((block, index) => (
              <div key={index}>
                {/* 一级模块标题（不缩进） */}
                {block.group && (
                    <div
                        className="sidebar-module-title"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.75rem 1rem 0.25rem",
                          marginTop: "1.25rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          color: "#64748b",
                          userSelect: "none",
                          cursor: "default",
                        }}
                    >
                <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      fontSize: "0.9rem",
                      opacity: 0.7,
                    }}
                >
                  {block.group.icon}
                </span>
                      <span>{block.group.name}</span>
                    </div>
                )}

                {/* 页面入口（统一缩进） */}
                {block.links.map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        end={link.exact}
                        className={({ isActive }) =>
                            `nav-link ${isActive ? "active" : ""}`
                        }
                        style={{
                          padding: "0.6rem 1rem 0.6rem 1.5rem",
                        }}
                    >
                      <span className="text-lg">{link.icon}</span>
                      <span>{link.name}</span>
                    </NavLink>
                ))}
              </div>
          ))}
        </nav>
      </aside>
  );
}
