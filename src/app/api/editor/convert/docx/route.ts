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

    // Create properly formatted HTML for DOCX conversion
    const formattedHTML = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: 8.5in 11in;
      margin: 1in;
    }
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000000;
    }
    h1 {
      font-size: 24pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 24pt;
      color: #000000;
      page-break-after: avoid;
    }
    h2 {
      font-size: 18pt;
      font-weight: bold;
      margin-top: 18pt;
      margin-bottom: 12pt;
      color: #000000;
      page-break-after: avoid;
    }
    h3 {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 6pt;
      color: #000000;
      page-break-after: avoid;
    }
    p {
      text-align: justify;
      margin-bottom: 12pt;
      text-indent: 0;
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
      margin-left: 0.5in;
      margin-right: 0.5in;
      font-style: italic;
      border-left: 3px solid #ccc;
      padding-left: 12pt;
      margin-top: 12pt;
      margin-bottom: 12pt;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 12pt;
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
      border-radius: 3pt;
    }
    pre {
      font-family: 'Courier New', monospace;
      background-color: #f5f5f5;
      padding: 12pt;
      border-radius: 3pt;
      overflow-x: auto;
      margin-bottom: 12pt;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${content}
</body>
</html>
    `;

    // Create blob with proper MIME type for Word
    const buffer = Buffer.from(formattedHTML, 'utf-8');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_')}.docx"`,
      },
    });
  } catch (error) {
    console.error('Error converting to DOCX:', error);
    return NextResponse.json(
      { error: 'Failed to convert to DOCX' },
      { status: 500 }
    );
  }
}
