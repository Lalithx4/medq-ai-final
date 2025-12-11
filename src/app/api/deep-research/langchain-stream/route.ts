import { NextRequest } from "next/server";
import { LangChainResearchService } from "@/lib/deep-research/langchain-research";
import { getServerSupabase } from "@/lib/supabase/server";
import crypto from 'crypto';

export const maxDuration = 300; // 5 minutes
export const runtime = "nodejs";

import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  let { data: { user } } = await supabase.auth.getUser();

  // MOCK USER FALLBACK (for development)
  if (!user && process.env.NODE_ENV === "development") {
    const mockUserId = "mock-user-id";

    // Upsert mock user to ensure database integrity
    try {
      await db.user.upsert({
        where: { id: mockUserId },
        update: {},
        create: {
          id: mockUserId,
          email: "test@example.com",
          name: "Mock User",
          role: "USER",
          credits: 100,
          hasAccess: true
        }
      });
    } catch (dbError) {
      console.warn("⚠️ [Deep Research API] Failed to upsert mock user:", dbError);
      // Continue anyway as this is dev/fallback logic
    }

    user = { id: mockUserId, email: "test@example.com" } as any;
  }

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {
    topic,
    conversationId,
    topK = 10,  // Increased from 5 to 10 papers per section
    nSections = 5,
    sources = { pubmed: true, arxiv: false, web: false }
  } = await req.json();

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
          // If enqueue fails due to closed controller, mark closed to stop further writes
          isClosed = true;
        }
      };
      const safeClose = () => {
        if (!isClosed) {
          try { controller.close(); } catch { }
          isClosed = true;
        }
      };
      try {
        // Save User Message (Topic)
        if (conversationId) {
          await db.chatMessage.create({
            data: {
              id: crypto.randomUUID(),
              conversationId,
              userId: user.id,
              role: 'user',
              content: topic,
              metadata: { type: 'text' }
            }
          });
        }

        const service = new LangChainResearchService(apiKey);

        // Send initial message
        safeEnqueue({
          type: "start",
          message: "🔗 Starting LangChain-powered research...",
          progress: 0,
        });

        const report = await service.generateResearch({
          topic,
          topK,
          nSections,
          sources,
          onProgress: (message, progress) => {
            safeEnqueue({ type: "progress", message, progress });
          },
        });

        // Format as markdown
        const markdown = LangChainResearchService.formatAsMarkdown(report);

        // Save Assistant Message (Report)
        if (conversationId) {
          await db.chatMessage.create({
            data: {
              id: crypto.randomUUID(),
              conversationId,
              userId: user.id,
              role: 'assistant',
              content: markdown,
              metadata: {
                type: 'research_report',
                data: {
                  markdown: markdown,
                  metadata: report.metadata,
                  topic: topic
                }
              }
            }
          });
        }

        // Send metadata first (small)
        safeEnqueue({ type: "metadata", metadata: report.metadata });

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
          report: {
            title: report.title,
            sections: report.sections.map(s => ({
              heading: s.heading,
              papers: s.papers.map(p => ({ PMID: p.PMID, Title: p.Title, citationNum: p.citationNum }))
            })),
            metadata: report.metadata,
          },
        });

        safeClose();
      } catch (error) {
        console.error("LangChain research error:", error);
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
