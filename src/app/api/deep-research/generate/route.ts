import { NextRequest, NextResponse } from "next/server";
import { MultiAgentResearchService } from "@/lib/deep-research/multi-agent-research";
import { FileService } from "@/lib/deep-research/file-service";
import { db } from "@/server/db";
import { env } from "@/env";
import { getServerSupabase } from "@/lib/supabase/server";
import { CreditService } from "@/lib/credits/credit-service";
import { generateId } from "ai";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Increased for comprehensive research (10 papers × 5 sections = 50 papers before deduplication)
    const { query, topK = 10, nSections = 5 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Check credits before processing
    const hasCredits = await CreditService.hasEnoughCredits(user.id, "deep_research");
    if (!hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits. Deep research requires 20 credits." },
        { status: 402 }
      );
    }

    console.log(`🔬 Starting multi-agent deep research for: ${query}`);
    console.log(`📊 Config: ${topK} papers per section, ${nSections} sections`);

    // Initialize services
    const service = new MultiAgentResearchService(env.CEREBRAS_API_KEY || "");
    const fileService = new FileService();

    // Generate research report with multi-agent system
    const report = await service.generateReport({
      topic: query,
      topK,
      nSections,
      onProgress: (message, progress) => {
        console.log(`[${progress}%] ${message}`);
      },
    });

    // Format as markdown
    const markdown = MultiAgentResearchService.formatAsMarkdown(report);
    
    const result = {
      markdown,
      cleanedTopic: query,
      wordCount: report.metadata.wordCount,
      paperCount: report.metadata.paperCount,
    };

    // Use cleaned topic for file name and database
    const cleanedTopic = result.cleanedTopic || query;

    // Extract PMIDs from report
    const pmids = report.sections.flatMap(s => s.papers.map(p => p.pmid)).filter(Boolean);

    console.log(`[85%] 📝 Saving to database...`);
    
    // Save to database (skip Supabase storage which doesn't exist)
    const now = new Date();
    const dbReport = await db.deepResearchReport.create({
      data: {
        id: generateId(),
        userId: user.id,
        topic: cleanedTopic,
        status: "completed",
        filePath: `deep-research/${user.id}/${cleanedTopic}`,
        markdown: result.markdown,
        pmidsUsed: pmids,
        wordCount: result.wordCount,
        referenceCount: pmids.length,
        createdAt: now,
        updatedAt: now,
      },
    });

    console.log(`✅ Research completed: ${dbReport.id}`);
    console.log(`✅ ${result.wordCount} words, ${result.paperCount} papers cited`);

    // Deduct credits after successful generation
    await CreditService.deductCredits(
      user.id,
      "deep_research",
      `Deep research: ${query}`
    );

    // Format sources for frontend
    const sources = report.sections.flatMap(s => 
      s.papers.map(p => ({
        title: p.title,
        url: `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`,
        snippet: p.abstract.slice(0, 200) + "...",
      }))
    );

    console.log(`[100%] ✓ Research article complete and saved!`);

    return NextResponse.json({
      success: true,
      reportId: dbReport.id,
      markdown: result.markdown,
      wordCount: result.wordCount,
      paperCount: result.paperCount,
      sources,
      metadata: report.metadata,
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
