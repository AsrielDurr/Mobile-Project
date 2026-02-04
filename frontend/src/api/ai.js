const AI_BASE_URL = "http://localhost:8080/api/ai";

async function handleResponse(res) {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "AI 提取失败");
    }
    // 如果后端返回的是纯字符串 "Success" 而不是 JSON 对象，
    // 需要根据后端 @ResponseEntity 的内容调整
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return res.json();
    }
    return res.text();
}

/**
 * 触发 AI 自动提取并保存实体
 * @param {number|string} documentId
 */
export async function autoExtractEntities(documentId) {
    const res = await fetch(`${AI_BASE_URL}/extract/${documentId}`, {
        method: "POST",
    });
    return handleResponse(res);
}

// 新增：CSV 数据关联分析接口
export async function analyzeCsvData(documentId, files = [], options = {}) {
    const res = await fetch(`${AI_BASE_URL}/analyze-csv/${documentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
        signal: options.signal,
    });
    return handleResponse(res);
}

// 获取可用 CSV 文件列表
export async function listCsvFiles() {
    const res = await fetch(`${AI_BASE_URL}/csv-files`, {
        method: "GET",
    });
    return handleResponse(res);
}

export async function getEnhancedBusinessReport(rawAnalysis) {
    const res = await fetch(`http://localhost:8080/api/ai/generate-business-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawAnalysis }) // 后端记得用 Map 或 DTO 接收
    });
    return res.text();
}
