import { getUnifiedRAGService, UnifiedRAGService } from "@/lib/rag/unified-rag-service";

export interface PdfIntelligenceContext {
  ragDocumentId: string;
  userId: string;
}

export interface GeneratedTextArtifact {
  content: string;
  mode: "gemini" | "self-hosted";
  provider: string;
}

export interface AnalysisTable {
  title: string;
  description?: string;
  columns: string[];
  rows: (string | number | null)[][];
}

export interface AnalysisResult {
  summaryMarkdown: string;
  tables: AnalysisTable[];
}

/**
 * PdfIntelligenceService
 *
 * Thin orchestration layer on top of UnifiedRAGService.
 * For now we only generate:
 * - grounded markdown summary suitable for PDF export
 * - grounded slide outline in markdown
 *
 * This service is additive and does not modify any existing flows.
 */
export class PdfIntelligenceService {
  private rag: UnifiedRAGService;

  constructor(ragService?: UnifiedRAGService) {
    this.rag = ragService || getUnifiedRAGService();
  }

  /**
   * Generate a clinician-friendly markdown summary of the PDFs in context.
   * The returned markdown is grounded in the documents via File Search / RAG.
   */
  async generatePdfSummary(context: PdfIntelligenceContext): Promise<GeneratedTextArtifact> {
    const prompt = `You are assisting a medical professional.
You have access to one or more PDF documents via a Retrieval system (File Search store or self-hosted RAG).

Task: Produce a structured, clinically useful SUMMARY in Markdown that could later be exported as a PDF handout.

Requirements:
- Use clear headings (#, ##, ###) and short paragraphs.
- Include these sections if relevant: Introduction, Methods / Data Source, Key Findings, Clinical Implications, Limitations, Summary.
- Use bullet lists for key points when helpful.
- Do NOT invent data that is not supported by the documents.

Return ONLY the markdown, no extra commentary.

User intent: Provide a concise but complete PDF-ready summary of the uploaded documents.`;

    const result = await this.rag.chat(context.ragDocumentId, prompt, context.userId);

    return {
      content: result.answer,
      mode: result.mode,
      provider: result.provider,
    };
  }

  /**
   * Generate a slide outline in markdown that can later be converted to PPT.
   * We keep the output as markdown for now to avoid touching existing exporters.
   */
  async generateSlideOutline(context: PdfIntelligenceContext): Promise<GeneratedTextArtifact> {
    const prompt = `You are assisting a medical professional preparing a slide deck.
You have access to one or more PDF documents via a Retrieval system (File Search store or self-hosted RAG).

Task: Create a slide deck OUTLINE in Markdown suitable for conversion to PowerPoint.

Requirements:
- Use "Slide X: Title" style headings (e.g. "## Slide 1: Background").
- Under each slide, list 3-6 bullet points summarizing key information.
- Focus on clinical relevance and data directly supported by the documents.
- Start with 1-2 slides of background, then methods/data, results, discussion/implications, and a final summary slide.
- Do NOT fabricate results that are not supported by the PDFs.

Return ONLY the slide outline in markdown.`;

    const result = await this.rag.chat(context.ragDocumentId, prompt, context.userId);

    return {
      content: result.answer,
      mode: result.mode,
      provider: result.provider,
    };
  }

  /**
   * Analyze data across the PDFs and return structured tables plus a markdown summary.
   * This is designed for clinicians: demographics, outcomes, comparative results, etc.
   */
  async analyzeDocument(context: PdfIntelligenceContext): Promise<AnalysisResult> {
    const prompt = `You are helping a medical professional analyze one or more research PDFs.
You have access to the PDFs via a retrieval system (File Search store or self-hosted RAG).

Your task is to:
1) Derive key DATA TABLES (study characteristics, patient demographics, outcomes, etc.).
2) Provide a short clinical SUMMARY in markdown.

You MUST respond in STRICT JSON with this shape:
{
  "summary_markdown": string,
  "tables": [
    {
      "title": string,
      "description"?: string,
      "columns": string[],
      "rows": (string | number | null)[][]
    }
  ]
}

Rules:
- Base all content strictly on the PDFs; do not invent data.
- Use concise column names.
- Keep numeric values as numbers when possible.
- Do not include any text outside the JSON object.`;

    const result = await this.rag.chat(context.ragDocumentId, prompt, context.userId);

    let summaryMarkdown = "";
    let tables: AnalysisTable[] = [];

    const parsePayload = (raw: string): void => {
      const parsed = JSON.parse(raw);
      summaryMarkdown = typeof parsed.summary_markdown === "string" ? parsed.summary_markdown : "";
      if (Array.isArray(parsed.tables)) {
        tables = parsed.tables.map((t: any) => ({
          title: typeof t.title === "string" ? t.title : "Table",
          description: typeof t.description === "string" ? t.description : undefined,
          columns: Array.isArray(t.columns) ? t.columns.map((c: any) => String(c)) : [],
          rows: Array.isArray(t.rows)
            ? t.rows.map((row: any[]) =>
                Array.isArray(row)
                  ? row.map((cell) =>
                      cell === null || cell === undefined || typeof cell === "number" || typeof cell === "string"
                        ? cell
                        : String(cell),
                    )
                  : [],
              )
            : [],
        }));
      }
    };

    try {
      // First attempt: parse the whole answer as JSON
      parsePayload(result.answer);
    } catch (err) {
      // Second attempt: extract the first top-level JSON object from the answer
      try {
        const firstBrace = result.answer.indexOf("{");
        const lastBrace = result.answer.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const jsonSlice = result.answer.slice(firstBrace, lastBrace + 1);
          parsePayload(jsonSlice);
        } else {
          throw new Error("No JSON object found in answer");
        }
      } catch (innerErr) {
        // Final fallback: treat the whole answer as markdown summary only
        console.warn(
          "[PdfIntelligence] Failed to parse analysis JSON, using raw answer as markdown",
          { err, innerErr },
        );
        summaryMarkdown = result.answer;
        tables = [];
      }
    }

    return {
      summaryMarkdown,
      tables,
    };
  }

  /**
   * Generate a structured research article (IMRaD-style) grounded in the PDFs.
   */
  async generateResearchArticle(context: PdfIntelligenceContext): Promise<GeneratedTextArtifact> {
    const prompt = `You are helping a medical researcher write a structured research article draft.
You have access to one or more PDFs (e.g. clinical trials, observational studies, meta-analyses)
via a retrieval system (File Search store or self-hosted RAG).

Write a research article in markdown, using an IMRaD-like structure:

# Title

## Abstract
- Background
- Methods
- Results
- Conclusions

## Introduction
## Methods
## Results
## Discussion
## Limitations
## Conclusions

Important rules:
* Treat all retrieved PDFs as the source corpus for this article.
* Base all content strictly on the PDFs; do not invent data.
* Summarize and synthesize findings across ALL included PDFs.
* Use concise, clinically-relevant language geared to physicians.
* Where appropriate, mention key numerical results (effect sizes, confidence intervals) but do not fabricate numbers.

Citation and references requirements:
* Use in-text citations pointing to the source PDFs (e.g. numeric Vancouver style like [1], [2–4] OR APA style like (Smith et al., 2020)).
* At the end of the article, add a section titled "References" or "Bibliography".
* Under that section, list all source PDFs you relied on, formatted in a consistent Vancouver or APA style.
* For each reference, include as much bibliographic detail as is available from the PDFs (authors, title, journal, year, volume, pages, DOI), but do NOT fabricate details that are not supported by the documents.

Return ONLY the markdown article (including headings, body, and references), with no extra commentary.`;

    const result = await this.rag.chat(context.ragDocumentId, prompt, context.userId);

    return {
      content: result.answer,
      mode: result.mode,
      provider: result.provider,
    };
  }

  /**
   * Refine existing content (analysis or article) based on user feedback.
   * The AI will modify the content according to user instructions while staying grounded in the PDFs.
   */
  async refineContent(
    context: PdfIntelligenceContext & {
      currentContent: string;
      userInstruction: string;
      contentType: 'analysis' | 'article';
    }
  ): Promise<GeneratedTextArtifact> {
    const typeLabel = context.contentType === 'analysis' ? 'data analysis' : 'research article';
    
    const prompt = `You are helping a medical professional refine a ${typeLabel}.
You have access to one or more PDF documents via a Retrieval system (File Search store or self-hosted RAG).

CURRENT ${typeLabel.toUpperCase()}:
---
${context.currentContent}
---

USER'S REFINEMENT REQUEST:
"${context.userInstruction}"

Your task:
1. Modify the ${typeLabel} according to the user's request.
2. Keep the content grounded in the source PDFs - do not invent data.
3. Maintain the same overall structure unless the user asks to change it.
4. Return the COMPLETE updated ${typeLabel} in markdown format.

Return ONLY the updated markdown content, no extra commentary.`;

    const result = await this.rag.chat(context.ragDocumentId, prompt, context.userId);

    return {
      content: result.answer,
      mode: result.mode,
      provider: result.provider,
    };
  }
}

let pdfIntelInstance: PdfIntelligenceService | null = null;

export function getPdfIntelligenceService(): PdfIntelligenceService {
  if (!pdfIntelInstance) {
    pdfIntelInstance = new PdfIntelligenceService();
  }
  return pdfIntelInstance;
}
