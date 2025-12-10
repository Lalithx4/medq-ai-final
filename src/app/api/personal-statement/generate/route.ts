import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { env } from "@/env";

interface PersonalStatementGenerateRequest {
  target: "residency" | "fellowship" | "medical-school" | "other";
  specialty: string;
  templateStyle: "classic" | "patient-story" | "theme" | "research";
  bio: string;
  strengths: string[];
  experiences: {
    title: string;
    situation: string;
    learning: string;
  }[];
  motivation: string;
  goals: string;
  redFlags: string;
  tone: string;
  wordLimit: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<PersonalStatementGenerateRequest>;

    const apiKey = env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GOOGLE_AI_API_KEY not configured" },
        { status: 500 },
      );
    }

    if (!body.specialty || !body.specialty.trim()) {
      return NextResponse.json(
        { success: false, error: "Specialty is required" },
        { status: 400 },
      );
    }

    const client = new GoogleGenAI({ apiKey });

    const target = body.target ?? "residency";
    const templateStyle = body.templateStyle ?? "classic";
    const wordLimit = body.wordLimit && body.wordLimit > 0 ? body.wordLimit : 750;

    const experiencesText = (body.experiences ?? [])
      .map((exp, idx) => {
        return [
          `Experience ${idx + 1}: ${exp.title ?? ""}`,
          `Situation: ${exp.situation ?? ""}`,
          `What I did / learned: ${exp.learning ?? ""}`,
        ].join("\n");
      })
      .join("\n\n");

    const strengthsText = (body.strengths ?? []).join(", ");

    const templateHint =
      templateStyle === "patient-story"
        ? "Open with a vivid but concise patient story and then connect it to your motivation."
        : templateStyle === "theme"
          ? "Organize the statement around 1-2 clear themes (e.g. resilience, curiosity), with experiences illustrating those themes."
          : templateStyle === "research"
            ? "Emphasize research experiences, academic curiosity, and fit with academic programs while maintaining a human, patient-centered tone."
            : "Use a clear narrative arc: introduction, key experiences in chronological order, motivation and fit for the specialty, and a strong closing paragraph.";

    const promptParts = [
      "You are an expert editor helping international medical graduates craft personal statements for US training programs.",
      "Draft a full personal statement in Markdown using the applicant's real experiences.",
      "Do NOT invent rotations, exam scores, institutions, or publications.",
      "Use professional but warm language and avoid clichés.",
      "The applicant will customize the final text; keep it honest and flexible.",
      "",
      `Target: ${target}`,
      `Specialty: ${body.specialty}`,
      `Tone: ${body.tone ?? "professional"}`,
      `Word limit: about ${wordLimit} words (you may be within +/- 15%).`,
      "",
      "STRUCTURE:",
      "- 1 opening paragraph that clearly introduces the applicant and their interest in the specialty.",
      "- 2-4 body paragraphs highlighting key experiences, qualities, and growth.",
      "- 1 closing paragraph summarizing fit, goals, and enthusiasm.",
      "",
      "TEMPLATE HINT:",
      templateHint,
      "",
      "APPLICANT INPUTS:",
      `Short bio: ${body.bio ?? ""}`,
      `Strengths / qualities: ${strengthsText}`,
      "",
      "Key experiences:",
      experiencesText || "(no specific experiences provided)",
      "",
      `Motivation for this specialty: ${body.motivation ?? ""}`,
      `Short- and long-term goals: ${body.goals ?? ""}`,
      `Red flags or gaps to briefly address (if any): ${body.redFlags ?? ""}`,
      "",
      "GUIDELINES:",
      "- Use only the information provided by the applicant.",
      "- If some sections are empty, you may gently note the need for the applicant to add details, but do not fabricate content.",
      "- Sound like a real human writer, not an AI.",
      "- Write in the first person (\"I\").",
      "- Do not use headings; output as continuous paragraphs separated by blank lines.",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptParts,
      config: {
        temperature: 0.5,
        maxOutputTokens: 1600,
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

    return NextResponse.json({ success: true, markdown });
  } catch (error) {
    console.error("[PersonalStatement] Generate error", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate personal statement",
      },
      { status: 500 },
    );
  }
}
