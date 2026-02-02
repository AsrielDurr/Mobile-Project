import { useEffect, useRef, useState } from "react";
import { AiOutlineRobot } from "react-icons/ai";
import { FiSend, FiUser, FiPlus, FiMessageSquare, FiTrash } from "react-icons/fi";

/**
 * 智能助手页面
 * - 直接调用 DeepSeek Chat API（需在环境变量中配置 VITE_DEEPSEEK_API_KEY）
 * - 会话上下文持久化 localStorage，支持多会话列表（新建/切换）
 * - 不依赖后端数据库
 */

const CONV_KEY = "agent-conversations-v2";
const LEGACY_KEY = "agent-chat-history"; // 兼容旧数据
const MAX_HISTORY = 40; // 单会话保留条数
const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

function loadConversations() {
  try {
    const raw = localStorage.getItem(CONV_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }

    // 兼容旧版：只有一份 messages
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const msgs = JSON.parse(legacyRaw);
      if (Array.isArray(msgs)) {
        const conv = {
          id: String(Date.now()),
          title: "旧对话",
          updatedAt: Date.now(),
          messages: msgs.slice(-MAX_HISTORY),
        };
        return [conv];
      }
    }
  } catch (e) {
    console.warn("load conversations failed", e);
  }
  // 默认一个空对话
  return [
    {
      id: String(Date.now()),
      title: "新对话",
      updatedAt: Date.now(),
      messages: [
        {
          id: Date.now(),
          role: "assistant",
          content: "您好，我是智能助手，请问有什么可以帮您？",
          ts: new Date().toISOString(),
        },
      ],
    },
  ];
}

function saveConversations(list) {
  try {
    localStorage.setItem(CONV_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("save conversations failed", e);
  }
}

export default function Agent() {
  const [conversations, setConversations] = useState(() => loadConversations());
  const [activeId, setActiveId] = useState(() => loadConversations()[0]?.id || "");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const activeConv = conversations.find((c) => c.id === activeId) || conversations[0];
  const messages = activeConv?.messages || [];

  // 自动滚动到底部
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, activeId]);

  // 持久化
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const baseSystemPrompt =
    "You are an intelligent assistant. Answer concisely and helpfully. Keep replies under 200 words unless user asks for more. Use Chinese by default.";

  async function callDeepSeekStream(payloadMessages, onDelta) {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("缺少 DeepSeek API Key，请在 .env.local 中配置 VITE_DEEPSEEK_API_KEY");
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: baseSystemPrompt }, ...payloadMessages],
        temperature: 0.6,
        max_tokens: 1200,
        stream: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`调用 DeepSeek 失败：${res.status} ${text}`);
    }

    if (!res.body || !res.body.getReader) {
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error("未获取到回复内容");
      onDelta?.(content, content);
      return content.trim();
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") return fullText;
        try {
          const json = JSON.parse(data);
          const delta =
            json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content ?? "";
          if (delta) {
            fullText += delta;
            onDelta?.(delta, fullText);
          }
        } catch (e) {
          // 忽略非 JSON 行
        }
      }
    }

    if (buffer.trim().startsWith("data:")) {
      const data = buffer.trim().slice(5).trim();
      if (data && data !== "[DONE]") {
        try {
          const json = JSON.parse(data);
          const delta =
            json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content ?? "";
          if (delta) {
            fullText += delta;
            onDelta?.(delta, fullText);
          }
        } catch (e) {
          // ignore
        }
      }
    }

    return fullText;
  }

  function updateConversationMessages(convId, updater) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: updater(c.messages || []).slice(-MAX_HISTORY), updatedAt: Date.now() }
          : c
      )
    );
  }

  function renameConversation(convId, title) {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, title, updatedAt: Date.now() } : c))
    );
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || !activeConv) return;
    const convId = activeConv.id;
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      ts: new Date().toISOString(),
    };
    updateConversationMessages(convId, (msgs) => [...msgs, userMsg]);
    // 如果标题还是默认，用首条用户输入更新标题
    if (!activeConv.title || activeConv.title === "新对话") {
      renameConversation(convId, text.slice(0, 24) || "新对话");
    }
    setInput("");
    inputRef.current?.focus();
    setLoading(true);
    const assistantId = Date.now() + 1;
    updateConversationMessages(convId, (msgs) => [
      ...msgs,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        ts: new Date().toISOString(),
      },
    ]);
    try {
      const payload = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const assistantText = await callDeepSeekStream(payload, (_delta, fullText) => {
        updateConversationMessages(convId, (msgs) =>
          msgs.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
        );
      });
      updateConversationMessages(convId, (msgs) =>
        msgs.map((m) =>
          m.id === assistantId ? { ...m, content: assistantText || m.content } : m
        )
      );
    } catch (err) {
      updateConversationMessages(convId, (msgs) =>
        msgs.map((m) =>
          m.id === assistantId
            ? { ...m, content: `调用失败：${err.message}`, error: true }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function handleNewConversation() {
    const id = String(Date.now());
    const newConv = {
      id,
      title: "新对话",
      updatedAt: Date.now(),
      messages: [
        {
          id: Date.now(),
          role: "assistant",
          content: "您好，我是智能助手，请问有什么可以帮您？",
          ts: new Date().toISOString(),
        },
      ],
    };
    setConversations((prev) => [newConv, ...prev].slice(0, 50));
    setActiveId(id);
  }

  function handleSelectConversation(id) {
    setActiveId(id);
  }

  function deleteConversation(id) {
    const ok = window.confirm("确认删除该对话记录？");
    if (!ok) return;
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fresh = loadConversations();
        setActiveId(fresh[0]?.id || "");
        return fresh;
      }
      if (id === activeId) {
        setActiveId(next[0].id);
      }
      return next;
    });
  }

  function handleClearConversation() {
    if (!activeConv) return;
    const convId = activeConv.id;
    updateConversationMessages(convId, () => [
      {
        id: Date.now(),
        role: "assistant",
        content: "对话已重置，请继续提问。",
        ts: new Date().toISOString(),
      },
    ]);
  }

  function renderBubble(msg) {
    const isUser = msg.role === "user";
    return (
      <div
        key={msg.id}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 px-2`}
      >
        {!isUser && (
          <div className="mr-2 flex items-start text-2xl text-[#2563eb]">
            <AiOutlineRobot />
          </div>
        )}
        <div
          className={`max-w-[76%] px-3 py-2 rounded-2xl shadow-sm border ${
            isUser
              ? "bg-[#e8f2ff] border-[#d0e4ff]"
              : "bg-white border-[#e5eaf2]"
          } ${msg.error ? "border-red-200 bg-red-50 text-red-700" : ""}`}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {msg.content}
          </div>
        </div>
        {isUser && (
          <div className="ml-2 flex items-start text-2xl text-[#2563eb]">
            <FiUser />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-body">
      <div className="grid gap-4 lg:grid-cols-12">
        {/* 左侧会话列表 */}
        <div className="lg:col-span-2 md:col-span-3">
          <div className="card h-full">
            <div className="card-body space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#2563eb] font-semibold">
                  <FiMessageSquare />
                  <span>新对话</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-danger"
                    style={{ paddingInline: "10px" }}
                    onClick={() => deleteConversation(activeId)}
                    disabled={!activeId}
                  >
                    <FiTrash className="text-lg" />
                    <span className="hidden sm:inline">删除</span>
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ paddingInline: "10px" }}
                    onClick={handleNewConversation}
                  >
                    <FiPlus className="text-lg" />
                    <span className="hidden sm:inline">新建</span>
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-500">历史对话</div>
              <div className="space-y-1 max-h-[72vh] overflow-auto pr-1">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                      c.id === activeId
                        ? "bg-[#eef2ff] border-[#c7d2fe]"
                        : "bg-white border-[#e5e7eb] hover:border-[#d0d7e2]"
                    }`}
                  >
                    <div className="text-sm font-semibold truncate">{c.title || "新对话"}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(c.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                    </div>
                  </button>
                ))}
                {conversations.length === 0 && (
                  <div className="text-xs text-gray-500">暂无对话，点击上方新建。</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧聊天 */}
        <div className="lg:col-span-10 md:col-span-9">
          <div className="card">
            <div
              className="card-header"
              style={{
                background: "linear-gradient(90deg, #1fb6ff 0%, #7c3aed 100%)",
                color: "#fff",
              }}
            >
              <div className="flex items-center gap-2 text-white">
                <AiOutlineRobot />
                <span className="font-bold">{activeConv?.title || "智能助手"}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost" onClick={handleClearConversation}>
                  重置对话
                </button>
              </div>
            </div>

            <div className="card-body p-0" style={{ height: "76vh" }}>
              <div
                ref={listRef}
                className="h-full overflow-auto px-4 py-4 bg-[#f8fafc]"
                style={{ scrollBehavior: "smooth" }}
              >
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">开始提问吧～</div>
                )}
                {messages.map(renderBubble)}
                {loading && (
                  <div className="text-center text-sm text-gray-500 py-2">思考中...</div>
                )}
              </div>

              <div className="border-t border-[var(--border)] p-3 bg-white">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    className="input flex-1"
                    placeholder="输入您的问题..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button className="btn btn-primary" onClick={handleSend} disabled={loading}>
                    <FiSend />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
