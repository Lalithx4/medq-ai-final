/**
 * Research Paper Agent
 * Generates academic papers using Deep Research + Citation Formatting
 */

import { ResearchPaperConfig } from './paper-config';
import { CitationFormatter } from './citation-formatter';
import { AcademicPromptGenerator } from './academic-prompt-generator';
import { MultiSourceService } from '../deep-research/multi-source-service';
import { SourceRelevanceScorer } from './source-relevance-scorer';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

export interface ResearchPaperResult {
  markdown: string;
  wordCount: number;
  referenceCount: number;
  sources: any[];
  config: ResearchPaperConfig;
  sections: string[];
}

export class ResearchPaperAgent {
  private multiSourceService: MultiSourceService;
  private cerebrasClient: Cerebras;

  constructor(apiKey: string) {
    this.multiSourceService = new MultiSourceService();
    this.cerebrasClient = new Cerebras({ apiKey });
  }

  /**
   * Generate complete research paper
   */
  async generatePaper(config: ResearchPaperConfig): Promise<ResearchPaperResult> {
    console.log(`📝 Generating ${config.essayType} at ${config.academicLevel} level`);
    console.log(`   Topic: ${config.topic}`);
    console.log(`   Style: ${config.citationStyle}`);
    console.log(`   Target: ${config.targetWordCount} words`);

    // Step 1: Collect sources from multiple databases
    console.log(`🔍 Searching sources...`);
    const { results: allSources } = await this.multiSourceService.searchAll(
      config.topic,
      config.sources,
      config.minReferences * 2 // Get more to filter
    );

    console.log(`📥 Retrieved ${allSources.length} total sources`);

    // Step 2: CRITICAL - Filter sources by relevance
    const requiredKeywords = SourceRelevanceScorer.extractRequiredKeywords(config.topic);
    const { filtered: sources } = SourceRelevanceScorer.filterSources(
      allSources,
      config.topic,
      requiredKeywords,
      30 // Minimum score of 30/100 (lowered to accept more papers while still filtering spam)
    );

    console.log(`✅ ${sources.length} sources passed relevance filter`);

    // Be very flexible - allow if we have at least 30% of required sources or minimum 5 sources
    const minRequired = Math.max(5, Math.floor(config.minReferences * 0.3));
    
    if (sources.length < minRequired) {
      throw new Error(`Only found ${sources.length} relevant sources. Need at least ${minRequired} sources (30% of ${config.minReferences}). Try a broader topic or check if sources are available.`);
    }

    if (sources.length < config.minReferences) {
      console.log(`⚠️ Found ${sources.length} sources (requested ${config.minReferences}). Proceeding with available sources.`);
    }

    // Step 2: Generate paper content
    console.log(`✍️ Generating paper content...`);
    const content = await this.generateContent(config, sources);

    // Step 3: Apply citation formatting
    console.log(`📚 Formatting citations...`);
    const formattedContent = CitationFormatter.applyCitationsToText(
      content,
      sources,
      config.citationStyle
    );

    // Step 4: Add references section
    const referenceList = CitationFormatter.formatReferenceList(
      sources,
      config.citationStyle
    );

    const finalMarkdown = `${formattedContent}\n\n${referenceList}`;

    // Calculate metrics
    const wordCount = finalMarkdown.split(/\s+/).length;
    const sections = this.extractSections(finalMarkdown);

    console.log(`✅ Paper generated: ${wordCount} words, ${sources.length} references`);

    return {
      markdown: finalMarkdown,
      wordCount,
      referenceCount: sources.length,
      sources,
      config,
      sections
    };
  }

  /**
   * Let LLM understand and clean the topic (fix typos, clarify intent)
   */
  private async understandTopic(topic: string): Promise<string> {
    try {
      const response = await this.cerebrasClient.chat.completions.create({
        model: 'llama-3.3-70b',
        messages: [{
          role: 'user',
          content: `You are a medical research assistant. The user wants to research: "${topic}"

Fix any spelling errors and return ONLY the corrected medical topic. Be concise.

Examples:
- "liver cirroshihs" → "liver cirrhosis"
- "diabetis type 2" → "type 2 diabetes"
- "hart attack" → "heart attack"

Corrected topic:`
        }],
        temperature: 0.3,
        max_completion_tokens: 50,
        stream: false
      });

      const cleaned = (response.choices[0] as any)?.message?.content?.trim() || topic;
      return cleaned;
    } catch (error) {
      console.error('Error understanding topic:', error);
      return topic; // Fallback to original
    }
  }

  /**
   * Generate paper content using Cerebras
   */
  private async generateContent(
    config: ResearchPaperConfig,
    sources: any[]
  ): Promise<string> {
    const systemPrompt = AcademicPromptGenerator.generateSystemPrompt(config);
    const userPrompt = AcademicPromptGenerator.generateCompletePaperPrompt(config, sources);

    const response = await this.cerebrasClient.chat.completions.create({
      model: 'llama-3.3-70b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_completion_tokens: 16384,
      stream: false
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generate paper section by section (more control)
   */
  async generatePaperBySection(config: ResearchPaperConfig): Promise<ResearchPaperResult> {
    console.log(`📝 Generating ${config.essayType} section by section`);
    console.log(`📝 Original topic: "${config.topic}"`);

    // Step 0: Let LLM understand and clean the topic
    const cleanedTopic = await this.understandTopic(config.topic);
    console.log(`🤖 LLM understood topic as: "${cleanedTopic}"`);
    
    // Use cleaned topic for search
    const searchTopic = cleanedTopic || config.topic;

    // Step 1: Collect sources using cleaned topic
    const { results: allSources } = await this.multiSourceService.searchAll(
      searchTopic,
      config.sources,
      config.minReferences * 2 // Get more to filter
    );

    console.log(`📥 Retrieved ${allSources.length} total sources`);

    // Step 2: CRITICAL - Filter sources by relevance
    const requiredKeywords = SourceRelevanceScorer.extractRequiredKeywords(config.topic);
    const { filtered: sources } = SourceRelevanceScorer.filterSources(
      allSources,
      config.topic,
      requiredKeywords,
      30 // Minimum score of 30/100 (lowered to accept more papers while still filtering spam)
    );

    console.log(`✅ ${sources.length} sources passed relevance filter`);

    // Be very flexible - allow if we have at least 30% of required sources or minimum 5 sources
    const minRequired = Math.max(5, Math.floor(config.minReferences * 0.3));
    
    if (sources.length < minRequired) {
      throw new Error(`Only found ${sources.length} relevant sources. Need at least ${minRequired} sources (30% of ${config.minReferences}). Try a broader topic or check if sources are available.`);
    }

    if (sources.length < config.minReferences) {
      console.log(`⚠️ Found ${sources.length} sources (requested ${config.minReferences}). Proceeding with available sources.`);
    }

    // Step 2: Get word count distribution
    const wordDistribution = AcademicPromptGenerator.getWordCountDistribution(config);
    
    // Step 3: Generate each section
    const sectionContents: string[] = [];
    const systemPrompt = AcademicPromptGenerator.generateSystemPrompt(config);

    for (const [sectionName, wordCount] of Object.entries(wordDistribution)) {
      console.log(`   Writing ${sectionName} (${wordCount} words)...`);
      
      const sectionPrompt = AcademicPromptGenerator.generateSectionPrompt(
        config,
        sectionName,
        wordCount,
        sources
      );

      const response = await this.cerebrasClient.chat.completions.create({
        model: 'llama-3.3-70b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: sectionPrompt }
        ],
        temperature: 0.7,
        max_completion_tokens: Math.ceil(wordCount * 2),
        stream: false
      });

      const sectionContent = response.choices[0]?.message?.content || '';
      sectionContents.push(`## ${sectionName}\n\n${sectionContent}`);
    }

    // Step 4: Combine sections
    let content = `# ${config.topic}\n\n${sectionContents.join('\n\n')}`;

    // Step 5: Apply citation formatting
    content = CitationFormatter.applyCitationsToText(content, sources, config.citationStyle);

    // Step 6: Add references
    const referenceList = CitationFormatter.formatReferenceList(sources, config.citationStyle);
    const finalMarkdown = `${content}\n\n${referenceList}`;

    const wordCount = finalMarkdown.split(/\s+/).length;
    const sections = this.extractSections(finalMarkdown);

    return {
      markdown: finalMarkdown,
      wordCount,
      referenceCount: sources.length,
      sources,
      config,
      sections
    };
  }

  /**
   * Extract section names from markdown
   */
  private extractSections(markdown: string): string[] {
    const sections: string[] = [];
    const lines = markdown.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('## ')) {
        sections.push(line.replace('## ', '').trim());
      }
    }
    
    return sections;
  }

  /**
   * Validate paper quality
   */
  validatePaper(result: ResearchPaperResult): {
    valid: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 100;

    // Check word count
    if (result.wordCount < result.config.targetWordCount * 0.8) {
      issues.push(`Word count too low: ${result.wordCount} (target: ${result.config.targetWordCount})`);
      score -= 20;
    }

    // Check references
    if (result.referenceCount < result.config.minReferences) {
      issues.push(`Not enough references: ${result.referenceCount} (minimum: ${result.config.minReferences})`);
      score -= 20;
    }

    // Check sections
    const requiredSections = ['Introduction', 'Conclusion', 'References'];
    for (const section of requiredSections) {
      if (!result.sections.includes(section)) {
        issues.push(`Missing required section: ${section}`);
        score -= 15;
      }
    }

    // Check citation usage
    const citationMatches = result.markdown.match(/\[\d+\]/g);
    const citationCount = citationMatches ? citationMatches.length : 0;
    if (citationCount < result.referenceCount * 0.5) {
      issues.push(`Low citation usage: ${citationCount} citations for ${result.referenceCount} references`);
      score -= 10;
    }

    return {
      valid: issues.length === 0,
      issues,
      score: Math.max(0, score)
    };
  }
}
