import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getServerSupabase } from "@/lib/supabase/server";
import { WordConverter } from "@/lib/research-paper/word-converter";

interface ExportBody {
  format: "pdf" | "docx";
  sessionId?: string;
  content: string;
}

async function articleMarkdownToPdf(markdown: string, title: string): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 612; // 8.5in * 72
  const pageHeight = 792; // 11in * 72
  const marginX = 56;
  const marginTop = 64;
  const titleFontSize = 20;
  const headingFontSize = 14;
  const bodyFontSize = 11;
  const lineHeight = 14;
  const maxTextWidth = pageWidth - 2 * marginX;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop;

  const ensurePage = () => {
    if (y < marginTop + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - marginTop;
    }
  };

  const wrapText = (text: string, size: number): string[] => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const tentative = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(tentative, size);
      if (width > maxTextWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = tentative;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [text];
  };

  // Title from first markdown heading if present
  const lines = markdown.split(/\r?\n/);
  let usedTitle = title;
  for (const raw of lines) {
    const m = /^#\s+(.+)$/.exec(raw.trim());
    if (m?.[1]) {
      usedTitle = m[1].trim();
      break;
    }
  }

  // Main title
  const titleText = (usedTitle || title || "Research Article").trim();
  const titleWidth = font.widthOfTextAtSize(titleText, titleFontSize);
  const titleX = Math.max(marginX, (pageWidth - titleWidth) / 2);
  page.drawText(titleText, {
    x: titleX,
    y,
    size: titleFontSize,
    font,
  });
  y -= 2 * lineHeight;

  for (const raw of lines) {
    let text = raw.trim();
    if (!text) {
      y -= lineHeight;
      continue;
    }

    const isHeading = /^#{1,6}\s+/.test(text);

    // Basic markdown cleanup for body/headings
    text = text.replace(/^#{1,6}\s+/, "");
    text = text.replace(/^[-*•+]\s+/, "• ");
    text = text.replace(/\*\*(.+?)\*\*/g, "$1");
    text = text.replace(/\*(.+?)\*/g, "$1");
    text = text.replace(/__(.+?)__/g, "$1");

    if (!text) continue;

    const size = isHeading ? headingFontSize : bodyFontSize;
    const wrapped = wrapText(text, size);
    for (const line of wrapped) {
      ensurePage();
      page.drawText(line, {
        x: marginX,
        y,
        size,
        font,
      });
      y -= lineHeight;
    }

    if (isHeading) {
      y -= lineHeight / 2;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ExportBody;
    const { format, sessionId, content } = body;

    if (!format) {
      return NextResponse.json({ error: "format is required" }, { status: 400 });
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    if (sessionId) {
      const { data: session } = await supabase
        .from("pdf_chat_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
    }

    const sessionPrefix = typeof sessionId === "string" ? sessionId.slice(0, 8) : "article";
    const baseTitle = (`article-${sessionPrefix}`).slice(0, 80);

    if (format === "docx") {
      const buffer = await WordConverter.convertToWord(content, baseTitle || "article");
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;

      return new NextResponse(arrayBuffer as ArrayBuffer, {
        status: 200,
        headers: new Headers({
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            baseTitle || "article",
          )}.docx"`,
        }),
      });
    }

    const pdfBuffer = await articleMarkdownToPdf(content, baseTitle || "Research Article");

    return new NextResponse(pdfBuffer as ArrayBuffer, {
      status: 200,
      headers: new Headers({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          baseTitle || "article",
        )}.pdf"`,
      }),
    });
  } catch (error) {
    console.error("[PDF Article Export] Error", error);
    return NextResponse.json(
      { error: "Failed to export article" },
      { status: 500 },
    );
  }
}
