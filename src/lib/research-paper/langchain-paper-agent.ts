/**
 * LangChain Research Paper Agent
 * Uses the same multi-agent architecture as deep research
 * but generates academic research papers with proper structure
 */

import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { GoogleGenAI } from "@google/genai";
import { PubMedService, PMIDData } from "../deep-research/pubmed-service";
import { FallbackResearchService } from "../deep-research/fallback-sources";

// ============================================================================
// Types
// ============================================================================

export interface PaperConfig {
  topic: string;
  topK?: number; // Papers per section (default: 5)
  nSections?: number; // Number of sections (default: 6)
  onProgress?: (message: string, progress: number) => void;
}

export interface PaperItem {
  PMID: string;
  Title: string;
  Text: string;
  citationNum: number;
}

export interface PaperSection {
  heading: string;
  content: string;
  papers: PaperItem[];
}

export interface ResearchPaper {
  title: string;
  abstract: string;
  keywords: string[];
  introduction: string;
  sections: PaperSection[];
  methodology: string;
  results: string;
  discussion: string;
  conclusion: string;
  references: string[];
  metadata: {
    wordCount: number;
    paperCount: number;
    generatedAt: string;
  };
}

// ============================================================================
// Cerebras LLM Wrapper
// ============================================================================

class CerebrasLLM {
  private client: Cerebras;
  private gemini: GoogleGenAI | null = null;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(
    apiKey: string,
    model = "llama-3.3-70b",
    temperature = 0.7,
    maxTokens = 8192
  ) {
    this.client = new Cerebras({ apiKey });
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
    
    // Initialize Gemini fallback
    const geminiKey = process.env.GOOGLE_AI_API_KEY;
    if (geminiKey) {
      this.gemini = new GoogleGenAI({ apiKey: geminiKey });
      console.log("✅ Gemini fallback initialized (Research Paper)");
    }
  }

  async invoke(prompt: string): Promise<string> {
    const maxChars = (this.maxTokens - 1000) * 4;
    if (prompt.length > maxChars) {
      prompt = prompt.slice(0, maxChars) + "\n[Content truncated]";
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are an academic research paper writer." },
          { role: "user", content: prompt },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const content = (response.choices as any)?.[0]?.message?.content;
      return typeof content === "string" ? content.trim() : "";
    } catch (error: any) {
      // Fallback to Gemini on any error
      if (this.gemini) {
        const errorType = error?.status === 503 ? "503 high traffic" : error?.message || "unknown";
        console.warn(`⚠️  Cerebras error (${errorType}), falling back to Gemini...`);
        return await this.invokeGemini(prompt);
      }
      console.error("Cerebras API error:", error);
      throw error;
    }
  }

  private async invokeGemini(prompt: string): Promise<string> {
    if (!this.gemini) {
      throw new Error("Gemini fallback not available");
    }

    try {
      const fullPrompt = `You are an academic research paper writer.\n\n${prompt}`;
      const response = await this.gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
          temperature: this.temperature,
          maxOutputTokens: this.maxTokens,
        },
      });
      
      const content = response.text || "";
      console.log("✅ Gemini generation successful (Research Paper)");
      return content.trim();
    } catch (error: any) {
      console.error("❌ Gemini generation failed:", error.message);
      throw new Error(`Both Cerebras and Gemini failed. Last error: ${error.message}`);
    }
  }
}

// ============================================================================
// PubMed Wrapper (using shared PubMedService for global deduplication)
// ============================================================================

class PubMedWrapper {
  private topK: number;
  private pubmedService: PubMedService;

  constructor(topK = 10) {
    this.topK = topK;
    this.pubmedService = new PubMedService();
  }

  async load(query: string): Promise<PaperItem[]> {
    try {
      console.log(`🔍 PubMed query: "${query}"`);

      // Use shared PubMedService for global deduplication
      const { pmids, metadata } = await this.pubmedService.getResearchData(query, this.topK);

      if (pmids.length === 0) {
        console.warn(`⚠️  No papers found for query: "${query}"`);
        return [];
      }

      // Convert PMIDData to PaperItem format
      const docs: PaperItem[] = pmids.map((pmid, idx) => {
        const data = metadata[pmid];
        if (!data) {
          return {
            PMID: pmid,
            Title: "Untitled",
            Text: "",
            citationNum: 0,
          };
        }

        return {
          PMID: pmid,
          Title: data.title,
          Text: data.abstract || "",
          citationNum: 0,
        };
      }).filter(doc => doc.Title !== "Untitled"); // Filter out failed fetches

      console.log(`✅ Retrieved ${docs.length} unique papers (global tracker: ${PubMedService['globalUsedPMIDs'].size} total)`);
      return docs;
    } catch (error) {
      console.error("PubMed fetch error:", error);
      return [];
    }
  }
}

// ============================================================================
// LangChain Research Paper Agent
// ============================================================================

export class LangChainPaperAgent {
  private llm: CerebrasLLM;
  private pubmed: PubMedWrapper;
  private onProgress?: (message: string, progress: number) => void;

  constructor(apiKey: string) {
    this.llm = new CerebrasLLM(apiKey);
    this.pubmed = new PubMedWrapper(10); // Default topK = 10
  }

  /**
   * Main entry point for research paper generation
   */
  async generatePaper(config: PaperConfig): Promise<ResearchPaper> {
    const { topic, topK = 10, nSections = 6, onProgress } = config;
    this.onProgress = onProgress;
    this.pubmed = new PubMedWrapper(topK);

    // Reset global trackers for new research session
    PubMedService.resetGlobalUsedPMIDs();
    FallbackResearchService.resetGlobalUsedPapers();
    console.log('🆕 Starting new research paper session with fresh trackers');

    this.reportProgress("🎯 Starting research paper generation...", 0);

    // Step 1: Generate paper structure
    this.reportProgress("📋 Planning paper structure...", 5);
    const structure = await this.generatePaperStructure(topic, nSections);

    // Step 2: Process each section (sub-agents)
    this.reportProgress(
      `📚 Processing ${structure.sections.length} sections...`,
      15
    );
    const sections: PaperSection[] = [];
    let citationCounter = 1;

    for (let i = 0; i < structure.sections.length; i++) {
      const progress = 15 + ((i + 1) / structure.sections.length) * 60;
      this.reportProgress(
        `📖 Section ${i + 1}/${structure.sections.length}: ${structure.sections[i]}`,
        progress
      );

      const section = await this.processSection(
        topic,
        structure.sections[i],
        citationCounter
      );
      sections.push(section);
      citationCounter += section.papers.length;
    }

    // Step 3: Generate methodology and results
    this.reportProgress("🔬 Writing methodology and results...", 80);
    const methodology = await this.generateMethodology(topic, sections);
    const results = await this.generateResults(topic, sections);

    // Step 4: Assemble final paper
    this.reportProgress("✍️ Assembling final research paper...", 90);
    const paper = await this.assemblePaper(topic, structure, sections, methodology, results);

    this.reportProgress("✅ Research paper complete!", 100);
    return paper;
  }

  /**
   * Generate paper structure (title, abstract, sections)
   */
  private async generatePaperStructure(
    topic: string,
    nSections: number
  ): Promise<{ title: string; abstract: string; keywords: string[]; sections: string[] }> {
    const prompt = `You are planning an academic research paper on: "${topic}"

Generate the following:
1. A compelling academic title (10-15 words)
2. Section headings for the main body (${nSections} sections)
3. 5-7 keywords

Format your response EXACTLY as:
TITLE: [your title]
KEYWORDS: keyword1, keyword2, keyword3, keyword4, keyword5
SECTIONS:
- Section 1 heading
- Section 2 heading
- Section 3 heading
...

The sections should cover different aspects like:
- Background/Literature Review
- Pathophysiology/Mechanisms
- Clinical Features/Diagnosis
- Treatment Approaches
- Outcomes/Prognosis
- Future Directions

Generate now:`;

    const response = await this.llm.invoke(prompt);

    // Parse response
    const titleMatch = response.match(/TITLE:\s*(.+)/i);
    const title = titleMatch?.[1]?.trim() || `Research Paper: ${topic}`;

    const keywordsMatch = response.match(/KEYWORDS:\s*(.+)/i);
    const keywords = keywordsMatch?.[1]
      ?.split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0) || [];

    const sectionsMatch = response.match(/SECTIONS:\s*([\s\S]+)/i);
    const sectionLines = sectionsMatch?.[1]?.split("\n") || [];
    const sections: string[] = [];

    for (let line of sectionLines) {
      line = line.trim();
      line = line.replace(/^[\d\-\*\.]+\s*/, ""); // Remove bullets/numbers
      if (line && line.length > 5) {
        sections.push(line);
      }
    }

    console.log(`✓ Paper structure:`, { title, keywords, sections: sections.length });
    return {
      title,
      abstract: "", // Will be generated later
      keywords: keywords.slice(0, 7),
      sections: sections.slice(0, nSections),
    };
  }

  /**
   * Process a single section (sub-agent)
   */
  private async processSection(
    topic: string,
    heading: string,
    startCitationNum: number
  ): Promise<PaperSection> {
    // Generate query
    const query = await this.generateSectionQuery(topic, heading);

    // Retrieve papers
    const papers = await this.pubmed.load(query);

    // Assign citation numbers
    papers.forEach((paper, idx) => {
      paper.citationNum = startCitationNum + idx;
    });

    // Analyze papers
    const digests: string[] = [];
    for (const paper of papers) {
      const digest = await this.analyzePaper(paper, heading);
      digests.push(`[${paper.citationNum}] ${paper.Title}\n${digest.trim()}`);
    }

    // Synthesize section
    const content =
      digests.length > 0
        ? await this.synthesizeSection(heading, topic, digests)
        : "Further research is needed in this area.";

    return { heading, content, papers };
  }

  /**
   * Generate PubMed query
   */
  private async generateSectionQuery(
    topic: string,
    heading: string
  ): Promise<string> {
    const prompt = `Generate a focused PubMed search query.

Topic: ${topic}
Section: ${heading}

Return ONLY the search query (no explanation):`;

    const response = await this.llm.invoke(prompt);
    const query = response.trim().split("\n")[0].slice(0, 200);
    console.log(`  Query: ${query.slice(0, 80)}...`);
    return query;
  }

  /**
   * Analyze paper
   */
  private async analyzePaper(
    paper: PaperItem,
    heading: string
  ): Promise<string> {
    const prompt = `Analyze this paper for an academic research paper section on "${heading}":

PMID: ${paper.PMID}
Title: ${paper.Title}
Abstract: ${paper.Text.slice(0, 3000)}

Provide a detailed academic summary (150-200 words) covering:
- Study design and methodology
- Key findings with specific data
- Clinical/scientific significance
- Limitations

Write in formal academic style:`;

    return await this.llm.invoke(prompt);
  }

  /**
   * Synthesize section
   */
  private async synthesizeSection(
    heading: string,
    topic: string,
    digests: string[]
  ): Promise<string> {
    const prompt = `Write an academic research paper section on "${heading}" for a paper about "${topic}".

Paper summaries with citations:
${digests.join("\n\n")}

Requirements:
- 500-700 words
- Formal academic style
- Cite all sources [1], [2], etc.
- Compare and synthesize findings
- Include critical analysis
- Use subsections (###) if appropriate
- Write in third person

Write the section:`;

    return await this.llm.invoke(prompt);
  }

  /**
   * Generate methodology section
   */
  private async generateMethodology(
    topic: string,
    sections: PaperSection[]
  ): Promise<string> {
    const totalPapers = sections.reduce((sum, s) => sum + s.papers.length, 0);

    const prompt = `Write a Methodology section for a systematic review on "${topic}".

Information:
- Total papers reviewed: ${totalPapers}
- Sections analyzed: ${sections.map(s => s.heading).join(", ")}
- Database: PubMed/MEDLINE
- Search strategy: Systematic literature review

Write a formal Methodology section (400-500 words) covering:
- Search strategy and databases
- Inclusion/exclusion criteria
- Data extraction process
- Quality assessment
- Analysis approach

Use formal academic style:`;

    return await this.llm.invoke(prompt);
  }

  /**
   * Generate results section
   */
  private async generateResults(
    topic: string,
    sections: PaperSection[]
  ): Promise<string> {
    const totalPapers = sections.reduce((sum, s) => sum + s.papers.length, 0);
    const sectionSummaries = sections
      .map((s) => `${s.heading}: ${s.papers.length} papers`)
      .join("\n");

    const prompt = `Write a Results section for a systematic review on "${topic}".

Search results:
- Total papers included: ${totalPapers}
- Distribution:
${sectionSummaries}

Write a formal Results section (400-500 words) covering:
- Search results and paper selection
- Characteristics of included studies
- Quality assessment outcomes
- Key themes identified
- Data synthesis overview

Use formal academic style with specific numbers:`;

    return await this.llm.invoke(prompt);
  }

  /**
   * Assemble final paper
   */
  private async assemblePaper(
    topic: string,
    structure: any,
    sections: PaperSection[],
    methodology: string,
    results: string
  ): Promise<ResearchPaper> {
    const allPapers = sections.flatMap((s) => s.papers);
    const sectionsText = sections
      .map((s) => `## ${s.heading}\n\n${s.content}`)
      .join("\n\n");

    // Generate abstract
    const abstractPrompt = `Write an academic abstract (250-300 words) for this research paper:

Title: ${structure.title}
Topic: ${topic}

The paper includes:
- ${sections.length} main sections
- ${allPapers.length} papers reviewed
- Methodology: Systematic literature review
- Sections: ${sections.map(s => s.heading).join(", ")}

Write a structured abstract with:
- Background
- Objective
- Methods
- Results
- Conclusion

Use formal academic style:`;

    const abstract = await this.llm.invoke(abstractPrompt);

    // Generate introduction
    const introPrompt = `Write an Introduction section (500-600 words) for this research paper:

Title: ${structure.title}
Topic: ${topic}

Cover:
- Background and significance
- Current state of knowledge
- Knowledge gaps
- Study objectives
- Paper organization

Use formal academic style with citations where appropriate:`;

    const introduction = await this.llm.invoke(introPrompt);

    // Generate discussion
    const discussionPrompt = `Write a Discussion section (600-700 words) for this systematic review on "${topic}".

Key findings from ${sections.length} sections covering:
${sections.map(s => s.heading).join("\n")}

Total papers: ${allPapers.length}

Cover:
- Summary of key findings
- Comparison with existing literature
- Clinical/scientific implications
- Strengths and limitations
- Future research directions

Use formal academic style:`;

    const discussion = await this.llm.invoke(discussionPrompt);

    // Generate conclusion
    const conclusionPrompt = `Write a Conclusion section (300-400 words) for this systematic review on "${topic}".

Summarize:
- Main findings
- Clinical/scientific significance
- Recommendations
- Future directions

Use formal academic style:`;

    const conclusion = await this.llm.invoke(conclusionPrompt);

    // Build references
    const references = allPapers.map(
      (p, i) =>
        `${i + 1}. ${p.Title}. PubMed ID: ${p.PMID}. Available from: https://pubmed.ncbi.nlm.nih.gov/${p.PMID}/`
    );

    // Calculate word count
    const fullText = `${abstract} ${introduction} ${sectionsText} ${methodology} ${results} ${discussion} ${conclusion}`;
    const wordCount = fullText.split(/\s+/).length;

    console.log(`✔ Research paper complete`);
    console.log(`  📊 Word count: ${wordCount.toLocaleString()} words`);
    console.log(`  📚 References: ${allPapers.length} papers`);

    return {
      title: structure.title,
      abstract,
      keywords: structure.keywords,
      introduction,
      sections,
      methodology,
      results,
      discussion,
      conclusion,
      references,
      metadata: {
        wordCount,
        paperCount: allPapers.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Report progress
   */
  private reportProgress(message: string, progress: number) {
    console.log(`[${progress}%] ${message}`);
    this.onProgress?.(message, progress);
  }

  /**
   * Format paper as markdown
   */
  static formatAsMarkdown(paper: ResearchPaper): string {
    const sections = paper.sections
      .map((s) => `## ${s.heading}\n\n${s.content}`)
      .join("\n\n");

    const keywords = paper.keywords.join("; ");
    const references = paper.references.map((ref) => `${ref}`).join("\n");

    return `# ${paper.title}

**Keywords:** ${keywords}

## Abstract

${paper.abstract}

## 1. Introduction

${paper.introduction}

${sections}

## Methodology

${paper.methodology}

## Results

${paper.results}

## Discussion

${paper.discussion}

## Conclusion

${paper.conclusion}

## References

${references}

---

*Generated on ${new Date(paper.metadata.generatedAt).toLocaleString()}*  
*Word count: ${paper.metadata.wordCount.toLocaleString()} | References: ${paper.metadata.paperCount}*  
*Powered by [BioDocs.ai](https://www.biodocs.ai)*
`;
  }
}
