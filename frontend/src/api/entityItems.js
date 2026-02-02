const BASE_URL = "http://localhost:8080/api/entity-items";

async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "请求失败");
    }

    // DELETE 返回 204，无内容
    if (res.status === 204) {
        return true;
    }

    return res.json();
}

export async function getEntityItemsByDocument(docId) {
    const res = await fetch(`${BASE_URL}/document/${docId}`);
    return handleResponse(res);
}

export async function createEntityItem(data) {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

export async function updateEntityItem(id, data) {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

// **关键更新：不解析 JSON**
export async function deleteEntityItem(id) {
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "删除失败");
    }

    return true; // 删除成功
}
