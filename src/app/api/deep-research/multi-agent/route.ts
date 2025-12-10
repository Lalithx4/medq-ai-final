import { NextRequest, NextResponse } from "next/server";
import { MultiAgentResearchService } from "@/lib/deep-research/multi-agent-research";
import { getServerSupabase } from "@/lib/supabase/server";

export const maxDuration = 300; // 5 minutes
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, topK = 5, nSections = 5 } = await req.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "Topic is required and must be a string" },
        { status: 400 }
      );
    }

    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "CEREBRAS_API_KEY not configured" },
        { status: 500 }
      );
    }

    console.log(`Starting multi-agent research for: ${topic}`);
    console.log(`Config: ${topK} papers per section, ${nSections} sections`);

    const service = new MultiAgentResearchService(apiKey);

    const report = await service.generateReport({
      topic,
      topK,
      nSections,
      onProgress: (message, progress) => {
        console.log(`[${progress}%] ${message}`);
      },
    });

    // Format as markdown
    const markdown = MultiAgentResearchService.formatAsMarkdown(report);

    console.log(`✓ Research complete: ${report.metadata.wordCount} words, ${report.metadata.paperCount} papers`);

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        markdown,
      },
    });
  } catch (error) {
    console.error("Error generating multi-agent research:", error);
    return NextResponse.json(
      {
        error: "Failed to generate research",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
