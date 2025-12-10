import { NextRequest, NextResponse } from "next/server";
import { DeepResearchAgent } from "@/lib/deep-research/langchain-agent";
import { FileService } from "@/lib/deep-research/file-service";
import { db } from "@/server/db";
import { env } from "@/env";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log(`🔬 Starting deep research for: ${query}`);

    // Initialize services
    const agent = new DeepResearchAgent(
      env.CEREBRAS_API_KEY || "",
      (progress) => {
        console.log(`📊 ${progress.phase}: ${progress.progress}% - ${progress.message}`);
      }
    );
    const fileService = new FileService();

    // Generate research report
    const result = await agent.generateReport(query);

    // Save markdown file
    const filePath = await fileService.saveMarkdownFile(
      user.id,
      query,
      result.markdown
    );

    // Convert to plain text for display
    const plainText = fileService.markdownToPlainText(result.markdown);

    // Save to database
    const report = await db.deepResearchReport.create({
      data: {
        userId: user.id,
        topic: query,
        status: "completed",
        filePath,
        markdown: result.markdown,
        pmidsUsed: result.pmids,
        wordCount: result.wordCount,
        referenceCount: result.pmids.length,
      },
    });

    console.log(`✅ Research completed: ${report.id}`);

    // Format sources for frontend
    const sources = result.pmids.map((pmid: string) => {
      const meta = result.metadata[pmid];
      return {
        title: meta?.title || "Research Article",
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        snippet: `${meta?.authors || "Authors"}. ${meta?.journal || "Journal"}. ${meta?.year || "2024"}.`,
      };
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      report: plainText.substring(0, 1000) + "...", // Preview
      fullReport: result.markdown,
      sources,
      wordCount: result.wordCount,
      pmidCount: result.pmids.length,
    });
  } catch (error) {
    console.error("Error conducting deep research:", error);
    return NextResponse.json(
      { 
        error: "Failed to conduct deep research",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
