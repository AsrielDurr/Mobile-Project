// src/api/kgEdges.js

const BASE_URL = "http://localhost:8080/api/kg";

async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "请求失败");
    }
    return res.json();
}

export async function getEdgesByDocument(docId) {
    const res = await fetch(`${BASE_URL}/edges/document/${docId}`);
    return handleResponse(res);
}

export async function createEdge(data) {
    const res = await fetch(`${BASE_URL}/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function updateEdge(id, data) {
    const res = await fetch(`${BASE_URL}/edges/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function deleteEdge(id) {
    const res = await fetch(`${BASE_URL}/edges/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "删除失败");
    }
    return true;
}
