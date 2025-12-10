import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { LangChainPaperAgent } from "@/lib/research-paper/langchain-paper-agent";

export const maxDuration = 300; // 5 minutes
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { topic, topK = 10, nSections = 6 } = await req.json();

  if (!topic || typeof topic !== "string") {
    return new Response("Topic is required", { status: 400 });
  }

  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    return new Response("CEREBRAS_API_KEY not configured", { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      const safeEnqueue = (data: any) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          isClosed = true;
        }
      };
      const safeClose = () => {
        if (!isClosed) {
          try { controller.close(); } catch {}
          isClosed = true;
        }
      };
      
      try {
        const agent = new LangChainPaperAgent(apiKey);

        // Send initial message
        safeEnqueue({
          type: "start",
          message: "📝 Starting academic paper generation...",
          progress: 0,
        });

        const paper = await agent.generatePaper({
          topic,
          topK,
          nSections,
          onProgress: (message, progress) => {
            safeEnqueue({ type: "progress", message, progress });
          },
        });

        // Format as markdown
        const markdown = LangChainPaperAgent.formatAsMarkdown(paper);

        // Send metadata first
        safeEnqueue({ type: "metadata", metadata: paper.metadata });

        // Send markdown in smaller chunks with delays (avoid Railway proxy issues)
        const chunkSize = 8000; // 8KB chunks for Railway compatibility
        for (let i = 0; i < markdown.length; i += chunkSize) {
          const chunk = markdown.slice(i, i + chunkSize);
          const isLast = i + chunkSize >= markdown.length;
          safeEnqueue({ type: "markdown_chunk", chunk, isLast });
          // Small delay between chunks to prevent Railway proxy buffering issues
          if (!isLast) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }

        // Send complete signal
        safeEnqueue({
          type: "complete",
          paper: {
            title: paper.title,
            keywords: paper.keywords,
            sections: paper.sections.map(s => ({
              heading: s.heading,
              papers: s.papers.map(p => ({
                PMID: p.PMID,
                Title: p.Title,
                citationNum: p.citationNum,
              }))
            })),
            metadata: paper.metadata,
          },
        });

        safeClose();
      } catch (error) {
        console.error("Research paper generation error:", error);
        safeEnqueue({
          type: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
