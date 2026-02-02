// src/api/prompts.js
const BASE_URL = "http://localhost:8080/api/prompts";

async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "请求失败");
    }
    const json = await res.json();
    return json.data;
}

export async function getPrompts(taskType = "", model = "") {
    const params = new URLSearchParams();
    if (taskType) params.append("taskType", taskType);
    if (model) params.append("model", model);
    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    return handleResponse(res);
}


/**
 * 获取单个提示词
 */
export async function getPrompt(id) {
    if (!id) throw new Error("id required");
    const res = await fetch(`${BASE_URL}/${id}`);
    const json = await handleResponse(res);
    return json.data;
}

/**
 * 创建提示词
 * payload: { name, taskType, model, promptText, description }
 */
export async function createPrompt(payload) {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const json = await handleResponse(res);
    return json.data;
}

/**
 * 更新提示词
 * payload: { id, name, taskType, model, promptText, description }
 */
export async function updatePrompt(payload) {
    if (!payload.id) throw new Error("id required");
    const res = await fetch(BASE_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const json = await handleResponse(res);
    return json.data;
}

/**
 * 删除提示词
 */
export async function deletePrompt(id) {
    if (!id) throw new Error("id required");
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
    const json = await handleResponse(res);
    return json.data;
}

/**
 * 激活提示词
 */
export async function activatePrompt(id) {
    if (!id) throw new Error("id required");
    const res = await fetch(`${BASE_URL}/${id}/activate`, { method: "POST" });
    const json = await handleResponse(res);
    return json.data;
}

/**
 * 停用提示词
 */
export async function deactivatePrompt(id) {
    if (!id) throw new Error("id required");
    const res = await fetch(`${BASE_URL}/${id}/deactivate`, { method: "POST" });
    const json = await handleResponse(res);
    return json.data;
}
