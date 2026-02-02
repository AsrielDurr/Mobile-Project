// src/api/relationLabels.js
const BASE_URL = "http://localhost:8080/api/relation-labels";

async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "请求失败");
    }
    return res.json();
}

export async function getRelationLabels() {
    const res = await fetch(BASE_URL);
    const json = await handleResponse(res);
    return json.data;
}

export async function getRelationLabel(id) {
    const res = await fetch(`${BASE_URL}/${id}`);
    const json = await handleResponse(res);
    return json.data;
}

export async function createRelationLabel(data) {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    const json = await handleResponse(res);
    return json.data;
}

export async function updateRelationLabel(data) {
    const res = await fetch(BASE_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    const json = await handleResponse(res);
    return json.data;
}

export async function deleteRelationLabel(id) {
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
    const json = await handleResponse(res);
    return json.data;
}
