/**
 * LangChain Deep Research Agent with Cerebras
 */

import { Cerebras } from "@cerebras/cerebras_cloud_sdk";
import { PubMedService } from "./pubmed-service";

export interface ResearchProgress {
  phase: string;
  progress: number;
  message: string;
}

export class DeepResearchAgent {
  private client: Cerebras;
  private pubmedService: PubMedService;
  private onProgress?: (progress: ResearchProgress) => void;
  private cleanedTopic: string = "";

  constructor(apiKey: string, onProgress?: (progress: ResearchProgress) => void) {
    this.client = new Cerebras({
      apiKey,
    });
    
    this.pubmedService = new PubMedService();
    this.onProgress = onProgress;
  }

  private updateProgress(phase: string, progress: number, message: string) {
    if (this.onProgress) {
      this.onProgress({ phase, progress, message });
    }
  }

  /**
   * Generate comprehensive research report - Section by Section
   */
  async generateReport(topic: string): Promise<{
    markdown: string;
    pmids: string[];
    wordCount: number;
    metadata: any;
    cleanedTopic: string;
  }> {
    this.updateProgress('initialization', 10, 'Starting research...');

    // Phase 1: Collect PMIDs
    this.updateProgress('pubmed', 20, 'Searching PubMed database...');
    const { pmids, metadata, cleanedTopic } = await this.pubmedService.getResearchData(topic, 20);
    
    // Store cleaned topic for use in report
    this.cleanedTopic = cleanedTopic;
    
    this.updateProgress('pubmed', 40, `Found ${pmids.length} relevant articles`);

    // Phase 2: Generate report sections ONE BY ONE
    this.updateProgress('generation', 45, 'Starting section-by-section generation...');
    
    const sections = await this.generateAllSections(cleanedTopic, pmids, metadata);
    
    // Combine all sections - use cleaned topic for title
    let markdown = `# Research Report: ${this.formatTitle(cleanedTopic)}\n\n`;
    markdown += sections.join('\n\n');

    this.updateProgress('generation', 90, 'Formatting citations...');

    // Phase 3: Add references section
    markdown = this.addReferencesSection(markdown, pmids, metadata);

    this.updateProgress('completion', 100, 'Research complete!');

    const wordCount = markdown.split(/\s+/).length;

    console.log(`✅ Final report: ${wordCount} words across ${sections.length} sections`);

    return {
      markdown,
      pmids,
      wordCount,
      metadata,
      cleanedTopic: this.cleanedTopic,
    };
  }

  /**
   * Format topic into proper title case
   */
  private formatTitle(topic: string): string {
    return topic
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Generate all sections separately for guaranteed word count
   */
  private async generateAllSections(topic: string, pmids: string[], metadata: any): Promise<string[]> {
    const sections: string[] = [];
    const sectionConfigs = [
      { name: 'Executive Summary', targetWords: 600, progress: 50 },
      { name: 'Introduction', targetWords: 1200, progress: 55 },
      { name: 'Literature Review', targetWords: 1800, progress: 62 },
      { name: 'Clinical Analysis', targetWords: 1800, progress: 70 },
      { name: 'Recent Advances', targetWords: 1200, progress: 77 },
      { name: 'Controversies and Debates', targetWords: 1000, progress: 82 },
      { name: 'Future Directions', targetWords: 1000, progress: 87 },
      { name: 'Conclusion', targetWords: 600, progress: 90 },
    ];

    for (const config of sectionConfigs) {
      this.updateProgress('generation', config.progress, `Writing ${config.name}...`);
      
      const sectionContent = await this.generateSection(
        config.name,
        topic,
        pmids,
        metadata,
        config.targetWords
      );
      
      sections.push(sectionContent);
      console.log(`✅ Generated ${config.name}: ${sectionContent.split(/\s+/).length} words`);
    }

    return sections;
  }

  /**
   * Generate a single section with specific word count target
   */
  private async generateSection(
    sectionName: string,
    topic: string,
    pmids: string[],
    metadata: any,
    targetWords: number
  ): Promise<string> {
    const citationList = pmids.slice(0, 20).map((pmid, idx) => {
      const data = metadata[pmid];
      return `[${idx + 1}] PMID ${pmid}: ${data?.title || 'Research article'}`;
    }).join('\n');

    const prompt = `You are writing the "${sectionName}" section of a comprehensive medical research report on "${topic}".

AVAILABLE CITATIONS:
${citationList}

REQUIREMENTS FOR THIS SECTION:
- Write EXACTLY ${targetWords} words (this is CRITICAL)
- Write ${Math.ceil(targetWords / 150)} detailed paragraphs
- Each paragraph must be 120-150 words
- Include specific medical data, statistics, and study details
- Cite sources frequently using [1], [2], [3] format
- Use professional medical terminology
- NO bullet points - ONLY full paragraphs
- Be comprehensive and detailed, NOT a summary

Write the complete "${sectionName}" section now (${targetWords} words minimum):`;

    const stream = await this.client.chat.completions.create({
      model: "llama-3.3-70b",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_completion_tokens: Math.ceil(targetWords * 2), // Give enough tokens
      temperature: 0.8,
    });

    let content = `## ${sectionName}\n\n`;
    for await (const chunk of stream) {
      const text = (chunk as any).choices?.[0]?.delta?.content;
      if (text) {
        content += text;
      }
    }

    return content;
  }

  private buildReportPrompt(topic: string, pmids: string[], metadata: any): string {
    const citationList = pmids.map((pmid, idx) => {
      const data = metadata[pmid];
      return `[${idx + 1}] PMID ${pmid}: ${data?.title || 'Research article'}`;
    }).join('\n');

    return `You are an expert medical research writer. Generate an EXTREMELY COMPREHENSIVE and DETAILED research report on: "${topic}"

AVAILABLE CITATIONS (use these PMID numbers throughout):
${citationList}

🚨 CRITICAL REQUIREMENTS - YOU MUST FOLLOW EXACTLY:

WORD COUNT TARGETS (MINIMUM):
- Executive Summary: 600 words (6-7 paragraphs)
- Introduction: 1200 words (12-15 paragraphs)
- Literature Review: 1800 words (18-20 paragraphs)
- Clinical Analysis: 1800 words (18-20 paragraphs)
- Recent Advances: 1200 words (12-15 paragraphs)
- Controversies & Debates: 1000 words (10-12 paragraphs)
- Future Directions: 1000 words (10-12 paragraphs)
- Conclusion: 600 words (6-7 paragraphs)

TOTAL TARGET: 8000-9000 WORDS MINIMUM

WRITING RULES:
1. Each paragraph MUST be 120-150 words (8-10 sentences)
2. Include specific statistics, percentages, and numbers
3. Cite multiple sources per paragraph [1], [2], [3]
4. Use technical medical terminology
5. Provide detailed explanations, not summaries
6. Include study methodologies and sample sizes
7. Discuss clinical implications thoroughly
8. NO bullet points - ONLY full paragraphs

STRUCTURE FOR EACH SECTION:

## Executive Summary
Write 6-7 detailed paragraphs covering:
- Historical context and disease burden
- Current understanding and pathophysiology
- Diagnostic approaches and criteria
- Treatment landscape and outcomes
- Recent breakthroughs and innovations
- Future outlook and recommendations

## Introduction
Write 12-15 detailed paragraphs covering:
- Comprehensive background and history
- Detailed epidemiology with global statistics
- Pathophysiology at molecular level
- Clinical presentation variations
- Diagnostic challenges and evolution
- Treatment paradigms over time
- Economic and social impact
- Scope and objectives of this report

## Literature Review
Write 18-20 detailed paragraphs covering:
- Historical evolution of understanding
- Landmark studies and their impact
- Systematic reviews and meta-analyses
- Major clinical trials with detailed results
- Comparative effectiveness studies
- Quality of evidence assessments
- Geographic and demographic variations
- Methodological considerations

## Clinical Analysis
Write 18-20 detailed paragraphs covering:
- Detailed pathophysiology mechanisms
- Genetic and environmental factors
- Complete diagnostic workup
- Differential diagnosis considerations
- First-line treatment protocols
- Second-line and alternative therapies
- Combination therapy strategies
- Monitoring and follow-up protocols
- Adverse effects and management
- Special populations considerations

## Recent Advances
Write 12-15 detailed paragraphs covering:
- Breakthrough discoveries (2023-2025)
- Novel therapeutic approaches
- Emerging diagnostic technologies
- Precision medicine applications
- Biomarker development
- Clinical trial results
- Regulatory approvals
- Implementation challenges

## Controversies and Debates
Write 10-12 detailed paragraphs covering:
- Conflicting evidence in literature
- Diagnostic criteria debates
- Treatment approach disagreements
- Guideline discrepancies
- Cost-effectiveness controversies
- Ethical considerations
- Unresolved clinical questions

## Future Directions
Write 10-12 detailed paragraphs covering:
- Research gaps and priorities
- Promising investigational therapies
- Technology integration opportunities
- Healthcare delivery innovations
- Policy and guideline needs
- Global health considerations
- Long-term research agenda

## Conclusion
Write 6-7 detailed paragraphs covering:
- Comprehensive summary of findings
- Key clinical takeaways
- Practice recommendations
- Research implications
- Future outlook
- Final perspectives

REMEMBER: 
- Write FULL detailed paragraphs, NOT summaries
- Each paragraph = 120-150 words minimum
- Include specific data, statistics, study details
- Cite sources frequently [1], [2], [3]
- Be thorough and comprehensive
- DO NOT include References section (added automatically)

BEGIN WRITING THE COMPLETE 8000+ WORD REPORT NOW:`;
  }

  private addReferencesSection(markdown: string, pmids: string[], metadata: any): string {
    let references = '\n\n## References\n\n';
    
    pmids.forEach((pmid, idx) => {
      const data = metadata[pmid];
      if (data) {
        references += `[${idx + 1}] ${data.authors}. ${data.title}. *${data.journal}*. ${data.year}. PMID: ${pmid}. [View on PubMed](https://pubmed.ncbi.nlm.nih.gov/${pmid}/)\n\n`;
      }
    });

    return markdown + references;
  }
}
