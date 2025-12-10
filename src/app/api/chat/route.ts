import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/lib/chat/chat-service";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs"; // ensure server runtime so env vars are available

const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, history, conversationId } = (await req.json()) as {
      message?: string;
      history?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
      conversationId?: string;
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "CEREBRAS_API_KEY is not configured on the server" },
        { status: 500 },
      );
    }

    const model = process.env.CEREBRAS_MODEL || "llama3.1-8b";

    // Save user message to database
    await chatService.saveMessage({
      conversationId,
      userId: user.id,
      role: "user",
      content: message,
      context: { type: "home" },
      metadata: { model },
    });

    // Construct chat messages
    const messages = [
      {
        role: "system" as const,
        content:
          "You are BioDocsAI, a concise medical research & documentation assistant. Be precise, neutral, and safe. Provide citations only if asked.",
      },
      ...((Array.isArray(history) ? history : []) as Array<{
        role: "user" | "assistant" | "system";
        content: string;
      }>),
      { role: "user" as const, content: message },
    ];

    const res = await fetch(CEREBRAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Cerebras API error:", res.status, errText);
      return NextResponse.json(
        { error: "Cerebras API request failed" },
        { status: 502 },
      );
    }

    const data = (await res.json()) as any;
    const content =
      data?.choices?.[0]?.message?.content ??
      "I'm here to help with medical research and documentation. How can I assist you today?";

    // Save assistant response to database
    await chatService.saveMessage({
      conversationId,
      userId: user.id,
      role: "assistant",
      content,
      context: { type: "home" },
      metadata: { model, tokens: data?.usage },
    });

    return NextResponse.json({ response: content });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET endpoint to retrieve conversation history
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const context = searchParams.get('context') || undefined;

    if (conversationId) {
      // Get specific conversation history
      const messages = await chatService.getConversationHistory(conversationId);
      return NextResponse.json({ messages });
    } else {
      // Get user's conversations list
      const conversations = await chatService.getUserConversations(
        user.id,
        context
      );
      return NextResponse.json({ conversations });
    }
  } catch (error) {
    console.error("Chat GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
