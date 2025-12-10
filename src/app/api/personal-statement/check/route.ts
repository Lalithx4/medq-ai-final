import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { env } from "@/env";

interface PsCheckItem {
  section: string;
  status: "strong" | "ok" | "weak" | "missing";
  comment: string;
}

export async function POST(req: NextRequest) {
  try {
    const { markdown } = (await req.json()) as { markdown: string };

    if (!markdown || !markdown.trim()) {
      return NextResponse.json(
        { success: false, error: "Markdown content is required" },
        { status: 400 },
      );
    }

    const apiKey = env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GOOGLE_AI_API_KEY not configured" },
        { status: 500 },
      );
    }

    const client = new GoogleGenAI({ apiKey });

    const prompt = [
      "You are a residency program director reviewing a personal statement.",
      "You will receive the full statement in Markdown.",
      "Provide a concise checklist of strengths and weaknesses across key domains.",
      "",
      "Return ONLY valid JSON with this exact shape (no backticks, no extra text):",
      "{",
      "  \"items\": [",
      "    { \"section\": string, \"status\": \"strong\" | \"ok\" | \"weak\" | \"missing\", \"comment\": string }",
      "  ]",
      "}",
      "",
      "Use sections such as: Opening, Motivation for specialty, Specific experiences, Reflection and insight, Specialty fit, Goals, Addressing gaps/red flags, Clarity and structure, Tone and authenticity.",
      "If something is not addressed or very unclear, mark status as 'weak' or 'missing' and explain briefly what is needed.",
      "",
      "--- PERSONAL STATEMENT (MARKDOWN) ---",
      markdown,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0,
        maxOutputTokens: 1024,
      },
    });

    const rawText =
      typeof (response as any).text === "function"
        ? (response as any).text()
        : ((response as any).text ?? "");

    const cleaned = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsed: { items?: PsCheckItem[] } = {};
    try {
      parsed = JSON.parse(cleaned) as { items?: PsCheckItem[] };
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "The quality-check model response could not be parsed. Please try re-running the check.",
        },
        { status: 500 },
      );
    }

    const items: PsCheckItem[] = Array.isArray(parsed.items)
      ? parsed.items.filter(
          (it) =>
            typeof it.section === "string" &&
            typeof it.comment === "string" &&
            ["strong", "ok", "weak", "missing"].includes(it.status as string),
        )
      : [];

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("[PersonalStatement] Check error", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run personal statement quality check",
      },
      { status: 500 },
    );
  }
}
