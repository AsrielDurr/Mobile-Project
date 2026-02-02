// src/api/kgNodes.js

const BASE_URL = "http://localhost:8080/api/kg";

async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "请求失败");
    }
    return res.json();
}

export async function getNodesByDocument(docId) {
    const res = await fetch(`${BASE_URL}/nodes/document/${docId}`);
    return handleResponse(res);
}

export async function createNode(data) {
    const res = await fetch(`${BASE_URL}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function updateNode(id, data) {
    const res = await fetch(`${BASE_URL}/nodes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function deleteNode(id) {
    const res = await fetch(`${BASE_URL}/nodes/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "删除失败");
    }
    return true;
}
