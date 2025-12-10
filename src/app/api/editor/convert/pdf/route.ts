import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, content } = await req.json();

    // Create properly formatted HTML for PDF conversion
    const formattedHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 1in;
    }
    body {
      font-family: 'Times New Roman', 'Georgia', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000000;
    }
    h1 {
      font-size: 24pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 24pt;
      page-break-after: avoid;
    }
    h2 {
      font-size: 18pt;
      font-weight: bold;
      margin-top: 18pt;
      margin-bottom: 12pt;
      page-break-after: avoid;
    }
    h3 {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 6pt;
      page-break-after: avoid;
    }
    p {
      text-align: justify;
      margin-bottom: 12pt;
      orphans: 3;
      widows: 3;
    }
    ul, ol {
      margin-left: 0.5in;
      margin-bottom: 12pt;
    }
    li {
      margin-bottom: 6pt;
    }
    strong, b {
      font-weight: bold;
    }
    em, i {
      font-style: italic;
    }
    u {
      text-decoration: underline;
    }
    blockquote {
      margin: 12pt 0.5in;
      font-style: italic;
      border-left: 3px solid #000;
      padding-left: 12pt;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 12pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #000;
      padding: 6pt;
      text-align: left;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    code {
      font-family: 'Courier New', monospace;
      background-color: #f5f5f5;
      padding: 2pt 4pt;
    }
    pre {
      font-family: 'Courier New', monospace;
      background-color: #f5f5f5;
      padding: 12pt;
      overflow-x: auto;
      margin-bottom: 12pt;
      page-break-inside: avoid;
    }
    @media print {
      body {
        background: white;
      }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${content}
</body>
</html>
    `;

    // Return HTML that can be printed to PDF by the browser
    const buffer = Buffer.from(formattedHTML, 'utf-8');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${title.replace(/[^a-z0-9]/gi, '_')}.html"`,
      },
    });
  } catch (error) {
    console.error('Error converting to PDF:', error);
    return NextResponse.json(
      { error: 'Failed to convert to PDF' },
      { status: 500 }
    );
  }
}
