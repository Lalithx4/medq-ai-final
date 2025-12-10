import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { WordConverter } from "@/lib/research-paper/word-converter";

export async function POST(req: NextRequest) {
  try {
    const { format, markdown, title } = (await req.json()) as {
      format: "pdf" | "docx";
      markdown: string;
      title?: string;
    };

    if (!markdown || !markdown.trim()) {
      return NextResponse.json(
        { error: "Markdown content is required for export" },
        { status: 400 },
      );
    }

    const safeTitle = (title || "personal-statement").slice(0, 80);

    if (format === "docx") {
      const buffer = await WordConverter.convertToWord(markdown, safeTitle);
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: new Headers({
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            safeTitle,
          )}.docx"`,
        }),
      });
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pageWidth = 612;
    const pageHeight = 792;
    const bodyFontSize = 12;
    const marginX = 50;
    const marginTop = 60;
    const lineHeight = 16;

    const lines = markdown.split(/\r?\n/);

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - marginTop;

    for (const rawLine of lines) {
      let text = rawLine.trim();
      if (!text) {
        y -= lineHeight;
        continue;
      }

      // Simple markdown cleanup
      text = text.replace(/^#{1,6}\s+/, "");
      text = text.replace(/^[-*•+]\s+/, "• ");
      text = text.replace(/\*\*(.+?)\*\*/g, "$1");
      text = text.replace(/\*(.+?)\*/g, "$1");
      text = text.replace(/__(.+?)__/g, "$1");

      if (y < marginTop + lineHeight) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - marginTop;
      }

      page.drawText(text, {
        x: marginX,
        y,
        size: bodyFontSize,
        font,
      });
      y -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();
    const pdfArrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    );

    return new NextResponse(pdfArrayBuffer, {
      status: 200,
      headers: new Headers({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          safeTitle,
        )}.pdf"`,
      }),
    });
  } catch (error) {
    console.error("[PersonalStatement] Export error", error);
    return NextResponse.json(
      {
        error: "Failed to export personal statement",
      },
      { status: 500 },
    );
  }
}
