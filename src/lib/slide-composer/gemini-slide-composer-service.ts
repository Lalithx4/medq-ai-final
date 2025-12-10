import { GoogleGenAI } from "@google/genai";

import { env } from "@/env";
import type { SlideComposerResult, SlideContent } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash";

export interface GeminiSlideComposerRequest {
  topic: string;
  slideCount: number;
  audience?: string;
  tone?: string;
}

export class GeminiSlideComposerService {
  private client: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || env.GOOGLE_AI_API_KEY;
    if (!key) {
      throw new Error("GOOGLE_AI_API_KEY is required for GeminiSlideComposerService but is missing");
    }
    this.client = new GoogleGenAI({ apiKey: key });
  }

  async generatePresentation(req: GeminiSlideComposerRequest): Promise<SlideComposerResult> {
    const slideCount = req.slideCount > 0 ? req.slideCount : 8;

    const prompt = this.buildPrompt({ ...req, slideCount });

    const stream = await this.client.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.5,
        maxOutputTokens: 4096,
      },
    });

    let rawText = "";
    for await (const chunk of stream as any) {
      const piece =
        typeof (chunk as any).text === "function"
          ? (chunk as any).text()
          : ((chunk as any).text ?? "");
      rawText += piece;
    }

    const jsonText = this.extractJson(rawText);

    // Clean up common issues: stray fences, trailing commas, truncated JSON
    let cleaned = jsonText.trim();
    cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();

    // If Gemini returned extra prose around the JSON, keep only between first '{' and last '}'
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1).trim();
    }

    // Remove trailing commas before closing } or ]
    cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("❌ [GeminiSlideComposer] Failed to parse JSON from Gemini", {
        rawText: rawText?.slice(0, 500),
      });

      // Fallback: treat the whole response as markdown for a single slide
      const fallbackSlide: SlideContent = {
        id: "1",
        title: req.topic,
        markdown: rawText || `# ${req.topic}\n\nSlides could not be parsed as JSON.`,
      };

      return {
        slides: [fallbackSlide],
        researchMarkdown: "",
        metadata: {
          topic: req.topic,
          slideCount: 1,
          wordCount: fallbackSlide.markdown.split(/\s+/).length,
          generatedAt: new Date().toISOString(),
        },
      };
    }

    const rawSlides = Array.isArray(parsed.slides) ? parsed.slides : [];
    const slides: SlideContent[] = rawSlides.map((s: any, index: number) => ({
      id: `${index + 1}`,
      title: String(s?.title || `Slide ${index + 1}`),
      markdown: String(s?.markdown || ""),
    }));

    return {
      slides,
      researchMarkdown: "", // not used in Gemini mode
      metadata: {
        topic: req.topic,
        slideCount: slides.length,
        wordCount: slides.reduce((acc, s) => acc + s.markdown.split(/\s+/).length, 0),
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private buildPrompt(req: GeminiSlideComposerRequest & { slideCount: number }): string {
    const parts: string[] = [];
    parts.push("You are a medical presentation expert.");
    parts.push("");
    parts.push("Task: Create a slide deck in MARKDOWN for a talk using the following constraints.");
    parts.push("");
    parts.push(`Topic: "${req.topic}"`);
    parts.push(`Number of slides: ${req.slideCount}`);
    if (req.audience) parts.push(`Audience: ${req.audience}`);
    if (req.tone) parts.push(`Tone: ${req.tone}`);
    parts.push("");
    parts.push("Requirements:");
    parts.push("- Use medically accurate, up-to-date language.");
    parts.push("- Each slide must have a short, clear title.");
    parts.push("- Use headings and bullet points, avoid long paragraphs.");
    parts.push("- Do NOT include speaker notes, only what belongs on the slide.");
    parts.push("- Include typical structure: background, key concepts, indications/contraindications, techniques, outcomes, complications, summary.");
    parts.push("");
    parts.push("Output format (MUST be valid JSON, nothing else):");
    parts.push("{");
    parts.push("  \"slides\": [");
    parts.push("    {");
    parts.push("      \"title\": \"string - short slide title\",");
    parts.push("      \"markdown\": \"markdown content for this slide with headings and bullet points\"");
    parts.push("    }");
    parts.push("    // ... more slides ...");
    parts.push("  ]");
    parts.push("}");
    return parts.join("\n");
  }

  private extractJson(text: string): string {
    if (!text) return "{}";
    // If Gemini wrapped JSON in ```json ... ``` fences, strip them
    const fenceMatch = text.match(/```json([\s\S]*?)```/i);
    if (fenceMatch) {
      return fenceMatch[1].trim();
    }
    const braceIndex = text.indexOf("{");
    if (braceIndex >= 0) {
      return text.slice(braceIndex).trim();
    }
    return text.trim();
  }
}
