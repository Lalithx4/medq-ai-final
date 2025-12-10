import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { env } from "@/env";
import type {
  SlideComposerChatRequest,
  SlideComposerChatResponse,
  SlideContent,
} from "@/lib/slide-composer/types";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SlideComposerChatRequest;

    if (!body.message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const apiKey = env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_AI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const slides = body.slides || [];
    const lastAssistantSummary = body.lastAssistantSummary || "";

    const deckMarkdown = slides
      .map((slide, index) => {
        return [
          `## Slide ${index + 1}: ${slide.title}`,
          "",
          slide.markdown,
        ].join("\n");
      })
      .join("\n\n---\n\n");

    const client = new GoogleGenAI({ apiKey });

    // --- LLM-based intent classification ---
    const classifierPrompt = [
      "You are an intent classifier for a slide editing assistant called SlideComposer.",
      "Given the user's free-text message and the current slide deck (in markdown), decide what they want to do.",
      "Always respond with **ONLY JSON**, no backticks or extra text.",
      "The JSON shape is:",
      '{',
      '  "intent": "add_slide" | "confirm_add_slide" | "rename_slide" | "advise",',
      '  "targetIndex"?: number,           // 1-based index where a new slide should go (for add/confirm_add)',
      '  "slideNumber"?: number,           // slide number to rename (for rename_slide)',
      '  "newTitle"?: string,              // new title (for rename_slide)',
      '  "focus"?: string                  // short description of what the slide or advice should focus on',
      '}',
      "",
      "Examples:",
      '{"intent":"add_slide","targetIndex":9,"focus":"postoperative care"}',
      '{"intent":"confirm_add_slide","targetIndex":9,"focus":"postoperative care"}',
      '{"intent":"rename_slide","slideNumber":3,"newTitle":"Complications"}',
      '{"intent":"advise","focus":"make slides more concise"}',
      "",
      "Special rule: If the previous assistant summary said something like 'I can add slide N' and the user reply is a short confirmation (e.g. 'I confirm', 'yes', 'ok, please do it'), then set intent to 'confirm_add_slide' with targetIndex N.",
      "If you are unsure, prefer intent 'advise'.",
      "",
      "Slide deck (markdown):",
      deckMarkdown || "(no slides yet)",
      "",
      lastAssistantSummary
        ? `Previous assistant summary: ${lastAssistantSummary}`
        : "Previous assistant summary: (none)",
      "",
      `User message: ${body.message}`,
      body.context?.topic ? `\nTopic: ${body.context.topic}` : "",
      body.context?.audience ? `\nAudience: ${body.context.audience}` : "",
      body.context?.tone ? `\nTone: ${body.context.tone}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const classifierResponse = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: classifierPrompt,
      config: {
        temperature: 0,
        maxOutputTokens: 256,
      },
    });

    const classifierTextRaw =
      typeof (classifierResponse as any).text === "function"
        ? (classifierResponse as any).text()
        : ((classifierResponse as any).text ?? "");

    const classifierText = classifierTextRaw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    type ParsedIntent = {
      intent: "add_slide" | "confirm_add_slide" | "rename_slide" | "advise";
      targetIndex?: number;
      slideNumber?: number;
      newTitle?: string;
      focus?: string;
    };

    let parsedIntent: ParsedIntent = { intent: "advise" };
    try {
      const obj = JSON.parse(classifierText) as Partial<ParsedIntent>;
      if (obj && typeof obj.intent === "string") {
        parsedIntent = {
          intent: obj.intent as ParsedIntent["intent"],
          targetIndex: obj.targetIndex,
          slideNumber: obj.slideNumber,
          newTitle: obj.newTitle,
          focus: obj.focus,
        };
      }
    } catch {
      // Fall back to generic advice if parsing fails.
      parsedIntent = { intent: "advise" };
    }

    const lowerMessage = body.message.toLowerCase();

    // Additional safety net: if the model still returns 'advise' but the previous
    // assistant summary clearly proposed adding a slide and the user is
    // sending a short confirmation, coerce this into confirm_add_slide.
    if (parsedIntent.intent === "advise" && lastAssistantSummary) {
      const addMatch = lastAssistantSummary.match(/add slide\s+(\d+)/i);
      const isConfirmation = /\b(confirm|yes|ok|okay|sure|go ahead)\b/i.test(
        lowerMessage,
      );

      if (addMatch && isConfirmation) {
        const idx = Number.parseInt(addMatch[1] ?? "", 10);
        if (Number.isFinite(idx)) {
          parsedIntent = {
            intent: "confirm_add_slide",
            targetIndex: idx,
            focus: undefined,
          };
        }
      }
    }

    // --- Intent: confirm_add_slide (actually create the new slide) ---
    if (parsedIntent.intent === "confirm_add_slide") {
      const requestedIndex = parsedIntent.targetIndex ?? slides.length + 1;
      const targetIndex = Number.isFinite(requestedIndex)
        ? Math.min(Math.max(requestedIndex, 1), slides.length + 1)
        : slides.length + 1;

      const userPrompt = [
        "You are a medical presentation expert.",
        "The user has an existing slide deck in markdown.",
        "Create ONE new slide based on the user request.",
        "Output ONLY the markdown for that single new slide.",
        "Do NOT output JSON, do NOT output backticks or fences, only slide markdown.",
        "Include a top-level heading for the slide title.",
        "",
        "Current slide deck (markdown):",
        deckMarkdown || "(no slides yet)",
        "",
        `User request: ${body.message}`,
        parsedIntent.focus ? `\nFocus: ${parsedIntent.focus}` : "",
        body.context?.topic ? `\nTopic: ${body.context.topic}` : "",
        body.context?.audience ? `\nAudience: ${body.context.audience}` : "",
        body.context?.tone ? `\nTone: ${body.context.tone}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
          temperature: 0.4,
          maxOutputTokens: 800,
        },
      });

      const rawText =
        typeof (response as any).text === "function"
          ? (response as any).text()
          : ((response as any).text ?? "");

      const markdown = rawText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const title = extractTitleFromMarkdown(markdown) || "New Slide";

      const insertionIndex = targetIndex - 1; // 0-based
      const newSlide: SlideContent = {
        id: "temp", // will be re-assigned
        title,
        markdown,
      };

      const updatedSlides: SlideContent[] = [
        ...slides.slice(0, insertionIndex),
        newSlide,
        ...slides.slice(insertionIndex),
      ].map((s, idx) => ({ ...s, id: `${idx + 1}` }));

      const result: SlideComposerChatResponse = {
        slides: updatedSlides,
        summary: `Added slide ${targetIndex}: ${title}`,
      };

      return NextResponse.json({ success: true, result });
    }

    // --- Intent: add_slide (ask user to confirm before changing deck) ---
    if (parsedIntent.intent === "add_slide") {
      const requestedIndex = parsedIntent.targetIndex ?? slides.length + 1;
      const targetIndex = Number.isFinite(requestedIndex)
        ? Math.min(Math.max(requestedIndex, 1), slides.length + 1)
        : slides.length + 1;

      const result: SlideComposerChatResponse = {
        slides,
        summary:
          `I can add slide ${targetIndex} after slide ${targetIndex - 1 || 0} ` +
          `based on your request. Reply with "confirm add slide ${targetIndex}" ` +
          `and optionally refine the focus (e.g. "confirm add slide ${targetIndex} on postoperative care").`,
      };

      return NextResponse.json({ success: true, result });
    }

    // --- Intent: rename_slide ---
    if (parsedIntent.intent === "rename_slide") {
      const slideNumber = parsedIntent.slideNumber;
      const newTitle = (parsedIntent.newTitle || "").trim();

      if (!slideNumber || !Number.isFinite(slideNumber) || slideNumber < 1 || slideNumber > slides.length || !newTitle) {
        const result: SlideComposerChatResponse = {
          slides,
          summary:
            "I could not identify a valid slide number and new title. Please try 'rename slide 3 to Complications'.",
        };
        return NextResponse.json({ success: true, result });
      }

      const index = slideNumber - 1;
      const updatedSlides = slides.map((s, idx) =>
        idx === index ? { ...s, title: newTitle } : s
      );

      const result: SlideComposerChatResponse = {
        slides: updatedSlides,
        summary: `Renamed slide ${slideNumber} to "${newTitle}"`,
      };

      return NextResponse.json({ success: true, result });
    }

    // --- Intent: refine a specific existing slide (heuristic on top of 'advise') ---
    // If the classifier fell back to 'advise' but the user clearly references a
    // numbered slide (e.g. "add more content to the 8th slide"), treat this as
    // a request to rewrite that slide rather than generic feedback.
    if (parsedIntent.intent === "advise") {
      const slideRefMatch =
        lowerMessage.match(/slide\s+(\d+)/) ||
        lowerMessage.match(/(\d+)(?:st|nd|rd|th)?\s+slide/);

      const slideNumber = slideRefMatch
        ? Number.parseInt(slideRefMatch[1] ?? "", 10)
        : NaN;

      const wantsMoreContent = /more content|add more|expand|more detail|more details/i.test(
        body.message,
      );

      if (Number.isFinite(slideNumber) && slideNumber >= 1 && slideNumber <= slides.length && wantsMoreContent) {
        const target = slides[slideNumber - 1];
        if (!target) {
          // Should not happen given the bounds check, but fall back to advice.
          parsedIntent = { intent: "advise" };
        } else {

        const refinePrompt = [
          "You are a medical presentation expert.",
          "Rewrite the following slide in markdown, adding more detail and nuance based on the user request.",
          "Keep it as a single slide, with a clear heading and well-structured bullet points.",
          "Output ONLY the markdown for that single updated slide (no JSON, no backticks).",
          "",
          `Current slide ${slideNumber}:`,
          target.markdown || "(empty slide)",
          "",
          `User request: ${body.message}`,
          body.context?.topic ? `\nTopic: ${body.context.topic}` : "",
          body.context?.audience ? `\nAudience: ${body.context.audience}` : "",
          body.context?.tone ? `\nTone: ${body.context.tone}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const refineResponse = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: refinePrompt,
          config: {
            temperature: 0.4,
            maxOutputTokens: 800,
          },
        });

        const refineTextRaw =
          typeof (refineResponse as any).text === "function"
            ? (refineResponse as any).text()
            : ((refineResponse as any).text ?? "");

        const updatedMarkdown = refineTextRaw
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        // If the model failed to return any usable content, keep the original
        // slide instead of wiping it out.
        if (!updatedMarkdown) {
          const result: SlideComposerChatResponse = {
            slides,
            summary:
              `I tried to expand slide ${slideNumber}, but the model didn't return clear content. ` +
              `Please try rephrasing your request with more detail about what you want added.`,
          };

          return NextResponse.json({ success: true, result });
        }

        const updatedSlides = slides.map((s, idx) =>
          idx === slideNumber - 1 ? { ...s, markdown: updatedMarkdown } : s,
        );

        const result: SlideComposerChatResponse = {
          slides: updatedSlides,
          summary: `Expanded slide ${slideNumber} with more detail based on your request.`,
        };

        return NextResponse.json({ success: true, result });
        }
      }
    }

    // --- Intent: advise (generic refinement / advice) ---
    const advicePrompt = [
      "You are a medical presentation expert.",
      "Given the slide deck in markdown and the user request, provide specific, concrete suggestions to improve the slides.",
      "Focus on clarity, medical accuracy, and structure.",
      "Respond with plain text only (no JSON, no backticks).",
      "",
      "Slide deck (markdown):",
      deckMarkdown || "(no slides yet)",
      "",
      `User request: ${body.message}`,
      body.context?.topic ? `\nTopic: ${body.context.topic}` : "",
      body.context?.audience ? `\nAudience: ${body.context.audience}` : "",
      body.context?.tone ? `\nTone: ${body.context.tone}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: advicePrompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 800,
      },
    });

    const adviceText =
      typeof (response as any).text === "function"
        ? (response as any).text()
        : ((response as any).text ?? "");

    const result: SlideComposerChatResponse = {
      slides,
      summary:
        adviceText.trim() ||
        "I couldn't clearly tell what change you wanted. If you're trying to add a new slide, reply with a message like `confirm add slide 9 on postoperative care`. Otherwise, describe the exact slide number and change you want.",
    };

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("❌ [SlideComposer] Chat error", error);
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function extractTitleFromMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      return trimmed.replace(/^#+\s*/, "").trim();
    }
  }
  return "";
}
