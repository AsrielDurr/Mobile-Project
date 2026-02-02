import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

/**
 * 将业务报告导出为 Word
 * @param {string} content AI 生成的深度报告文本
 * @param {string} fileName 文件名
 */
export const exportBusinessWord = async (content, fileName = "业务深度分析报告") => {
    const lines = content.split('\n');

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
                // 遍历行生成内容
                ...lines.map(line => {
                    const cleanLine = line.trim();
                    if (!cleanLine) return new Paragraph({ text: "" });

                    // 简单模拟 Markdown 标题识别
                    const isHeading = cleanLine.includes("一、") || cleanLine.includes("二、") ||
                        cleanLine.includes("三、") || cleanLine.includes("四、");

                    return new Paragraph({
                        children: [
                            new TextRun({
                                text: cleanLine,
                                bold: isHeading,
                                size: isHeading ? 28 : 24, // 标题稍大
                            }),
                        ],
                        spacing: { before: 200, after: 120 },
                        alignment: isHeading ? AlignmentType.LEFT : AlignmentType.BOTH,
                    });
                }),
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