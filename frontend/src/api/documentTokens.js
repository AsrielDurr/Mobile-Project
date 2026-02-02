const BASE_URL = "http://localhost:8080/api/document-tokens";

async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "请求失败");
    }
    return res.json();
}

// 获取某个文档的 token 列表
export async function getDocumentTokensByDocument(docId) {
    const res = await fetch(`${BASE_URL}/document/${docId}`);
    return handleResponse(res);
}
