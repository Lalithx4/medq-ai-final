/**
 * Academic Prompt Generator
 * Generates level-appropriate prompts for different essay types
 */

import { ResearchPaperConfig, ESSAY_TYPE_INFO, ACADEMIC_LEVEL_INFO } from './paper-config';
import { CitationStyle } from './citation-formatter';

export class AcademicPromptGenerator {
  
  /**
   * Generate complete system prompt
   */
  static generateSystemPrompt(config: ResearchPaperConfig): string {
    const essayType = config.essayType in ESSAY_TYPE_INFO 
      ? config.essayType 
      : 'case-study';
    const essayInfo = ESSAY_TYPE_INFO[essayType];
    const levelInfo = ACADEMIC_LEVEL_INFO[config.academicLevel];
    
    return `You are an expert academic writer specializing in ${essayInfo.name.toLowerCase()}s at the ${levelInfo.name} level.

WRITING LEVEL: ${config.academicLevel.toUpperCase()}
${levelInfo.description}

VOCABULARY: ${levelInfo.vocabularyLevel}
ANALYSIS DEPTH: ${levelInfo.analysisDepth}
CITATION DENSITY: ${levelInfo.citationDensity}

ESSAY TYPE: ${essayInfo.name}
${essayInfo.description}

CITATION STYLE: ${config.citationStyle}
${this.getCitationStyleInstructions(config.citationStyle)}

TARGET LENGTH: ${config.targetWordCount} words
MINIMUM REFERENCES: ${config.minReferences}

${config.customInstructions ? `CUSTOM INSTRUCTIONS:\n${config.customInstructions}\n` : ''}

Write with appropriate academic rigor for ${levelInfo.name} level.`;
  }

  /**
   * Generate section-specific prompt
   */
  static generateSectionPrompt(
    config: ResearchPaperConfig,
    sectionName: string,
    wordCount: number,
    availableSources: any[]
  ): string {
    const essayType = config.essayType in ESSAY_TYPE_INFO 
      ? config.essayType 
      : 'Literature Review (Summary of Existing Research)';
    const essayInfo = ESSAY_TYPE_INFO[essayType];
    const levelInfo = ACADEMIC_LEVEL_INFO[config.academicLevel];
    
    const sourcesList = availableSources.slice(0, 10).map((source, idx) => 
      `[${idx + 1}] ${source.authors}. ${source.title}. ${source.journal || source.source}. ${source.year}. ${source.url || ''}`
    ).join('\n');

    return `Write the "${sectionName}" section for a ${essayInfo.name.toLowerCase()} on the topic.

SECTION REQUIREMENTS:
- Length: ${wordCount} words (strict requirement)
- Academic Level: ${levelInfo.name}
- Analysis Depth: ${levelInfo.analysisDepth}
- Citation Density: ${levelInfo.citationDensity}

VERIFIED REAL SOURCES (ONLY USE THESE):
${sourcesList}

⚠️ CITATION RULES:
- ONLY cite sources [1] through [${availableSources.slice(0, 10).length}] from above
- DO NOT invent citations or use sources not listed
- Every [X] must match a real source from the list
- Include specific findings from these papers

SECTION GUIDELINES:
${this.getSectionGuidelines(config.essayType, sectionName, config.academicLevel)}

CRITICAL REQUIREMENTS:
1. Write EXACTLY ${wordCount} words for this section
2. Follow the ${levelInfo.name} level guidelines above
3. Use ONLY the sources provided (cite as [1], [2], [3])
4. Write in full paragraphs (NO bullet points)
5. Use professional academic language
6. Cite sources frequently using [1], [2], [3] format ONLY from the list above
7. DO NOT fabricate or invent any citations

📚 LITERATURE REVIEW GUIDELINES:
This is a LITERATURE REVIEW section. You are SUMMARIZING existing research.

HONEST REPORTING:
- Only report data that appears in the source abstracts/titles
- Use "According to [Author]..." or "[Author] reported..."
- If specific numbers aren't in the abstract, describe findings generally
- Synthesize themes across studies
- Compare different studies' findings
- DO NOT invent statistics or sample sizes
- DO NOT claim you conducted original research
- If data is unavailable, say so: "Specific statistical details not provided in abstract"

Write the complete "${sectionName}" section now:`;
  }

  /**
   * Get citation style instructions
   */
  private static getCitationStyleInstructions(style: CitationStyle): string {
    const instructions: Record<CitationStyle, string> = {
      'APA': 'Use (Author, Year) format for in-text citations. Example: (Smith, 2023)',
      'MLA': 'Use (Author Page) format for in-text citations. Example: (Smith 45)',
      'IEEE': 'Use numbered citations [1], [2], [3] throughout the text',
      'Vancouver': 'Use numbered citations [1], [2], [3] in order of appearance',
      'Chicago': 'Use superscript numbers for footnotes',
      'Harvard': 'Use (Author Year) format. Example: (Smith 2023)'
    };
    
    return instructions[style] || instructions['APA'];
  }

  /**
   * Get section-specific guidelines
   */
  private static getSectionGuidelines(
    essayType: string,
    sectionName: string,
    level: string
  ): string {
    const guidelines: Record<string, Record<string, string>> = {
      'Abstract': {
        'high-school': 'Summarize the main topic, purpose, and key findings in clear, simple language. Include 4-5 sentences covering background, methods, results, and conclusions.',
        'college': 'Provide structured abstract with background (2-3 sentences), objectives (1-2 sentences), methods (2-3 sentences), results (2-3 sentences), and conclusions (1-2 sentences). Total 250-300 words.',
        'graduate': 'Write comprehensive structured abstract with theoretical framework, research questions, methodology, key findings with specific data, and theoretical implications. Include 4-6 keywords. Total 300-350 words.',
        'doctoral': 'Include original contribution statement, theoretical significance, comprehensive methodology, detailed findings with statistical data, broader impact on field, and future research directions. Include 6-8 keywords. Total 350-400 words.'
      },
      'Introduction': {
        'high-school': 'Introduce the topic with engaging hook, explain why it matters with real-world examples, provide background information, and state your main argument clearly. Include 3-4 paragraphs.',
        'college': 'Start with compelling opening, provide comprehensive context with statistics and current state, identify research gap with specific examples, state clear thesis statement, and outline paper structure. Include 5-7 detailed paragraphs with citations.',
        'graduate': 'Establish theoretical framework with multiple perspectives, critically analyze existing literature with synthesis of 10+ sources, articulate specific research questions, justify methodological approach, and explain contribution to field. Include 8-10 comprehensive paragraphs.',
        'doctoral': 'Position work within scholarly discourse with historical context, identify original contribution with clear novelty statement, establish theoretical and practical significance, provide comprehensive literature synthesis, articulate research questions with hypotheses. Include 10-12 detailed paragraphs with extensive citations.'
      },
      'Literature Review': {
        'high-school': 'Summarize what other researchers have found about your topic. Group findings by themes, mention 5-8 studies, and explain what each study discovered. Include 4-5 paragraphs.',
        'college': 'Synthesize existing research thematically with 3-4 major themes, identify patterns and contradictions across 10-15 studies, discuss methodological approaches, and identify research gaps. Include 8-10 paragraphs with extensive citations.',
        'graduate': 'Critically evaluate methodologies and theoretical approaches across 15-20 studies, analyze contradictions in literature, synthesize findings thematically, discuss evolution of field, and identify theoretical gaps. Include 12-15 comprehensive paragraphs.',
        'doctoral': 'Provide comprehensive synthesis of 20+ studies, identify theoretical gaps and methodological limitations, establish need for original contribution, discuss paradigm shifts in field, and position current work. Include 15-18 detailed paragraphs with critical analysis.'
      },
      'Methodology': {
        'high-school': 'Explain how you conducted your research or analysis. Describe your approach, what data you used, and how you analyzed it. Include 3-4 paragraphs.',
        'college': 'Detail research design with justification, describe data collection procedures, explain analysis methods with specific techniques, discuss sample selection, and address ethical considerations. Include 6-8 paragraphs with methodological citations.',
        'graduate': 'Critically justify methodological choices with theoretical grounding, address limitations and mitigation strategies, explain analytical framework in detail, discuss validity and reliability measures, and provide replication guidelines. Include 10-12 paragraphs.',
        'doctoral': 'Provide rigorous methodological framework with philosophical justification, justify methodological innovations, address validity/reliability/generalizability, discuss limitations comprehensively, and provide detailed replication protocol. Include 12-15 paragraphs with extensive methodological citations.'
      },
      'Results': {
        'high-school': 'Present your findings clearly with examples. Use simple language to explain what you discovered. Include 3-4 paragraphs with key findings.',
        'college': 'Present findings systematically organized by research questions, include specific data and statistics, describe patterns and trends, and use evidence from sources. Include 8-10 paragraphs with data-driven analysis.',
        'graduate': 'Provide comprehensive results organized thematically, include detailed statistical analysis with effect sizes and confidence intervals, present unexpected findings, and relate to theoretical framework. Include 12-15 paragraphs with sophisticated analysis.',
        'doctoral': 'Present detailed findings with advanced statistical analysis, discuss effect sizes and practical significance, address alternative explanations, provide comprehensive data interpretation, and relate to theoretical predictions. Include 15-18 paragraphs with extensive data analysis.'
      },
      'Discussion': {
        'high-school': 'Explain what your findings mean and why they matter. Connect findings to real-world applications. Include 4-5 paragraphs.',
        'college': 'Interpret results in context of literature, compare with previous studies, discuss theoretical implications, address limitations, and suggest practical applications. Include 10-12 paragraphs with literature integration.',
        'graduate': 'Critically analyze findings with theoretical lens, compare with predictions from multiple frameworks, discuss broader implications for theory and practice, address limitations comprehensively, and propose future research directions. Include 15-18 paragraphs.',
        'doctoral': 'Provide sophisticated theoretical interpretation, discuss original contributions to field, analyze implications for theory development, address paradigm implications, discuss practical applications, and articulate comprehensive future research agenda. Include 18-20 paragraphs with deep theoretical analysis.'
      },
      'Conclusion': {
        'high-school': 'Summarize main points and explain why your topic is important. Restate key findings and their significance. Include 2-3 paragraphs.',
        'college': 'Synthesize key findings without repetition, restate theoretical and practical significance, discuss limitations, suggest future research directions, and provide closing statement. Include 4-5 paragraphs.',
        'graduate': 'Provide comprehensive synthesis of contributions, discuss theoretical implications, outline practical applications, address limitations and future directions, and articulate broader impact. Include 6-8 paragraphs.',
        'doctoral': 'Articulate original contribution to field, discuss theoretical significance and paradigm implications, provide practical recommendations, outline comprehensive future research agenda, and discuss broader societal impact. Include 8-10 paragraphs with forward-looking perspective.'
      }
    };

    return guidelines[sectionName]?.[level] || 'Write a comprehensive, well-structured section with appropriate academic depth.';
  }

  /**
   * Generate complete paper prompt
   */
  static generateCompletePaperPrompt(
    config: ResearchPaperConfig,
    sources: any[]
  ): string {
    const essayType = config.essayType in ESSAY_TYPE_INFO 
      ? config.essayType 
      : 'Literature Review (Summary of Existing Research)';
    const essayInfo = ESSAY_TYPE_INFO[essayType];
    const levelInfo = ACADEMIC_LEVEL_INFO[config.academicLevel];
    
    const sourcesList = sources.map((source, idx) => 
      `[${idx + 1}] ${source.authors}. ${source.title}. ${source.journal || source.source}. ${source.year}. ${source.url}`
    ).join('\n\n');

    return `Generate a complete ${essayInfo.name.toLowerCase()} on: "${config.topic}"

ACADEMIC LEVEL: ${levelInfo.name}
ESSAY TYPE: ${essayInfo.name}
CITATION STYLE: ${config.citationStyle}
TARGET LENGTH: ${config.targetWordCount} words
REQUIRED REFERENCES: ${config.minReferences}

VERIFIED REAL SOURCES (${sources.length} total - USE ONLY THESE):
${sourcesList}

⚠️ CRITICAL CITATION RULES:
1. ONLY cite sources from the list above using [1], [2], [3] format
2. DO NOT invent or fabricate any citations
3. DO NOT cite sources not in the provided list
4. Every citation [X] must correspond to a real source above
5. Cite frequently - aim for ${levelInfo.citationDensity}

REQUIRED STRUCTURE:
${essayInfo.sections.map(section => `- ${section}`).join('\n')}

WRITING REQUIREMENTS:
1. Academic Level: ${levelInfo.name}
   - Vocabulary: ${levelInfo.vocabularyLevel}
   - Analysis: ${levelInfo.analysisDepth}
   - Citations: ${levelInfo.citationDensity}

2. Content Requirements:
   - Total length: ${config.targetWordCount} words minimum
   - Use ALL ${sources.length} provided sources
   - Cite sources using [1], [2], [3] format ONLY
   - Write full paragraphs (120-150 words each)
   - Include specific data and examples from the sources
   - Reference specific findings from the papers

3. Citation Style: ${config.citationStyle}
   ${this.getCitationStyleInstructions(config.citationStyle)}

4. Structure:
   ${essayInfo.sections.map((section, idx) => {
     const wordCount = Math.floor(config.targetWordCount / essayInfo.sections.length);
     return `   ${section}: ~${wordCount} words`;
   }).join('\n')}

${config.customInstructions ? `\nCUSTOM INSTRUCTIONS:\n${config.customInstructions}\n` : ''}

⚠️ CRITICAL RULES:
- Write the COMPLETE paper with ALL sections
- Do NOT use placeholders or summaries
- ONLY cite the ${sources.length} sources provided above
- DO NOT fabricate citations or sources
- Every [1], [2], [3] must match the source list
- Write in full paragraphs, NO bullet points
- Use professional academic language
- Aim for ${levelInfo.citationDensity}
- Total length: ${config.targetWordCount} words

📚 LITERATURE REVIEW REQUIREMENTS (CRITICAL):
This is a LITERATURE REVIEW, not original research. You are SUMMARIZING existing studies.

WHAT YOU CAN DO:
- Report findings ONLY if they appear in the source title/abstract
- Use phrases like "According to [Author, Year]..." or "[Author, Year] reported that..."
- Synthesize themes across multiple papers
- Compare and contrast different studies' approaches
- Identify gaps in the literature
- Discuss implications of existing research

WHAT YOU CANNOT DO:
- DO NOT invent specific numbers not in the sources
- DO NOT fabricate sample sizes, p-values, or statistics
- DO NOT claim to have conducted original research
- DO NOT present this as original data collection
- DO NOT make up detailed methodology you didn't perform
- If a source abstract doesn't contain specific data, say "details not available in abstract"

HONEST REPORTING:
- "Smith et al. (2023) found improvements in symptoms [1]" ✓
- "Smith et al. (2023) reported a 45% improvement (n=200, p<0.001) [1]" - ONLY if this is in the source ✓
- "A 45% improvement was observed (n=200, p<0.001) [1]" - WITHOUT checking source ✗

IMPORTANT: Start the paper with this disclaimer:

---
**DISCLAIMER:** This is an AI-generated literature review summarizing existing research. This is NOT original research. No new data was collected. All findings are synthesized from the cited sources below.
---

Begin writing the complete ${essayInfo.name.toLowerCase()} now:`;
  }

  /**
   * Get word count distribution for sections
   */
  static getWordCountDistribution(
    config: ResearchPaperConfig
  ): Record<string, number> {
    // Fallback to default if essay type not found
    const essayType = config.essayType in ESSAY_TYPE_INFO 
      ? config.essayType 
      : 'Literature Review (Summary of Existing Research)';
    
    const essayInfo = ESSAY_TYPE_INFO[essayType];
    const totalWords = config.targetWordCount;
    const sections = essayInfo.sections;
    
    // Different distributions based on essay type
    const distributions: Record<string, Record<string, number>> = {
      'research-paper': {
        'Abstract': 0.05,
        'Introduction': 0.15,
        'Literature Review': 0.20,
        'Methodology': 0.15,
        'Results': 0.15,
        'Discussion': 0.20,
        'Conclusion': 0.10
      },
      'literature-review': {
        'Introduction': 0.15,
        'Thematic Analysis': 0.35,
        'Critical Evaluation': 0.25,
        'Research Gaps': 0.15,
        'Conclusion': 0.10
      },
      'argumentative-essay': {
        'Introduction': 0.15,
        'Background': 0.15,
        'Arguments': 0.25,
        'Counter-arguments': 0.20,
        'Rebuttal': 0.15,
        'Conclusion': 0.10
      }
    };

    const distribution = distributions[config.essayType] || {};
    const result: Record<string, number> = {};
    
    sections.forEach(section => {
      const percentage = distribution[section] || (1 / sections.length);
      result[section] = Math.floor(totalWords * percentage);
    });
    
    return result;
  }
}
