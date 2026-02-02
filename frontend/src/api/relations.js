// src/api/relations.js
const BASE_URL = "http://localhost:8080/api/relations";

async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "请求失败");
    }
    return res.json();
}

/**
 * 返回 data（Controller 使用 ApiResponse 包装）
 */
export async function getRelationsByDocument(documentId) {
    if (!documentId) throw new Error("documentId required");
    const res = await fetch(`${BASE_URL}/document/${documentId}`);
    const json = await handleResponse(res);
    return json.data;
}

export async function getRelation(id) {
    const res = await fetch(`${BASE_URL}/${id}`);
    const json = await handleResponse(res);
    return json.data;
}

export async function createRelation(payload) {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const json = await handleResponse(res);
    return json.data;
}

export async function updateRelation(payload) {
    const res = await fetch(BASE_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const json = await handleResponse(res);
    return json.data;
}

export async function deleteRelation(id) {
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
    const json = await handleResponse(res);
    return json.data;
}
