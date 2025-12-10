/**
 * Topic Analyzer - Understand and refine research topics
 * Prevents topic confusion and generates focused search queries
 */

export interface TopicAnalysis {
  cleanedTopic: string;
  primaryConcepts: string[];
  secondaryConcepts: string[];
  exclusionTerms: string[];
  requiredKeywords: string[];
  searchQueries: string[];
  context: string;
}

export class TopicAnalyzer {
  
  /**
   * Analyze and understand the research topic
   */
  static analyzeTopic(topic: string): TopicAnalysis {
    const topicLower = topic.toLowerCase();
    
    // Clean the topic
    const cleanedTopic = this.cleanTopic(topic);
    
    // Extract concepts
    const primaryConcepts = this.extractPrimaryConcepts(topicLower);
    const secondaryConcepts = this.extractSecondaryConcepts(topicLower);
    
    // Generate exclusion terms to avoid confusion
    const exclusionTerms = this.generateExclusionTerms(topicLower);
    
    // Determine required keywords
    const requiredKeywords = this.determineRequiredKeywords(topicLower, primaryConcepts);
    
    // Generate focused search queries
    const searchQueries = this.generateSearchQueries(cleanedTopic, primaryConcepts, secondaryConcepts);
    
    // Determine context
    const context = this.determineContext(topicLower);
    
    return {
      cleanedTopic,
      primaryConcepts,
      secondaryConcepts,
      exclusionTerms,
      requiredKeywords,
      searchQueries,
      context
    };
  }
  
  /**
   * Clean the topic string
   */
  private static cleanTopic(topic: string): string {
    return topic
      .replace(/\b(research|study|paper|article|on|about|the|a|an|write|generate|create)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Extract primary concepts (main focus)
   */
  private static extractPrimaryConcepts(topicLower: string): string[] {
    const concepts: string[] = [];
    
    // Diabetes disambiguation - CRITICAL
    if (topicLower.includes('diabetes')) {
      if (topicLower.match(/type\s*2|t2d|type\s*ii|mellitus|insulin resistance|glycemic|glucose|metformin|hba1c/i)) {
        concepts.push('Type 2 diabetes mellitus');
        concepts.push('T2DM');
        concepts.push('diabetes mellitus type 2');
      } else if (topicLower.match(/type\s*1|t1d|type\s*i|insulin.dependent/i)) {
        concepts.push('Type 1 diabetes');
        concepts.push('T1DM');
      } else if (topicLower.match(/insipidus|vasopressin|adh|polyuria|polydipsia/i)) {
        concepts.push('diabetes insipidus');
      } else {
        // Default to Type 2 if just "diabetes" mentioned
        concepts.push('Type 2 diabetes mellitus');
        concepts.push('T2DM');
      }
    }
    
    // CRISPR/Gene editing
    if (topicLower.match(/crispr|cas9|gene editing|genome editing/i)) {
      concepts.push('CRISPR-Cas9');
      concepts.push('gene editing');
      if (topicLower.includes('base edit')) concepts.push('base editing');
      if (topicLower.includes('prime edit')) concepts.push('prime editing');
    }
    
    // Cancer types
    if (topicLower.includes('cancer')) {
      if (topicLower.includes('lung')) concepts.push('lung cancer');
      if (topicLower.includes('breast')) concepts.push('breast cancer');
      if (topicLower.includes('colon')) concepts.push('colorectal cancer');
      if (topicLower.includes('prostate')) concepts.push('prostate cancer');
    }
    
    // Cardiovascular
    if (topicLower.match(/heart|cardiac|cardiovascular|coronary/i)) {
      concepts.push('cardiovascular disease');
      if (topicLower.includes('failure')) concepts.push('heart failure');
      if (topicLower.includes('attack')) concepts.push('myocardial infarction');
    }
    
    return concepts;
  }
  
  /**
   * Extract secondary concepts (context/modifiers)
   */
  private static extractSecondaryConcepts(topicLower: string): string[] {
    const concepts: string[] = [];
    
    // Treatment/Management
    if (topicLower.match(/treatment|therapy|management|intervention/i)) {
      concepts.push('treatment');
      concepts.push('management');
    }
    
    // Prevention
    if (topicLower.match(/prevention|prophylaxis/i)) {
      concepts.push('prevention');
    }
    
    // Diagnosis
    if (topicLower.match(/diagnosis|diagnostic|screening/i)) {
      concepts.push('diagnosis');
      concepts.push('screening');
    }
    
    // Complications
    if (topicLower.match(/complication|adverse|side effect/i)) {
      concepts.push('complications');
    }
    
    return concepts;
  }
  
  /**
   * Generate exclusion terms to avoid topic confusion
   */
  private static generateExclusionTerms(topicLower: string): string[] {
    const exclusions: string[] = [];
    
    // If Type 2 diabetes, exclude diabetes insipidus
    if (topicLower.match(/type\s*2|t2d|mellitus|glycemic/i) && topicLower.includes('diabetes')) {
      exclusions.push('diabetes insipidus');
      exclusions.push('insipidus');
      exclusions.push('vasopressin');
      exclusions.push('ADH');
      exclusions.push('central diabetes insipidus');
      exclusions.push('nephrogenic diabetes insipidus');
    }
    
    // If diabetes insipidus, exclude Type 2
    if (topicLower.includes('insipidus')) {
      exclusions.push('type 2 diabetes');
      exclusions.push('T2DM');
      exclusions.push('insulin resistance');
      exclusions.push('metformin');
    }
    
    // If CRISPR for specific disease, exclude unrelated mechanisms
    if (topicLower.includes('crispr')) {
      if (!topicLower.includes('transferrin')) exclusions.push('transferrin');
      if (!topicLower.includes('aldosterone')) exclusions.push('aldosterone');
    }
    
    return exclusions;
  }
  
  /**
   * Determine required keywords that MUST appear
   */
  private static determineRequiredKeywords(topicLower: string, primaryConcepts: string[]): string[] {
    const required: string[] = [];
    
    // Add primary concepts as required
    primaryConcepts.forEach(concept => {
      const words = concept.toLowerCase().split(' ');
      required.push(...words);
    });
    
    // Specific requirements
    if (topicLower.includes('crispr')) {
      required.push('CRISPR', 'Cas9', 'editing');
    }
    
    if (topicLower.match(/type\s*2.*diabetes/i)) {
      required.push('type 2', 'diabetes', 'mellitus');
    }
    
    return [...new Set(required)]; // Remove duplicates
  }
  
  /**
   * Generate focused search queries
   */
  private static generateSearchQueries(
    cleanedTopic: string,
    primaryConcepts: string[],
    secondaryConcepts: string[]
  ): string[] {
    const queries: string[] = [];
    
    // Main query
    queries.push(cleanedTopic);
    
    // Primary concept combinations
    if (primaryConcepts.length > 0) {
      primaryConcepts.forEach(primary => {
        queries.push(primary);
        
        // Combine with secondary concepts
        secondaryConcepts.forEach(secondary => {
          queries.push(`${primary} ${secondary}`);
        });
      });
    }
    
    return queries;
  }
  
  /**
   * Determine research context
   */
  private static determineContext(topicLower: string): string {
    if (topicLower.match(/treatment|therapy|management/i)) {
      return 'therapeutic applications';
    }
    if (topicLower.match(/diagnosis|screening/i)) {
      return 'diagnostic approaches';
    }
    if (topicLower.match(/prevention|prophylaxis/i)) {
      return 'preventive strategies';
    }
    if (topicLower.match(/mechanism|pathophysiology/i)) {
      return 'mechanistic understanding';
    }
    return 'clinical research';
  }
  
  /**
   * Build PubMed search query with exclusions
   */
  static buildPubMedQuery(analysis: TopicAnalysis): string {
    let query = analysis.searchQueries[0];
    
    // Add required keywords with AND
    if (analysis.requiredKeywords.length > 0) {
      const keywordQuery = analysis.requiredKeywords
        .map(kw => `"${kw}"`)
        .join(' AND ');
      query = `(${query}) AND (${keywordQuery})`;
    }
    
    // Add exclusions with NOT
    if (analysis.exclusionTerms.length > 0) {
      const exclusionQuery = analysis.exclusionTerms
        .map(term => `"${term}"`)
        .join(' OR ');
      query = `(${query}) NOT (${exclusionQuery})`;
    }
    
    return query;
  }
}
