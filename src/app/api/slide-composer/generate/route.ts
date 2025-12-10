import { NextRequest, NextResponse } from "next/server";

import { env } from "@/env";
import { SlideComposerService } from "@/lib/slide-composer/slide-composer-service";
import { GeminiSlideComposerService } from "@/lib/slide-composer/gemini-slide-composer-service";
import type { SlideComposerRequest } from "@/lib/slide-composer/types";
import { getServerSupabase } from "@/lib/supabase/server";
import { CreditService } from "@/lib/credits/credit-service";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<SlideComposerRequest>;
    if (!body.topic || !body.topic.trim()) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const slideCount = body.slideCount && body.slideCount > 0 ? body.slideCount : 8;
    const mode = body.mode || "gemini";

    // Use a dedicated credit type to avoid conflicts with existing presentation flows
    const hasCredits = await CreditService.hasEnoughCredits(
      user.id,
      "slide_composer"
    );
    if (!hasCredits) {
      return NextResponse.json(
        {
          error:
            "Insufficient credits. SlideComposer requires sufficient research credits.",
        },
        { status: 402 }
      );
    }

    console.log("🧩 [SlideComposer] Generating presentation", {
      userId: user.id,
      topic: body.topic,
      slideCount,
      mode,
    });
    let result;
    if (mode === "deep_research") {
      const service = new SlideComposerService(env.CEREBRAS_API_KEY || "");
      result = await service.generatePresentation({
        topic: body.topic.trim(),
        slideCount,
        audience: body.audience,
        tone: body.tone,
        sources: body.sources,
        mode,
      });
    } else {
      const geminiService = new GeminiSlideComposerService(env.GOOGLE_AI_API_KEY || "");
      result = await geminiService.generatePresentation({
        topic: body.topic.trim(),
        slideCount,
        audience: body.audience,
        tone: body.tone,
      });
    }

    await CreditService.deductCredits(
      user.id,
      "slide_composer",
      `SlideComposer presentation: ${body.topic}`
    );

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("❌ [SlideComposer] Failed to generate presentation", error);

    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";

    // If Gemini returns a 503 UNAVAILABLE / model overloaded error, surface that as 503
    const raw = String((error as any)?.message ?? "");
    const isOverloaded =
      raw.includes("The model is overloaded") || raw.includes("status\":\"UNAVAILABLE\"");

    if (isOverloaded) {
      return NextResponse.json(
        {
          error:
            "The slide generation model is temporarily overloaded. Please try again in a few seconds.",
          details: message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate presentation",
        details: message,
      },
      { status: 500 }
    );
  }
}
