import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    console.log("📂 [FILES/LIST] Fetching files...");
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      console.log("❌ [FILES/LIST] Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ [FILES/LIST] User authenticated:", user.email);

    // Get user from database (graceful fallback when DB is unavailable)
    let dbUser: { id: string } | null = null;
    try {
      dbUser = await db.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      });
    } catch (e) {
      console.warn("⚠️ [FILES/LIST] DB unavailable, returning empty list.", e);
      return NextResponse.json({ success: true, files: [] });
    }

    if (!dbUser) {
      console.log("❌ [FILES/LIST] User not found in database");
      return NextResponse.json({ success: true, files: [] });
    }

    console.log("✅ [FILES/LIST] User found:", dbUser.id);

    // Fetch all documents for the user
    let documents: { id: string; title: string | null; type: string; createdAt: Date }[] = [];
    try {
      documents = await db.document.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          type: true,
          createdAt: true,
        },
      });
    } catch (e) {
      console.warn("⚠️ [FILES/LIST] DB unavailable while fetching documents, using empty list.", e);
    }

    console.log(`📄 [FILES/LIST] Found ${documents.length} documents`);

    // Fetch research papers/deep research reports
    let researchReports: { id: string; topic: string; createdAt: Date; wordCount: number | null; referenceCount: number | null }[] = [];
    try {
      researchReports = await db.deepResearchReport.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          topic: true,
          createdAt: true,
          wordCount: true,
          referenceCount: true,
        },
      });
    } catch (e) {
      console.warn("⚠️ [FILES/LIST] DB unavailable while fetching research reports, using empty list.", e);
    }

    console.log(`🔬 [FILES/LIST] Found ${researchReports.length} research reports`);

    // Combine and format all files
    const documentFiles = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      createdAt: doc.createdAt.toISOString(),
      size: "~50 KB",
    }));

    const researchFiles = researchReports.map((report) => ({
      id: report.id,
      title: report.topic,
      type: "research-paper" as const,
      createdAt: report.createdAt.toISOString(),
      size: report.wordCount ? `~${Math.round(report.wordCount / 200)} KB` : "~50 KB",
      wordCount: report.wordCount,
      referenceCount: report.referenceCount,
    }));

    const files = [...documentFiles, ...researchFiles].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log(`✅ [FILES/LIST] Returning ${files.length} total files`);

    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error("Error fetching files:", error);
    // Final catch-all: don't break the UI if something else fails
    return NextResponse.json({ success: true, files: [] });
  }
}
