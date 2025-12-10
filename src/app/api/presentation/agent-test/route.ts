import { getServerSupabase } from "@/lib/supabase/server";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { NextResponse } from "next/server";

/**
 * Test endpoint to verify AI agent is working with Cerebras
 * Usage: GET /api/presentation/agent-test
 */
export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Testing Cerebras agent with simple prompt...");

    const cerebras = new Cerebras({
      apiKey: process.env.CEREBRAS_API_KEY,
    });

    const stream = await cerebras.chat.completions.create({
      messages: [
        {
          role: "user",
          content: 'Say "Hello from Cerebras AI Agent!" in JSON format: {"message": "..."}',
        },
      ],
      model: "llama-3.3-70b",
      stream: true,
      max_completion_tokens: 100,
      temperature: 0.2,
    });

    console.log("Cerebras test stream created successfully");

    // Create a ReadableStream to send data to the client
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = (chunk as any).choices?.[0]?.delta?.content || "";
            if (content) {
              const data = `0:${JSON.stringify(content)}\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Test endpoint error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
