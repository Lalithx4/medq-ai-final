import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { WordConverter } from "@/lib/research-paper/word-converter";
import { simpleSlidesToPptx } from "@/lib/slide-composer/html-to-pptx";

// Simple in-memory representation we can map from SlideComposer slides
interface SimpleSlide {
  title: string;
  markdown: string;
}

function slidesToMarkdown(slides: SimpleSlide[]): string {
  return slides
    .map((slide, index) => {
      return [
        `# Slide ${index + 1}: ${slide.title}`,
        "",
        slide.markdown,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const { format, slides, title } = (await req.json()) as {
      format: "pptx" | "pdf" | "docx";
      slides: SimpleSlide[];
      title?: string;
    };

    if (!slides || !Array.isArray(slides) || !slides.length) {
      return NextResponse.json(
        { error: "Slides are required for export" },
        { status: 400 }
      );
    }

    const safeTitle = (title || slides[0]?.title || "presentation").slice(0, 80);

    if (format === "docx") {
      const markdown = slidesToMarkdown(slides);
      const buffer = await WordConverter.convertToWord(markdown, safeTitle);
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: new Headers({
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            safeTitle
          )}.docx"`,
        }),
      });
    }

    if (format === "pptx") {
      const arrayBuffer = await simpleSlidesToPptx(slides);
      return new NextResponse(arrayBuffer as ArrayBuffer, {
        status: 200,
        headers: new Headers({
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            safeTitle
          )}.pptx"`,
        }),
      });
    }

    // Simple real PDF using pdf-lib: one page per slide, title + body text.
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pageWidth = 612; // 8.5in * 72
    const pageHeight = 792; // 11in * 72

    const titleFontSize = 20;
    const bodyFontSize = 12;
    const marginX = 50;
    const marginTop = 60;
    const lineHeight = 16;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      const title = slide.title || `Slide ${i + 1}`;
      page.drawText(title, {
        x: marginX,
        y: pageHeight - marginTop,
        size: titleFontSize,
        font,
      });

      const markdown = slide.markdown || "";
      const lines = markdown.split(/\r?\n/).filter((l) => l.trim().length > 0);

      let y = pageHeight - marginTop - 2 * lineHeight;
      for (const rawLine of lines) {
        let text = rawLine.trim();

        // Very rough cleanup of markdown markers for readability.
        text = text.replace(/^#{1,6}\s+/, "");
        text = text.replace(/^[-*•+]\s+/, "• ");
        text = text.replace(/\*\*(.+?)\*\*/g, "$1");
        text = text.replace(/\*(.+?)\*/g, "$1");
        text = text.replace(/__(.+?)__/g, "$1");

        if (!text) continue;

        if (y < marginTop + lineHeight) {
          // New page if we run out of space.
          const nextPage = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - marginTop;
          nextPage.drawText(text, {
            x: marginX,
            y,
            size: bodyFontSize,
            font,
          });
          y -= lineHeight;
        } else {
          page.drawText(text, {
            x: marginX,
            y,
            size: bodyFontSize,
            font,
          });
          y -= lineHeight;
        }
      }
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
    console.error("[SlideComposer] Export error", error);
    return NextResponse.json(
      {
        error: "Failed to export presentation",
      },
      { status: 500 }
    );
  }
}
