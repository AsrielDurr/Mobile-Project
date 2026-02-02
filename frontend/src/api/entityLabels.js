const BASE_URL = "http://localhost:8080/api/entity-labels";

async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "请求失败");
    }
    return res.json();
}

// 获取单个标签
export async function getEntityLabel(id) {
    const res = await fetch(`${BASE_URL}/${id}`);
    return handleResponse(res);
}

// 获取所有标签
export async function getEntityLabels() {
    const res = await fetch(BASE_URL);
    return handleResponse(res);
}

// 创建标签
export async function createEntityLabel(data) {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

// 更新标签
export async function updateEntityLabel(id, data) {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse(res);
}

// 删除标签
export async function deleteEntityLabel(id) {
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) {
        throw new Error(`删除标签失败: ${res.status}`);
    }
    return true;
}

