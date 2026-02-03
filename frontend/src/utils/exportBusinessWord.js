import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

function parseInlineMarkdown(text) {
    const runs = [];
    let i = 0;
    while (i < text.length) {
        if (text[i] === "*" && text[i + 1] === "*") {
            const end = text.indexOf("**", i + 2);
            if (end !== -1) {
                const boldText = text.slice(i + 2, end);
                if (boldText) runs.push(new TextRun({ text: boldText, bold: true }));
                i = end + 2;
                continue;
            }
        }
        const nextBold = text.indexOf("**", i);
        const chunk = nextBold === -1 ? text.slice(i) : text.slice(i, nextBold);
        if (chunk) runs.push(new TextRun({ text: chunk }));
        if (nextBold === -1) break;
        i = nextBold;
    }
    return runs.length ? runs : [new TextRun({ text })];
}

function markdownLineToParagraph(line) {
    const clean = line.trim();
    if (!clean) return new Paragraph({ text: "" });

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(clean)) {
        return new Paragraph({ text: "" });
    }

    // Headings
    const headingMatch = clean.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const headingLevel =
            level === 1
                ? HeadingLevel.HEADING_1
                : level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3;
        return new Paragraph({
            heading: headingLevel,
            children: parseInlineMarkdown(text),
            spacing: { before: 240, after: 120 },
        });
    }

    // Unordered list
    const ulMatch = clean.match(/^[-*+]\s+(.*)$/);
    if (ulMatch) {
        return new Paragraph({
            children: parseInlineMarkdown(ulMatch[1].trim()),
            bullet: { level: 0 },
            spacing: { before: 80, after: 80 },
        });
    }

    // Ordered list (keep as normal paragraph but strip marker)
    const olMatch = clean.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
        return new Paragraph({
            children: parseInlineMarkdown(olMatch[1].trim()),
            spacing: { before: 80, after: 80 },
        });
    }

    // Default paragraph
    return new Paragraph({
        children: parseInlineMarkdown(clean),
        spacing: { before: 120, after: 120 },
        alignment: AlignmentType.BOTH,
    });
}

/**
 * 将业务报告导出为 Word
 * @param {string} content AI 生成的深度报告文本
 * @param {string} fileName 文件名
 */
export const exportBusinessWord = async (content, fileName = "业务深度分析报告") => {
    const lines = content.split("\n");

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                // 报告大标题
                new Paragraph({
                    text: "网格业务深度分析与指导指南",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                }),
                // 遍历行生成内容（Markdown 解析）
                ...lines.map((line) => markdownLineToParagraph(line)),
                // 落款
                new Paragraph({
                    children: [new TextRun({ text: `生成日期：${new Date().toLocaleDateString()}`, italic: true })],
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 400 },
                }),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
};
