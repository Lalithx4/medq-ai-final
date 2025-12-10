import { randomUUID } from "crypto";

import { env } from "@/env";
import { MultiAgentResearchService } from "@/lib/deep-research/multi-agent-research";
import type {
  SlideComposerRequest,
  SlideComposerResult,
  SlideContent,
} from "./types";

const DEFAULT_SLIDE_COUNT = 8;

/**
 * SlideComposerService
 *
 * Uses the existing MultiAgentResearchService (LangChain + PubMed) to
 * generate a full research report, then slices that report into
 * slide-sized markdown chunks.
 *
 * Namespaced under "slide-composer" to avoid conflicts with
 * existing presentation agents, pages, or tables.
 */
export class SlideComposerService {
  private researchService: MultiAgentResearchService;

  constructor(apiKey: string = env.CEREBRAS_API_KEY || "") {
    if (!apiKey) {
      throw new Error(
        "CEREBRAS_API_KEY is required for SlideComposerService but is missing"
      );
    }
    this.researchService = new MultiAgentResearchService(apiKey);
  }

  async generatePresentation(
    request: SlideComposerRequest
  ): Promise<SlideComposerResult> {
    const slideCount = request.slideCount || DEFAULT_SLIDE_COUNT;

    // Use deep-research pipeline as the backbone
    const report = await this.researchService.generateReport({
      topic: request.topic,
      topK: Math.max(5, Math.ceil(slideCount * 1.5)),
      nSections: Math.max(3, Math.min(slideCount - 2, 8)),
    });

    const slides = this.buildSlidesFromReport(report, slideCount);
    const markdown = MultiAgentResearchService.formatAsMarkdown(report);

    return {
      slides,
      researchMarkdown: markdown,
      metadata: {
        topic: request.topic,
        slideCount: slides.length,
        wordCount: report.metadata?.wordCount ?? 0,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private buildSlidesFromReport(
    report: Awaited<ReturnType<MultiAgentResearchService["generateReport"]>>,
    requestedSlides: number
  ): SlideContent[] {
    const slides: SlideContent[] = [];

    // Title / overview slide
    const safeTitle = this.shortenTitle(report.title, report.metadata.topic);
    slides.push({
      id: randomUUID(),
      title: safeTitle,
      markdown: [
        `## ${safeTitle}`,
        `**Topic:** ${report.metadata.topic}`,
        "",
        "### Key Takeaways",
        this.toBullets(report.abstract || report.introduction, 4),
      ]
        .filter(Boolean)
        .join("\n"),
    });

    // Background slide
    if (report.introduction) {
      slides.push({
        id: randomUUID(),
        title: "Background",
        markdown: ["### Background", this.toBullets(report.introduction, 5)]
          .filter(Boolean)
          .join("\n"),
      });
    }

    // One slide per section
    report.sections.forEach((section) => {
      slides.push({
        id: randomUUID(),
        title: section.heading,
        markdown: [
          `### ${section.heading}`,
          this.toBullets(section.content, 5),
          this.sectionReferences(section.papers),
        ]
          .filter(Boolean)
          .join("\n\n"),
      });
    });

    // Discussion slide
    if (report.discussion) {
      slides.push({
        id: randomUUID(),
        title: "Discussion",
        markdown: [
          "### Discussion",
          this.toBullets(report.discussion, 5),
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }

    // Conclusion slide
    if (report.conclusion) {
      slides.push({
        id: randomUUID(),
        title: "Conclusion",
        markdown: [
          "### Conclusion",
          this.toBullets(report.conclusion, 4),
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }

    // References slide
    slides.push({
      id: randomUUID(),
      title: "References",
      markdown: [
        "### Key References",
        report.references
          .slice(0, 8)
          .map((ref, idx) => `${idx + 1}. ${ref}`)
          .join("\n"),
      ]
        .filter(Boolean)
        .join("\n"),
    });

    // Respect requested slide count, but always keep references as last slide
    if (slides.length > requestedSlides) {
      const referenceSlide = slides.pop() as SlideContent;
      const trimmedCore = slides.slice(0, Math.max(0, requestedSlides - 1));
      trimmedCore.push(referenceSlide);
      return trimmedCore;
    }

    return slides;
  }

  private shortenTitle(
    rawTitle: string | undefined,
    topic: string | undefined
  ): string {
    const source: string = rawTitle ?? topic ?? "Presentation";
    const base = source.split("\n")[0].trim();
    if (base.length <= 140) return base;
    return base.slice(0, 137).trimEnd() + "...";
  }

  private toBullets(text: string | undefined, maxBullets: number): string {
    if (!text) return "";
    const sentences = text
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => sentence && sentence.length > 10)
      .slice(0, maxBullets);

    if (!sentences.length) return text;
    return sentences.map((s) => `- ${s.trim()}`).join("\n");
  }

  private sectionReferences(papers: { pmid: string }[] = []): string {
    if (!papers.length) return "";
    const refs = papers
      .slice(0, 2)
      .map(
        (paper) =>
          `PMID ${paper.pmid}: https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`
      )
      .join("\n");
    return refs ? `**References**\n${refs}` : "";
  }
}
