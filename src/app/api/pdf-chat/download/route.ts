import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { simpleSlidesToPptx } from "@/lib/slide-composer/html-to-pptx";
import { WordConverter } from "@/lib/research-paper/word-converter";

interface SimpleSlide {
  title: string;
  markdown: string;
}

function parseSlideOutline(markdown: string): SimpleSlide[] {
  // Very lightweight parser: split on lines starting with "## Slide"
  const lines = markdown.split(/\r?\n/);
  const slides: SimpleSlide[] = [];
  let current: SimpleSlide | null = null;

  for (const line of lines) {
    const slideMatch = /^##\s+Slide\s+\d+\s*:\s*(.+)$/i.exec(line.trim());
    if (slideMatch) {
      if (current) slides.push(current);
      const title = (slideMatch[1] || "Slide").trim();
      current = { title, markdown: "" };
    } else if (current) {
      current.markdown += (current.markdown ? "\n" : "") + line;
    }
  }
  if (current) slides.push(current);

  if (!slides.length) {
    // Fallback: treat whole markdown as a single slide
    slides.push({ title: "Summary", markdown });
  }
  return slides;
}

async function markdownToSimplePdf(markdown: string, title: string): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 56; // ~0.8in
  const marginTop = 64;
  const titleFontSize = 20;
  const bodyFontSize = 12;
  const lineHeight = 16;
  const maxTextWidth = pageWidth - 2 * marginX;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop;

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

  const ensurePage = () => {
    if (y < marginTop + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - marginTop;
    }
  };

  // Title at top
  const titleText = (title || "Summary").trim();
  const titleWidth = font.widthOfTextAtSize(titleText, titleFontSize);
  const titleX = Math.max(marginX, (pageWidth - titleWidth) / 2);
  page.drawText(titleText, {
    x: titleX,
    y,
    size: titleFontSize,
    font,
  });
  y -= 2 * lineHeight;

  const lines = markdown.split(/\r?\n/);

  for (const rawLine of lines) {
    let text = rawLine.trim();
    if (!text) {
      y -= lineHeight;
      continue;
    }

    // Basic markdown cleanup
    text = text.replace(/^#{1,6}\s+/, "");
    text = text.replace(/^[-*•+]\s+/, "• ");
    text = text.replace(/\*\*(.+?)\*\*/g, "$1");
    text = text.replace(/\*(.+?)\*/g, "$1");
    text = text.replace(/__(.+?)__/g, "$1");

    if (!text) continue;

    const wrappedLines = wrapText(text, bodyFontSize);
    for (const line of wrappedLines) {
      ensurePage();
      page.drawText(line, {
        x: marginX,
        y,
        size: bodyFontSize,
        font,
      });
      y -= lineHeight;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const messageId = searchParams.get("messageId");
    const format = searchParams.get("format") || "pdf";

    if (!sessionId || !messageId) {
      return NextResponse.json(
        { error: "sessionId and messageId are required" },
        { status: 400 },
      );
    }

    if (!["pdf", "pptx", "docx"].includes(format)) {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    // Verify session ownership
    const { data: session, error: sessionError } = await supabase
      .from("pdf_chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    // Load message and ensure it belongs to the session
    const { data: message, error: msgError } = await supabase
      .from("pdf_chat_messages")
      .select("*")
      .eq("id", messageId)
      .eq("session_id", sessionId)
      .single();

    if (msgError || !message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 },
      );
    }

    const content: string = message.content || "";
    const safeTitle = `pdf-chat-${sessionId.slice(0, 8)}`;

    if (format === "pptx") {
      const slides = parseSlideOutline(content);
      const arrayBuffer = await simpleSlidesToPptx(slides);

      return new NextResponse(arrayBuffer as ArrayBuffer, {
        status: 200,
        headers: new Headers({
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            safeTitle,
          )}.pptx"`,
        }),
      });
    }

    if (format === "docx") {
      const buffer = await WordConverter.convertToWord(content, safeTitle || "summary");
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
            safeTitle,
          )}.docx"`,
        }),
      });
    }

    // Default: simple PDF summary export
    const pdfBuffer = await markdownToSimplePdf(content, "Summary");

    return new NextResponse(pdfBuffer as ArrayBuffer, {
      status: 200,
      headers: new Headers({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          safeTitle,
        )}.pdf"`,
      }),
    });
  } catch (error) {
    console.error("[PDF Chat] Download error", error);
    return NextResponse.json(
      { error: "Failed to generate download" },
      { status: 500 },
    );
  }
}
