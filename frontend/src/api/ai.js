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
export async function analyzeCsvData(documentId) {
    const res = await fetch(`${AI_BASE_URL}/analyze-csv/${documentId}`, {
        method: "POST",
    });
    return handleResponse(res);
}

// 修改参数，增加 documentId
export async function getEnhancedBusinessReport(documentId, rawAnalysis) {
    const res = await fetch(`http://localhost:8080/api/ai/generate-business-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            documentId: documentId, // 👈 必须带上这个 ID
            rawAnalysis: rawAnalysis
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "生成深度报告失败");
    }

    return res.text();
}