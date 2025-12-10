/**
 * Multi-Agent Deep Research System
 * Uses LangChain PubMed Tool + Cerebras LLM
 * 
 * Architecture:
 * 1. Main Agent: Generates section headings
 * 2. Sub-Agents: Each handles one section independently
 * 3. Final Assembly: Combines all sections into publication-quality report
 */

import Cerebras from "@cerebras/cerebras_cloud_sdk";
// Using fetch API directly for PubMed since LangChain loader may not be available
// We'll implement a simple PubMed API wrapper

// ============================================================================
// Types
// ============================================================================

export interface ResearchConfig {
  topic: string;
  topK?: number; // Papers per section (default: 5)
  nSections?: number; // Number of sections (default: 5)
  onProgress?: (message: string, progress: number) => void;
}

export interface PaperItem {
  pmid: string;
  title: string;
  abstract: string;
  citationNum: number;
}

export interface SectionResult {
  heading: string;
  content: string;
  papers: PaperItem[];
}

export interface ResearchReport {
  title: string;
  abstract: string;
  introduction: string;
  sections: SectionResult[];
  discussion: string;
  conclusion: string;
  references: string[];
  metadata: {
    topic: string;
    wordCount: number;
    paperCount: number;
    generatedAt: string;
  };
}

// ============================================================================
// Multi-Agent Research Service
// ============================================================================

export class MultiAgentResearchService {
  private cerebras: Cerebras;
  private model = "llama-3.3-70b";

  constructor(apiKey: string) {
    this.cerebras = new Cerebras({ apiKey });
  }

  /**
   * Main entry point - generates complete research report
   */
  async generateReport(config: ResearchConfig): Promise<ResearchReport> {
    const { topic, topK = 5, nSections = 5, onProgress } = config;

    onProgress?.("🎯 Starting multi-agent research system...", 0);

    // Step 1: Generate section headings (Main Agent)
    onProgress?.(`📋 Generating ${nSections} section headings...`, 5);
    const headings = await this.generateHeadings(topic, nSections);
    onProgress?.(`✓ Generated headings: ${headings.join(", ")}`, 10);

    // Step 2: Process each section with sub-agents
    const sections: SectionResult[] = [];
    let citationCounter = 1;

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const progress = 10 + ((i + 1) / headings.length) * 70;
      
      onProgress?.(
        `📖 Section ${i + 1}/${headings.length}: ${heading}`,
        progress
      );

      const section = await this.processSection(
        topic,
        heading,
        topK,
        citationCounter
      );
      
      sections.push(section);
      citationCounter += section.papers.length;
      
      onProgress?.(
        `✓ Completed section ${i + 1}/${headings.length} (${section.papers.length} papers)`,
        progress
      );
    }

    // Step 3: Assemble final report
    onProgress?.("📝 Assembling final research article...", 85);
    const report = await this.assembleReport(topic, sections);
    onProgress?.("✓ Research article complete!", 100);

    return report;
  }

  /**
   * Step 1: Main Agent - Generate section headings
   */
  private async generateHeadings(
    topic: string,
    n: number
  ): Promise<string[]> {
    const prompt = `You are a medical research expert. Generate ONLY the section headings, one per line, with no explanations or numbering.

Topic: ${topic}

Generate ${n} major research section headings for a comprehensive literature review on this topic.
Each heading should represent a distinct aspect (e.g., Pathophysiology, Clinical Manifestations, Treatment Approaches, Risk Factors, etc.).

Output ONLY the headings, one per line:`;

    const response = await this.callCerebras(prompt, 500);
    
    // Parse and clean headings
    const lines = response.split("\n").filter((l) => l.trim());
    const headings = lines
      .map((line) => {
        let h = line.trim();
        h = h.replace(/^\d+\.\s*/, ""); // Remove numbering
        h = h.replace(/^[\*\-]\s*/, ""); // Remove bullets
        h = h.replace(/^\*\*(.+?)\*\*:?/, "$1"); // Remove bold
        return h;
      })
      .filter((h) => h.length > 5)
      .slice(0, n);

    // Fallback if parsing fails
    if (headings.length === 0) {
      return [
        "Overview and Epidemiology",
        "Pathophysiology and Mechanisms",
        "Clinical Features and Diagnosis",
        "Treatment and Management",
        "Prognosis and Future Directions",
      ].slice(0, n);
    }

    return headings;
  }

  /**
   * Step 2: Sub-Agent - Process one section
   */
  private async processSection(
    topic: string,
    heading: string,
    topK: number,
    startCitationNum: number
  ): Promise<SectionResult> {
    // Generate focused PubMed query for this section
    const query = await this.generateSectionQuery(topic, heading);

    // Retrieve papers from PubMed
    const papers = await this.retrievePapers(query, topK, startCitationNum);

    // Analyze each paper
    const paperDigests = await Promise.all(
      papers.map((paper) => this.analyzePaper(paper))
    );

    // Synthesize section content
    const content = await this.synthesizeSection(
      topic,
      heading,
      papers,
      paperDigests
    );

    return { heading, content, papers };
  }

  /**
   * Generate focused PubMed query for a specific section
   */
  private async generateSectionQuery(
    topic: string,
    heading: string
  ): Promise<string> {
    const prompt = `You are a PubMed search expert. Generate ONLY the search query with no explanations.

Main topic: ${topic}
Section focus: ${heading}

Generate 1 focused PubMed search query for this specific section:`;

    const response = await this.callCerebras(prompt, 200);
    return response.trim().split("\n")[0].slice(0, 200);
  }

  /**
   * Retrieve papers from PubMed using NCBI E-utilities API
   */
  private async retrievePapers(
    query: string,
    topK: number,
    startCitationNum: number
  ): Promise<PaperItem[]> {
    try {
      // Step 1: Search PubMed for PMIDs
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${topK}&retmode=json`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      const pmids = searchData.esearchresult?.idlist || [];

      if (pmids.length === 0) {
        return [];
      }

      // Step 2: Fetch details for each PMID
      const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=xml`;
      const fetchRes = await fetch(fetchUrl);
      const xmlText = await fetchRes.text();

      // Parse XML (simple extraction)
      const papers: PaperItem[] = [];
      const articleMatches = xmlText.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g);

      let idx = 0;
      for (const match of articleMatches) {
        const article = match[1];
        
        // Extract PMID
        const pmidMatch = article.match(/<PMID[^>]*>(\d+)<\/PMID>/);
        const pmid = pmidMatch ? pmidMatch[1] : pmids[idx] || "";

        // Extract title
        const titleMatch = article.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "Untitled";

        // Extract abstract
        const abstractMatch = article.match(/<Abstract>([\s\S]*?)<\/Abstract>/);
        let abstract = "";
        if (abstractMatch) {
          const abstractTexts = abstractMatch[1].matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
          abstract = Array.from(abstractTexts).map(m => m[1].replace(/<[^>]+>/g, "")).join(" ");
        }

        papers.push({
          pmid,
          title,
          abstract: abstract.slice(0, 4000),
          citationNum: startCitationNum + idx,
        });

        idx++;
      }

      return papers;
    } catch (error) {
      console.error("Error retrieving papers:", error);
      return [];
    }
  }

  /**
   * Analyze a single paper in detail
   */
  private async analyzePaper(paper: PaperItem): Promise<string> {
    const prompt = `You are a medical research analyst. Provide detailed, comprehensive summaries.

Paper: ${paper.title}
PMID: ${paper.pmid}

Abstract:
${paper.abstract}

Provide a DETAILED summary (200-300 words) covering:
- Study design and methodology
- Population/sample characteristics
- Key findings and results (with specific data/statistics if available)
- Clinical implications
- Limitations and future directions
- Conclusion`;

    return await this.callCerebras(prompt, 800);
  }

  /**
   * Synthesize section content from paper analyses
   */
  private async synthesizeSection(
    topic: string,
    heading: string,
    papers: PaperItem[],
    digests: string[]
  ): Promise<string> {
    const paperSummaries = papers
      .map((p, idx) => `[${p.citationNum}] ${p.title}\n${digests[idx]}`)
      .join("\n\n");

    const validCitations = papers.map(p => `[${p.citationNum}]`).join(", ");

    const prompt = `You are a medical researcher writing a detailed section for a literature review.

Main Topic: ${topic}
Section Heading: ${heading}

Paper summaries with citations [n]:
${paperSummaries}

CRITICAL: You MUST ONLY use citations ${validCitations} from the papers above. DO NOT invent or hallucinate citations like [20], [21], [22] etc. that are not in the list.

Write a COMPREHENSIVE section (600-800 words) for this heading:
- Start with an overview paragraph introducing this aspect
- Discuss findings from the papers with citations [n]
- Compare and contrast different studies
- Synthesize key insights
- Include 2-3 relevant subsections if appropriate (use ### for subsection headings)
- Write in academic style with depth and detail

Output the section content in Markdown format:`;

    const content = await this.callCerebras(prompt, 1500);
    
    // Validate and clean citations
    return this.validateCitations(content, papers);
  }

  /**
   * Validate citations and remove hallucinated ones
   */
  private validateCitations(content: string, papers: PaperItem[]): string {
    const validCitations = new Set(papers.map(p => p.citationNum));
    const citationRegex = /\[(\d+)\]/g;
    
    let cleaned = content.replace(citationRegex, (match, num) => {
      const citNum = parseInt(num);
      if (validCitations.has(citNum)) {
        return match; // Keep valid citation
      } else {
        console.warn(`⚠️  Removed hallucinated citation ${match}`);
        return ''; // Remove invalid citation
      }
    });
    
    // Clean up any double spaces left by removed citations
    cleaned = cleaned.replace(/\s+/g, ' ').replace(/\s+\./g, '.');
    
    return cleaned;
  }

  /**
   * Step 3: Assemble final report
   */
  private async assembleReport(
    topic: string,
    sections: SectionResult[]
  ): Promise<ResearchReport> {
    const sectionsText = sections
      .map((s) => `## ${s.heading}\n\n${s.content}`)
      .join("\n\n");

    // Get all valid citations from all sections
    const allPapers = sections.flatMap(s => s.papers);
    const allValidCitations = allPapers.map(p => `[${p.citationNum}]`).join(", ");

    const prompt = `You are a senior medical researcher assembling a comprehensive literature review. PRESERVE all section content - do not summarize or shorten the provided sections.

Topic: ${topic}

Below are detailed sections that have already been written:

${sectionsText}

CRITICAL CITATION RULES:
- The sections above contain citations: ${allValidCitations}
- DO NOT add new citations in Abstract, Introduction, Discussion, or Conclusion
- DO NOT invent citations that don't exist in the sections
- Only reference findings "as discussed above" or "as shown in the sections"

Create a complete research article by adding:

1. A compelling title
2. An abstract (300-400 words) summarizing all sections
3. An introduction (400-500 words) providing context
4. ALL the provided sections (KEEP THEM INTACT - do not summarize)
5. A discussion section (400-500 words) synthesizing findings
6. A conclusion (300-400 words)

Format:
# [Title]

## Abstract
[Your abstract here]

## Introduction
[Your introduction here]

[INSERT ALL PROVIDED SECTIONS HERE EXACTLY AS GIVEN]

## Discussion and Synthesis
[Your discussion here]

## Conclusion
[Your conclusion here]

CRITICAL: Include ALL provided section content verbatim. Do not shorten or summarize the sections.`;

    const assembled = await this.callCerebras(prompt, 3000);
    
    // Validate citations in the assembled report
    const validatedAssembly = this.validateCitations(assembled, allPapers);

    // Parse the validated assembled content
    const titleMatch = validatedAssembly.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1] ?? `Research Review: ${topic}`;

    const abstractMatch = validatedAssembly.match(
      /##\s+Abstract\s+([\s\S]+?)(?=##|$)/i
    );
    const abstract = abstractMatch?.[1]?.trim() ?? "";

    const introMatch = validatedAssembly.match(
      /##\s+Introduction\s+([\s\S]+?)(?=##|$)/i
    );
    const introduction = introMatch?.[1]?.trim() ?? "";

    const discussionMatch = validatedAssembly.match(
      /##\s+Discussion(?:\s+and\s+Synthesis)?\s+([\s\S]+?)(?=##|$)/i
    );
    const discussion = discussionMatch?.[1]?.trim() ?? "";

    const conclusionMatch = validatedAssembly.match(
      /##\s+Conclusion\s+([\s\S]+?)$/i
    );
    const conclusion = conclusionMatch?.[1]?.trim() ?? "";

    // Build references (allPapers already declared above)
    const references = allPapers.map(
      (p) =>
        `${p.citationNum}. ${p.title}. PMID: ${p.pmid}. https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`
    );

    // Calculate word count
    const fullText = `${abstract} ${introduction} ${sectionsText} ${discussion} ${conclusion}`;
    const wordCount = fullText.split(/\s+/).length;

    return {
      title,
      abstract,
      introduction,
      sections,
      discussion,
      conclusion,
      references,
      metadata: {
        topic,
        wordCount,
        paperCount: allPapers.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Helper: Call Cerebras API with retry logic and rate limiting
   */
  private async callCerebras(
    prompt: string,
    maxTokens: number,
    retries = 2
  ): Promise<string> {
    // Add small delay to avoid rate limiting (stagger requests)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`Calling Cerebras API (attempt ${attempt + 1}/${retries + 1}, max_tokens: ${maxTokens}, prompt length: ${prompt.length})`);
        
        const stream = await this.cerebras.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: "system",
              content: "You are a medical research assistant.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          stream: true,
          max_completion_tokens: maxTokens,
          temperature: 0.7,
          top_p: 0.8,
        });

        let result = "";
        let chunkCount = 0;
        
        for await (const chunk of stream) {
          chunkCount++;
          const content = (chunk as any).choices?.[0]?.delta?.content || "";
          result += content;
        }

        console.log(`✓ Cerebras API success: ${chunkCount} chunks, ${result.length} chars`);
        return result.trim();
      } catch (error: any) {
        console.error(`✗ Cerebras API error (attempt ${attempt + 1}/${retries + 1}):`, {
          message: error?.message,
          status: error?.status,
          code: error?.code,
          type: error?.type,
        });
        
        // Don't retry on auth errors
        if (error?.status === 401) {
          throw new Error("Cerebras API authentication failed. Check your CEREBRAS_API_KEY in .env file.");
        }
        
        // Don't retry on model not found
        if (error?.status === 404) {
          throw new Error(`Cerebras model '${this.model}' not found. Try 'llama-3.3-70b' or 'llama3.1-8b'.`);
        }
        
        // Retry on rate limits or server errors
        if (attempt < retries && (error?.status === 429 || error?.status >= 500)) {
          // Longer delay for rate limits
          const baseDelay = error?.status === 429 ? 5000 : 1000;
          const delay = Math.pow(2, attempt) * baseDelay; // Exponential backoff
          console.log(`⏳ Rate limit hit. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Last attempt or non-retryable error
        if (error?.message) {
          throw new Error(`Cerebras API error: ${error.message}`);
        } else {
          throw new Error("Failed to call Cerebras API. Check server logs for details.");
        }
      }
    }
    
    throw new Error("Failed to call Cerebras API after all retries.");
  }

  /**
   * Format report as Markdown
   */
  static formatAsMarkdown(report: ResearchReport): string {
    const sections = report.sections
      .map((s) => `## ${s.heading}\n\n${s.content}`)
      .join("\n\n");

    const references = report.references
      .map((ref, idx) => `${idx + 1}. ${ref}`)
      .join("\n");

    return `# ${report.title}

## Abstract

${report.abstract}

## Introduction

${report.introduction}

${sections}

## Discussion and Synthesis

${report.discussion}

## Conclusion

${report.conclusion}

## References

${references}

---

**Metadata:**
- Topic: ${report.metadata.topic}
- Word Count: ${report.metadata.wordCount.toLocaleString()}
- Papers Cited: ${report.metadata.paperCount}
- Generated: ${new Date(report.metadata.generatedAt).toLocaleString()}
`;
  }
}
