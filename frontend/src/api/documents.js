const BASE_URL = "http://localhost:8080/api/documents";

async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "请求失败");
    }
    return res.json();
}

export async function getDocuments() {
    const res = await fetch(BASE_URL);
    return handleResponse(res);
}

export async function getDocument(id) {
    const res = await fetch(`${BASE_URL}/${id}`);
    return handleResponse(res);
}

export async function createDocument(data) {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function updateDocument(id, data) {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function deleteDocument(id) {
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "删除失败");
    }

    // 后端 DELETE 通常没有返回内容，所以不再解析 res.json()
    return true;
}

