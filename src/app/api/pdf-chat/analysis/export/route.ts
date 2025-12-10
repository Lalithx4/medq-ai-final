import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getServerSupabase } from "@/lib/supabase/server";

interface AnalysisTable {
  title: string;
  description?: string;
  columns: string[];
  rows: (string | number | null)[][];
}

interface ExportRequestBody {
  format: "pdf" | "csv";
  sessionId?: string;
  summaryMarkdown?: string;
  tables?: AnalysisTable[];
  tableIndex?: number;
}

function tableToCsv(table: AnalysisTable): string {
  const escape = (value: unknown): string => {
    if (value == null) return "";
    const s = String(value);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const header = table.columns.map(escape).join(",");
  const rows = table.rows.map((row) => row.map(escape).join(","));
  return [header, ...rows].join("\n");
}

async function analysisToPdf(summaryMarkdown: string | undefined, tables: AnalysisTable[]): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 612; // 8.5in * 72
  const pageHeight = 792; // 11in * 72
  const marginX = 56;
  const marginTop = 64;
  const titleFontSize = 20;
  const sectionFontSize = 14;
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

  const writeWrapped = (text: string, size: number) => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      y -= lineHeight;
      return;
    }
    const words = cleaned.split(/\s+/);
    let current = "";
    for (const word of words) {
      const tentative = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(tentative, size);
      if (width > maxTextWidth && current) {
        ensurePage();
        page.drawText(current, { x: marginX, y, size, font });
        y -= lineHeight;
        current = word;
      } else {
        current = tentative;
      }
    }
    if (current) {
      ensurePage();
      page.drawText(current, { x: marginX, y, size, font });
      y -= lineHeight;
    }
  };

  // Title
  writeWrapped("Clinical Data Analysis Report", titleFontSize);
  y -= lineHeight / 2;

  if (summaryMarkdown) {
    writeWrapped("Summary", sectionFontSize);
    y -= lineHeight / 2;

    const lines = summaryMarkdown.split(/\r?\n/);
    for (const raw of lines) {
      let text = raw.trim();
      if (!text) {
        y -= lineHeight;
        continue;
      }
      // light markdown cleanup
      text = text.replace(/^#{1,6}\s+/, "");
      text = text.replace(/^[-*•+]\s+/, "• ");
      text = text.replace(/\*\*(.+?)\*\*/g, "$1");
      text = text.replace(/\*(.+?)\*/g, "$1");
      text = text.replace(/__(.+?)__/g, "$1");
      writeWrapped(text, bodyFontSize);
    }

    y -= lineHeight;
  }

  if (tables.length) {
    for (const table of tables) {
      writeWrapped(table.title || "Table", sectionFontSize);
      if (table.description) {
        writeWrapped(table.description, bodyFontSize);
      }
      y -= lineHeight / 2;

      // Header row
      writeWrapped(table.columns.join("  |  "), bodyFontSize);

      for (const row of table.rows) {
        const line = row
          .map((cell) => (cell == null ? "" : String(cell)))
          .join("  |  ");
        writeWrapped(line, bodyFontSize);
      }

      y -= lineHeight;
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

    const body = (await request.json()) as ExportRequestBody;
    const { format, sessionId, summaryMarkdown, tables, tableIndex } = body;

    if (!format) {
      return NextResponse.json({ error: "format is required" }, { status: 400 });
    }

    // Optional: basic session ownership check to avoid obviously invalid exports
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

    if (format === "csv") {
      if (!tables || !Array.isArray(tables) || !tables.length) {
        return NextResponse.json({ error: "tables are required" }, { status: 400 });
      }
      if (typeof tableIndex !== "number" || tableIndex < 0 || tableIndex >= tables.length) {
        return NextResponse.json({ error: "Valid tableIndex is required for CSV export" }, { status: 400 });
      }

      const table = tables[tableIndex]!;
      const csv = tableToCsv(table);
      const filenameBase = (table.title || `table-${tableIndex + 1}`).slice(0, 80) || `table-${tableIndex + 1}`;

      return new NextResponse(csv, {
        status: 200,
        headers: new Headers({
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filenameBase)}.csv"`,
        }),
      });
    }

    // Default: PDF report with summary + all tables as separate sections (tables may be empty)
    const safeTables = Array.isArray(tables) ? tables : [];
    const pdfBuffer = await analysisToPdf(summaryMarkdown, safeTables);
    const safeTitle = (sessionId ? `analysis-${sessionId.slice(0, 8)}` : "analysis-report").slice(0, 80);

    return new NextResponse(pdfBuffer as ArrayBuffer, {
      status: 200,
      headers: new Headers({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeTitle)}.pdf"`,
      }),
    });
  } catch (error) {
    console.error("[PDF Analysis Export] Error", error);
    return NextResponse.json(
      { error: "Failed to export analysis" },
      { status: 500 },
    );
  }
}
