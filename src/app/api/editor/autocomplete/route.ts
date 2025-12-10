import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { CreditService } from "@/lib/credits/credit-service";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check credits before processing
    const hasCredits = await CreditService.hasEnoughCredits(user.id, "ai_autocomplete");
    if (!hasCredits) {
      return NextResponse.json({ 
        error: "Insufficient credits",
        message: "You need credits to use AI Autocomplete. Please upgrade your plan."
      }, { status: 402 });
    }

    const { context, cursorPosition } = await req.json();

    if (!context) {
      return NextResponse.json({ error: "Context required" }, { status: 400 });
    }

    // Generate autocomplete suggestion
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: `You are an AI writing assistant for medical and academic documents. 
Given the context, suggest a natural continuation (1-2 sentences max).
Keep suggestions:
- Academically appropriate
- Contextually relevant
- Concise and clear
- Medically accurate if applicable

Only return the suggestion text, no explanations.`
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nSuggest a natural continuation:`
        }
      ],
      temperature: 0.7,
      maxTokens: 100,
    });

    // Deduct credits after successful generation
    await CreditService.deductCredits(user.id, "ai_autocomplete", "AI Autocomplete suggestion");

    return NextResponse.json({ 
      success: true,
      suggestion: text.trim()
    });

  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
