/**
 * Source Relevance Scorer
 * Scores and filters sources to ensure they match the topic
 */

export interface ScoredSource {
  source: any;
  score: number;
  reasons: string[];
}

export class SourceRelevanceScorer {
  
  /**
   * Score a source's relevance to the topic
   */
  static scoreSource(source: any, topic: string, requiredKeywords: string[]): ScoredSource {
    let score = 0;
    const reasons: string[] = [];
    const topicLower = topic.toLowerCase();
    const titleLower = (source.title || '').toLowerCase();
    const abstractLower = (source.abstract || source.snippet || '').toLowerCase();
    const combined = `${titleLower} ${abstractLower}`;
    
    // ============================================================================
    // CRITICAL: Check for completely irrelevant topics
    // ============================================================================
    
    // Math/Physics papers in medical topic
    if (topicLower.match(/diabetes|cancer|disease|treatment|medical|clinical/i)) {
      const irrelevantTopics = [
        'general relativity', 'quantum', 'lie group', 'topology', 'algebra',
        'geometry', 'manifold', 'differential equation', 'number theory',
        'cryptography', 'algorithm', 'computer science', 'machine learning',
        'neural network', 'artificial intelligence'
      ];
      
      for (const irrelevant of irrelevantTopics) {
        if (titleLower.includes(irrelevant)) {
          score = 0;
          reasons.push(`REJECTED: Irrelevant topic (${irrelevant})`);
          return { source, score, reasons };
        }
      }
    }
    
    // ============================================================================
    // DIABETES TYPE VERIFICATION
    // ============================================================================
    
    if (topicLower.includes('type 2') || topicLower.includes('t2d')) {
      // MUST have Type 2 indicators
      const type2Indicators = [
        'type 2', 't2d', 'type ii', 'insulin resistance', 'metformin',
        'glp-1', 'sglt2', 'dpp-4', 'metabolic syndrome', 'obesity',
        'lifestyle intervention', 'weight loss', 'hba1c'
      ];
      
      const hasType2 = type2Indicators.some(indicator => combined.includes(indicator));
      
      // MUST NOT have Type 1 specific content
      const type1Indicators = [
        'type 1', 't1d', 'type i', 'autoimmune', 'beta cell destruction',
        'interferon', 'autoantibodies', 'ketoacidosis', 'insulin dependent',
        'juvenile diabetes', 'islet cell'
      ];
      
      const hasType1 = type1Indicators.some(indicator => combined.includes(indicator));
      
      // MUST NOT have diabetes insipidus
      const hasDI = combined.match(/insipidus|vasopressin|adh|polyuria|polydipsia/i);
      
      if (hasDI) {
        score = 0;
        reasons.push('REJECTED: Diabetes insipidus (wrong disease)');
        return { source, score, reasons };
      }
      
      if (hasType1 && !hasType2) {
        score = 0;
        reasons.push('REJECTED: Type 1 diabetes (wrong type)');
        return { source, score, reasons };
      }
      
      if (!hasType2) {
        score = 0;
        reasons.push('REJECTED: No Type 2 diabetes indicators');
        return { source, score, reasons };
      }
      
      score += 50;
      reasons.push('✓ Type 2 diabetes verified');
    }
    
    // ============================================================================
    // REQUIRED KEYWORDS CHECK
    // ============================================================================
    
    let keywordMatches = 0;
    for (const keyword of requiredKeywords) {
      if (combined.includes(keyword.toLowerCase())) {
        keywordMatches++;
        score += 10;
      }
    }
    
    if (keywordMatches === 0) {
      score = 0;
      reasons.push('REJECTED: No required keywords found');
      return { source, score, reasons };
    }
    
    reasons.push(`✓ ${keywordMatches}/${requiredKeywords.length} keywords matched`);
    
    // ============================================================================
    // TITLE RELEVANCE (40% weight)
    // ============================================================================
    
    const titleWords = topicLower.split(' ').filter(w => w.length > 3);
    let titleMatches = 0;
    
    for (const word of titleWords) {
      if (titleLower.includes(word)) {
        titleMatches++;
      }
    }
    
    const titleScore = (titleMatches / titleWords.length) * 40;
    score += titleScore;
    
    if (titleScore > 20) {
      reasons.push(`✓ High title relevance (${Math.round(titleScore)}pts)`);
    }
    
    // ============================================================================
    // ABSTRACT/SNIPPET RELEVANCE (30% weight)
    // ============================================================================
    
    if (abstractLower) {
      const abstractWords = abstractLower.split(' ');
      let keywordDensity = 0;
      
      for (const keyword of requiredKeywords) {
        const count = (abstractLower.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
        keywordDensity += count;
      }
      
      const density = keywordDensity / abstractWords.length;
      const abstractScore = Math.min(30, density * 1000);
      score += abstractScore;
      
      if (abstractScore > 15) {
        reasons.push(`✓ High keyword density (${Math.round(abstractScore)}pts)`);
      }
    }
    
    // ============================================================================
    // SOURCE TYPE BONUS (10% weight)
    // ============================================================================
    
    if (source.source === 'PubMed' || source.journal) {
      score += 10;
      reasons.push('✓ PubMed/Journal source');
    }
    
    // ============================================================================
    // RECENCY BONUS (10% weight)
    // ============================================================================
    
    const year = parseInt(source.year);
    if (year >= 2020) {
      score += 10;
      reasons.push(`✓ Recent (${year})`);
    } else if (year >= 2015) {
      score += 5;
    }
    
    return { source, score, reasons };
  }
  
  /**
   * Filter sources by relevance threshold
   */
  static filterSources(
    sources: any[],
    topic: string,
    requiredKeywords: string[],
    minScore: number = 60
  ): { filtered: any[]; rejected: ScoredSource[] } {
    const scored = sources.map(source => 
      this.scoreSource(source, topic, requiredKeywords)
    );
    
    // Sort by score
    scored.sort((a, b) => b.score - a.score);
    
    const filtered = scored
      .filter(s => s.score >= minScore)
      .map(s => s.source);
    
    const rejected = scored.filter(s => s.score < minScore);
    
    console.log(`\n📊 SOURCE FILTERING RESULTS:`);
    console.log(`   Total sources: ${sources.length}`);
    console.log(`   Passed (≥${minScore}): ${filtered.length}`);
    console.log(`   Rejected (<${minScore}): ${rejected.length}`);
    
    if (rejected.length > 0) {
      console.log(`\n❌ REJECTED SOURCES:`);
      rejected.slice(0, 5).forEach(r => {
        console.log(`   - "${r.source.title?.substring(0, 60)}..."`);
        console.log(`     Score: ${r.score}/100`);
        console.log(`     Reasons: ${r.reasons.join(', ')}`);
      });
    }
    
    if (filtered.length > 0) {
      console.log(`\n✅ ACCEPTED SOURCES (Top 5):`);
      scored.slice(0, 5).forEach(s => {
        console.log(`   - "${s.source.title?.substring(0, 60)}..."`);
        console.log(`     Score: ${s.score}/100`);
        console.log(`     Reasons: ${s.reasons.join(', ')}`);
      });
    }
    
    return { filtered, rejected };
  }
  
  /**
   * Extract required keywords from topic
   */
  static extractRequiredKeywords(topic: string): string[] {
    const topicLower = topic.toLowerCase();
    const keywords: string[] = [];
    
    // Type 2 diabetes
    if (topicLower.match(/type\s*2|t2d/i)) {
      keywords.push('type 2', 'diabetes', 'mellitus');
    }
    
    // Type 1 diabetes
    if (topicLower.match(/type\s*1|t1d/i)) {
      keywords.push('type 1', 'diabetes');
    }
    
    // CRISPR
    if (topicLower.includes('crispr')) {
      keywords.push('crispr', 'cas9', 'editing');
    }
    
    // Cancer
    if (topicLower.includes('cancer')) {
      keywords.push('cancer', 'tumor', 'neoplasm');
    }
    
    // Heart disease
    if (topicLower.match(/heart|cardiac|cardiovascular/i)) {
      keywords.push('heart', 'cardiac', 'cardiovascular');
    }
    
    // Add all significant words from topic
    const words = topic.split(' ')
      .filter(w => w.length > 3)
      .filter(w => !['research', 'study', 'paper', 'article'].includes(w.toLowerCase()));
    
    keywords.push(...words);
    
    return [...new Set(keywords)]; // Remove duplicates
  }
}
