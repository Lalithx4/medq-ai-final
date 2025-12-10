import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Get user from database
    const dbUser = await db.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Try to fetch from document table first
    const document = await db.document.findFirst({
      where: {
        id,
        userId: dbUser.id,
      },
    });

    if (document) {
      return NextResponse.json({
        success: true,
        id: document.id,
        title: document.title,
        content: document.content,
        type: document.type,
        sources: document.sources ? JSON.parse(document.sources as string) : null,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      });
    }

    // If not found, try research reports table
    const researchReport = await db.deepResearchReport.findFirst({
      where: {
        id,
        userId: dbUser.id,
      },
    });

    if (researchReport) {
      return NextResponse.json({
        success: true,
        id: researchReport.id,
        title: researchReport.topic,
        content: researchReport.markdown,
        type: "research-paper",
        sources: researchReport.pmidsUsed || [],
        wordCount: researchReport.wordCount,
        referenceCount: researchReport.referenceCount,
        createdAt: researchReport.createdAt.toISOString(),
        updatedAt: researchReport.updatedAt.toISOString(),
      });
    }

    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}
