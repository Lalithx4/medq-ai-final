import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { FileService } from "@/lib/deep-research/file-service";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = await context.params;

    // Get report from database
    const report = await db.deepResearchReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check ownership
    if (report.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Return markdown file for download
    const filename = `deep_research_${report.topic.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
    
    return new NextResponse(report.markdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error downloading report:", error);
    return NextResponse.json(
      { error: "Failed to download report" },
      { status: 500 }
    );
  }
}
