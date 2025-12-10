import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { CreditService } from "@/lib/credits/credit-service";
import Cerebras from "@cerebras/cerebras_cloud_sdk";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check credits before processing
    const hasCredits = await CreditService.hasEnoughCredits(user.id, "ai_paraphrase");
    if (!hasCredits) {
      return NextResponse.json({ 
        error: "Insufficient credits",
        message: "You need credits to use the Paraphraser. Please upgrade your plan."
      }, { status: 402 });
    }

    const { text, tone, variation, length } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text required" }, { status: 400 });
    }

    // Map variation and length to instructions
    const variationLevel = variation < 40 ? "conservative" : variation > 60 ? "creative" : "moderate";
    const lengthInstruction = length < 40 ? "shorter" : length > 60 ? "longer" : "similar length";

    const toneInstructions = {
      Academic: "Use formal academic language with precise terminology and scholarly tone.",
      Formal: "Use professional, formal language suitable for business or official documents.",
      Fluent: "Use natural, flowing language that is easy to read and understand.",
      Creative: "Use engaging, creative language with varied sentence structures.",
      Balanced: "Use clear, balanced language that is both professional and accessible."
    };

    // Initialize Cerebras SDK
    const cerebrasKey = process.env.CEREBRAS_API_KEY;
    if (!cerebrasKey) {
      return NextResponse.json(
        { error: "Cerebras API key not configured" },
        { status: 500 }
      );
    }

    const cerebras = new Cerebras({ apiKey: cerebrasKey });

    // Build the paraphrase prompt
    const systemPrompt = `You are an expert paraphrasing assistant for academic and medical writing.
Paraphrase the given text with these requirements:
- Tone: ${toneInstructions[tone as keyof typeof toneInstructions]}
- Variation: ${variationLevel} changes to sentence structure and word choice
- Length: Make the output ${lengthInstruction} than the original
- Preserve the core meaning and key facts
- Maintain medical/academic accuracy
- Do not add citations or references
- Return only the paraphrased text, no explanations`;

    const userPrompt = `Paraphrase this text:\n\n${text}`;

    // Call Cerebras API with streaming
    const maxTokens = Math.ceil(text.split(/\s+/).length * (length / 50) * 2);
    const temperature = variation / 100;

    const stream = await cerebras.messages.create({
      model: "llama-3.3-70b",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      stream: true,
      max_completion_tokens: maxTokens,
      temperature: temperature,
      top_p: 0.8,
    });

    // Collect streamed response
    let paraphrased = "";
    for await (const chunk of stream) {
      const content = (chunk as any).choices?.[0]?.delta?.content || "";
      paraphrased += content;
    }

    // Deduct credits after successful generation
    await CreditService.deductCredits(user.id, "ai_paraphrase", "Text paraphrasing");

    return NextResponse.json({ 
      success: true,
      paraphrased: paraphrased.trim(),
      originalLength: text.split(/\s+/).length,
      paraphrasedLength: paraphrased.trim().split(/\s+/).length
    });

  } catch (error) {
    console.error("Paraphrase error:", error);
    return NextResponse.json(
      { error: "Failed to paraphrase text" },
      { status: 500 }
    );
  }
}
