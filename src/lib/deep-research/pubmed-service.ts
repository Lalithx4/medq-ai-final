/**
 * PubMed Service - Real PMID Collection and Validation
 */

import { FallbackResearchService, type ResearchPaper } from './fallback-sources';
import { RateLimiterManager } from './rate-limiter';

export interface PMIDData {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  url: string;
  abstract?: string;
  keywords?: string[];
}

export class PubMedService {
  private static instance: PubMedService;
  private static globalUsedPMIDs: Set<string> = new Set(); // Global tracker across all instances

  private baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  private email: string;
  private apiKey?: string;
  private fallbackService: FallbackResearchService;
  private rateLimiter;

  constructor(email: string = 'research@medq.ai', apiKey?: string) {
    this.email = email;
    this.apiKey = apiKey || process.env.NCBI_API_KEY;
    this.fallbackService = new FallbackResearchService();
    this.rateLimiter = RateLimiterManager.getPubMedLimiter(!!this.apiKey);
  }

  /**
   * Get singleton instance (recommended for consistent tracking)
   */
  static getInstance(email?: string, apiKey?: string): PubMedService {
    if (!PubMedService.instance) {
      PubMedService.instance = new PubMedService(email, apiKey);
    }
    return PubMedService.instance;
  }

  /**
   * Reset the global used PMIDs tracker (call this at the start of a new research session)
   */
  static resetGlobalUsedPMIDs(): void {
    // console.log('🔄 Reset global PMID tracker');
  }

  /**
   * Instance method for backward compatibility
   */
  resetUsedPMIDs(): void {
    PubMedService.resetGlobalUsedPMIDs();
  }

  /**
   * Extract the core medical topic from a query (e.g., "maxillectomy" from "maxillectomy AND indications")
   */
  private extractCoreTopic(query: string): string {
    const keywords = this.extractKeywords(query);
    // Return the first (most specific) keyword, or the original query if no keywords found
    return keywords[0] || query.split(' ')[0] || query;
  }

  /**
   * Extract keywords from query (medical terms, procedures, diseases)
   * CRITICAL: Only extract the MAIN medical topic, not generic descriptive terms
   */
  private extractKeywords(query: string): string[] {
    const keywords: string[] = [];
    const lower = query.toLowerCase();

    // EXPANDED stop words to exclude generic medical descriptors
    const stopWords = [
      // Common words (but NOT "sub" or "total" which are medical modifiers)
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
      // Generic research terms
      'research', 'study', 'paper', 'article', 'write', 'generate', 'create', 'review', 'analysis', 'overview',
      // Generic medical descriptors (these are TOO BROAD to search alone)
      'introduction', 'indications', 'contraindications', 'complications', 'management', 'treatment', 'diagnosis', 'prognosis', 'outcomes', 'techniques', 'approaches', 'methods', 'procedures', 'surgical', 'clinical', 'pathophysiology', 'anatomy', 'physiology', 'epidemiology', 'etiology', 'prevention', 'therapy', 'postoperative', 'preoperative', 'intraoperative', 'care', 'rehabilitation'
    ];

    // Extract medical concepts using patterns (diseases, procedures, etc.)
    const medicalConcepts = this.extractMedicalConcepts(query);
    keywords.push(...medicalConcepts);

    // Check for multi-word medical terms (e.g., "subtotal maxillectomy", "total knee replacement")
    const multiWordPatterns = [
      /\b(sub\s*total|partial|complete|total|radical|modified)\s+(\w+ectomy|\w+otomy|\w+plasty|\w+scopy)\b/gi,
      /\b(\w+)\s+(maxillectomy|craniotomy|mastectomy|colectomy|gastrectomy|nephrectomy)\b/gi,
    ];

    for (const pattern of multiWordPatterns) {
      const matches = query.match(pattern);
      if (matches) {
        // Add the full multi-word term
        keywords.unshift(...matches.map(m => m.trim()));
      }
    }

    // Only add specific medical terms, not generic descriptors
    const words = lower
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.includes(w));

    // Add remaining significant words (but prioritize medical concepts)
    keywords.push(...words.filter(w => !keywords.includes(w)));

    // CRITICAL: Return only the first 1-2 most specific terms
    // Prioritize multi-word terms (they're more specific)
    return [...new Set(keywords)].slice(0, 2);
  }

  /**
   * Build advanced PubMed query with Boolean operators
   */
  private buildAdvancedQuery(keywords: string[]): string {
    if (keywords.length === 0) return '';
    if (keywords.length === 1) return keywords[0] || '';

    // Strategy: Use AND for first 2-3 most important terms, OR for the rest
    const primaryTerms = keywords.slice(0, Math.min(3, keywords.length));
    const secondaryTerms = keywords.slice(3);

    let query = primaryTerms.join(' AND ');

    if (secondaryTerms.length > 0) {
      query = `(${query}) AND (${secondaryTerms.join(' OR ')})`;
    }

    return query;
  }

  /**
   * Search PubMed and collect real PMIDs with improved keyword-based search
   */
  async searchPubMed(topic: string, maxResults: number = 30): Promise<string[]> {
    try {
      // CRITICAL: Clean and disambiguate the query first
      const cleanedQuery = this.cleanQuery(topic);
      const hasFieldSyntax = /\[[^\]]+\]/.test(cleanedQuery);
      // console.log(`🔍 Original query: "${topic}"`);
      // console.log(`🔍 Cleaned query: "${cleanedQuery}"`);

      const searchUrl = `${this.baseUrl}/esearch.fcgi`;
      const params = new URLSearchParams({
        db: 'pubmed',
        term: cleanedQuery,  // Use cleaned query instead of raw topic
        retmax: maxResults.toString(),
        retmode: 'json',
        // For queries that use PubMed field tags (MeSH, publication types, etc.),
        // prioritize recency so feeds like Discover show newly published/indexed
        // articles within that specialty. Otherwise, default to relevance.
        sort: hasFieldSyntax ? 'pub+date' : 'relevance',
        email: this.email,
      });

      if (this.apiKey) {
        params.append('api_key', this.apiKey);
      }

      const res = await this.rateLimiter.enqueue(() =>
        fetch(`${searchUrl}?${params}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'MedQAI/1.0 (contact: research@medq.ai)'
          }
        })
      );

      const text = await res.text();

      // Guard against non-JSON responses (XML error pages, HTML, etc.)
      if (!res.ok) {
        // Non-OK response, fall back
        return [];
      }
      if (text.trim().startsWith('<')) {
        // Received XML/HTML instead of JSON, fall back
        return [];
      }

      // Safe JSON parsing
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        // JSON parse failed, fall back
        return [];
      }

      const pmids = data.esearchresult?.idlist || [];
      // console.log(`✅ Found ${pmids.length} PMIDs for: ${cleanedQuery}`);

      return pmids;
    } catch (error) {
      console.error('PubMed search error:', error);
      return [];
    }
  }

  /**
   * Fetch metadata for PMIDs with retry logic
   */
  async fetchPMIDMetadata(pmids: string[]): Promise<Record<string, PMIDData>> {
    const metadata: Record<string, PMIDData> = {};

    // Process in batches of 10 - rate limiter handles throttling automatically
    for (let i = 0; i < pmids.length; i += 10) {
      const batch = pmids.slice(i, i + 10);

      // Retry logic with exponential backoff
      let batchSuccess = false;
      for (let attempt = 0; attempt < 3 && !batchSuccess; attempt++) {
        try {
          if (attempt > 0) {
            const backoffDelay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
            // console.log(`[PubMed] Retry attempt ${attempt} after ${backoffDelay}ms delay...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }

          const fetchUrl = `${this.baseUrl}/esummary.fcgi`;
          const params = new URLSearchParams({
            db: 'pubmed',
            id: batch.join(','),
            retmode: 'json',
            email: this.email,
          });

          if (this.apiKey) {
            params.append('api_key', this.apiKey);
          }

          const res = await this.rateLimiter.enqueue(() =>
            fetch(`${fetchUrl}?${params}`, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'MedQAI/1.0 (contact: research@medq.ai)'
              }
            })
          );

          const text = await res.text();

          // Guard against non-JSON responses
          if (!res.ok) {
            if (res.status === 429 && attempt < 2) {
              // Rate limited, retry
              continue; // Retry
            }
            // Non-OK status
            break; // Don't retry for other errors
          }

          if (text.trim().startsWith('<')) {
            // Received XML/HTML
            break; // Don't retry for XML
          }

          // Safe JSON parsing
          let data: any;
          try {
            data = JSON.parse(text);
          } catch (e) {
            // JSON parse failed
            break; // Don't retry for parse errors
          }

          // Successfully parsed - extract metadata
          for (const pmid of batch) {
            const result = data.result?.[pmid];
            if (result) {
              metadata[pmid] = {
                pmid,
                title: result.title || 'Research Article',
                authors: result.sortfirstauthor ? `${result.sortfirstauthor} et al.` : 'Various Authors',
                journal: result.source || 'Medical Journal',
                year: result.pubdate?.substring(0, 4) || '2024',
                url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
                abstract: '',
              };
            }
          }

          batchSuccess = true; // Mark as successful
        } catch (error) {
          console.error(`Error fetching batch ${i}-${i + 10} (attempt ${attempt + 1}):`, error);
          if (attempt === 2) {
            console.error(`Failed to fetch batch after 3 attempts, skipping...`);
          }
        }
      }
    }

    // console.log(`✅ Fetched metadata for ${Object.keys(metadata).length} PMIDs`);
    return metadata;
  }

  /**
   * Validate PMID exists
   */
  async validatePMID(pmid: string): Promise<boolean> {
    try {
      const url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Extract medical concepts from complex questions
   */
  private extractMedicalConcepts(topic: string): string[] {
    const concepts: string[] = [];
    const lower = topic.toLowerCase();

    // Common medical terms patterns
    const medicalPatterns = [
      // Diseases
      /\b(diabetes|hypertension|cancer|cirrhosis|ascites|hepatitis|pneumonia|asthma|copd|tuberculosis|malaria|covid|influenza|sepsis|stroke|myocardial infarction|heart failure|renal failure|kidney disease|liver disease|alzheimer|parkinson|epilepsy|schizophrenia|depression|anxiety)\b/gi,
      // Treatments
      /\b(treatment|therapy|medication|drug|surgery|chemotherapy|radiotherapy|immunotherapy|antibiotics|antivirals|antifungals|insulin|metformin|aspirin|statin|beta blocker|ace inhibitor|diuretic|corticosteroid|nsaid)\b/gi,
      // Procedures
      /\b(transplant|dialysis|catheterization|angioplasty|bypass|biopsy|endoscopy|colonoscopy|bronchoscopy|paracentesis|thoracentesis|lumbar puncture|intubation|ventilation)\b/gi,
      // Symptoms
      /\b(pain|fever|cough|dyspnea|edema|ascites|jaundice|bleeding|hemorrhage|infection|inflammation|nausea|vomiting|diarrhea|constipation|fatigue|weakness)\b/gi,
      // Body systems
      /\b(cardiac|cardiovascular|pulmonary|respiratory|hepatic|renal|neurological|gastrointestinal|endocrine|hematologic|immunologic|dermatologic)\b/gi,
      // Diagnostic terms
      /\b(diagnosis|screening|biomarker|imaging|ct scan|mri|ultrasound|x-ray|echocardiogram|ekg|ecg|blood test|biopsy)\b/gi,
    ];

    for (const pattern of medicalPatterns) {
      const matches = lower.match(pattern);
      if (matches) {
        concepts.push(...matches);
      }
    }

    return [...new Set(concepts)]; // Remove duplicates
  }

  /**
   * Clean and optimize search query with comprehensive disambiguation
   */
  private cleanQuery(query: string): string {
    const queryLower = query.toLowerCase();

    // If the query already contains explicit PubMed field syntax (e.g. [MeSH Terms], [pt]),
    // treat it as an "expert" query and preserve it as-is (aside from basic trimming).
    // This is important for callers like DiscoverService that build precise
    // specialty + publication-type queries and expect PubMed to interpret them directly.
    if (/\[[^\]]+\]/.test(query)) {
      return query.trim();
    }
    let cleaned = query.replace(/\b(research|study|paper|article|on|about|the|a|an|write|generate|create)\b/gi, ' ').trim();

    // ============================================================================
    // TYPO CORRECTION - Common medical term misspellings
    // ============================================================================
    const typoFixes: Record<string, string> = {
      'cirroshihs': 'cirrhosis',
      'cirrhisis': 'cirrhosis',
      'ascitis': 'ascites',
      'diabetis': 'diabetes',
      'hypertention': 'hypertension',
      'pnuemonia': 'pneumonia',
      'asthama': 'asthma',
      'tubercolosis': 'tuberculosis',
      'septicemia': 'sepsis',
      'alzhiemers': 'alzheimers',
      'parkinsons': 'parkinson',
      'leukimia': 'leukemia',
      'leukaemia': 'leukemia',
      'cancor': 'cancer',
      'tumour': 'tumor',
      'haemorrhage': 'hemorrhage',
      'oedema': 'edema',
    };

    for (const [typo, correct] of Object.entries(typoFixes)) {
      const regex = new RegExp(`\\b${typo}\\b`, 'gi');
      cleaned = cleaned.replace(regex, correct);
    }

    // console.log(`🔧 Typo correction: "${query}" → "${cleaned}"`);

    // ============================================================================
    // DIABETES DISAMBIGUATION
    // ============================================================================
    if (queryLower.includes('diabetes')) {
      // Type 2 diabetes mellitus
      if (queryLower.match(/type\s*2|t2d|type\s*ii|mellitus|management|glycemic|glucose|metformin|insulin resistance|hba1c/i)) {
        cleaned = `${cleaned} diabetes mellitus type 2`;
        cleaned = `(${cleaned}) NOT (diabetes insipidus OR insipidus OR vasopressin OR ADH OR desmopressin)`;
        return cleaned;
      }
      // Type 1 diabetes
      else if (queryLower.match(/type\s*1|t1d|type\s*i|insulin.dependent/i)) {
        cleaned = `${cleaned} diabetes mellitus type 1`;
        cleaned = `(${cleaned}) NOT (diabetes insipidus)`;
        return cleaned;
      }
      // Diabetes insipidus - be specific
      else if (queryLower.includes('insipidus')) {
        return cleaned; // Keep as is
      }
      // Gestational diabetes
      else if (queryLower.match(/gestational|pregnancy/i)) {
        cleaned = `${cleaned} gestational diabetes`;
        return cleaned;
      }
      // Default "diabetes" - assume Type 2 mellitus
      else {
        cleaned = `${cleaned} diabetes mellitus type 2`;
        cleaned = `(${cleaned}) NOT (diabetes insipidus)`;
        return cleaned;
      }
    }

    // ============================================================================
    // CANCER DISAMBIGUATION
    // ============================================================================
    if (queryLower.includes('cancer')) {
      // Keep specific cancer type
      const cancerTypes = ['lung', 'breast', 'colon', 'colorectal', 'prostate', 'pancreatic', 'liver', 'stomach', 'brain', 'skin', 'melanoma', 'leukemia', 'lymphoma'];
      const hasSpecificType = cancerTypes.some(type => queryLower.includes(type));

      if (hasSpecificType) {
        // Keep as is - specific type mentioned
        return cleaned;
      } else {
        // Generic "cancer" - add "neoplasm" for better results
        cleaned = `${cleaned} neoplasm`;
        return cleaned;
      }
    }

    // ============================================================================
    // HEART DISEASE DISAMBIGUATION
    // ============================================================================
    if (queryLower.match(/heart|cardiac|cardiovascular/i)) {
      // Heart failure
      if (queryLower.match(/failure|chf/i)) {
        cleaned = `${cleaned} heart failure`;
        cleaned = `(${cleaned}) NOT (renal failure OR kidney failure)`;
        return cleaned;
      }
      // Heart attack / MI
      else if (queryLower.match(/attack|myocardial infarction|mi\b/i)) {
        cleaned = `${cleaned} myocardial infarction`;
        return cleaned;
      }
      // Coronary artery disease
      else if (queryLower.match(/coronary|cad/i)) {
        cleaned = `${cleaned} coronary artery disease`;
        return cleaned;
      }
    }

    // ============================================================================
    // KIDNEY DISEASE DISAMBIGUATION
    // ============================================================================
    if (queryLower.match(/kidney|renal/i)) {
      // Chronic kidney disease
      if (queryLower.match(/chronic|ckd/i)) {
        cleaned = `${cleaned} chronic kidney disease`;
        return cleaned;
      }
      // Acute kidney injury
      else if (queryLower.match(/acute|aki/i)) {
        cleaned = `${cleaned} acute kidney injury`;
        return cleaned;
      }
    }

    // ============================================================================
    // CRISPR/GENE EDITING DISAMBIGUATION
    // ============================================================================
    if (queryLower.match(/crispr|cas9|gene editing/i)) {
      // Keep specific disease context if mentioned
      // Add required terms
      if (!queryLower.includes('cas9')) {
        cleaned = `${cleaned} CRISPR Cas9`;
      }
      return cleaned;
    }

    // ============================================================================
    // HYPERTENSION DISAMBIGUATION
    // ============================================================================
    if (queryLower.match(/hypertension|high blood pressure/i)) {
      cleaned = `${cleaned} hypertension`;
      // Exclude pulmonary hypertension unless specifically mentioned
      if (!queryLower.includes('pulmonary')) {
        cleaned = `(${cleaned}) NOT (pulmonary hypertension)`;
      }
      return cleaned;
    }

    // ============================================================================
    // STANDARD CLEANING FOR OTHER TOPICS
    // ============================================================================
    // Remove special characters that might break PubMed search
    cleaned = cleaned.replace(/[^\w\s-()]/g, ' ');

    // Remove extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Clean and optimize search query for PubMed
   */
  private cleanSearchQuery(topic: string): string {
    return this.cleanQuery(topic);
  }

  /**
   * Get full research data for topic with improved fuzzy/keyword search
   */
  async getResearchData(topic: string, minPMIDs: number = 20): Promise<{
    pmids: string[];
    metadata: Record<string, PMIDData>;
    cleanedTopic: string;
  }> {
    // Clean the search query
    const cleanedTopic = this.cleanSearchQuery(topic);
    // console.log(`🔍 Searching PubMed for: ${cleanedTopic}`);

    // Extract keywords for fallback strategies
    const keywords = this.extractKeywords(cleanedTopic);
    // console.log(`📝 Extracted keywords: ${keywords.join(', ')}`);

    // Try multiple search strategies
    let pmids: string[] = [];

    // Strategy 1: Cleaned query (exact phrase)
    // console.log(`🔍 Strategy 1: Exact cleaned query`);
    pmids = await this.searchPubMed(cleanedTopic, 30);

    // Strategy 2: Use ONLY the first (most specific) keyword
    if (pmids.length < minPMIDs && keywords.length >= 1 && keywords[0]) {
      // console.log(`⚠️ Only ${pmids.length} results, trying primary keyword: ${keywords[0]}`);
      pmids = await this.searchPubMed(keywords[0], 30);
    }

    // Strategy 3: Try with quotes (exact phrase match)
    if (pmids.length < minPMIDs) {
      // console.log(`⚠️ Only ${pmids.length} results, trying quoted search...`);
      pmids = await this.searchPubMed(`"${cleanedTopic}"`, 30);
    }

    // Strategy 4: Try original topic as last resort
    if (pmids.length < minPMIDs && cleanedTopic !== topic) {
      // console.log(`⚠️ Only ${pmids.length} results, trying original query...`);
      pmids = await this.searchPubMed(topic, 30);
    }

    let metadata: Record<string, PMIDData> = {};

    // If PubMed found results, fetch metadata
    if (pmids.length > 0) {
      // CRITICAL: Filter out already-used PMIDs to ensure uniqueness across sections
      const unusedPmids = pmids.filter(pmid => !PubMedService.globalUsedPMIDs.has(pmid));
      // console.log(`📊 PMIDs: ${pmids.length} total, ${unusedPmids.length} unused, ${PubMedService.globalUsedPMIDs.size} already used`);

      // Take up to minPMIDs from unused PMIDs
      const pmidsToFetch = unusedPmids.slice(0, minPMIDs);

      if (pmidsToFetch.length > 0) {
        metadata = await this.fetchPMIDMetadata(pmidsToFetch);

        // Mark these PMIDs as used in global tracker
        pmidsToFetch.forEach(pmid => PubMedService.globalUsedPMIDs.add(pmid));
        // console.log(`✅ Fetched ${Object.keys(metadata).length} new unique papers (${PubMedService.globalUsedPMIDs.size} total used)`);
      }
    }

    // Strategy 9: Use fallback sources if metadata fetch failed or insufficient results
    const metadataCount = Object.keys(metadata).length;
    if (metadataCount < minPMIDs) {
      const needed = minPMIDs - metadataCount;
      // console.log(`🔄 Using fallback sources (PubMed: ${pmids.length} PMIDs, ${metadataCount} with metadata, need ${needed} more)...`);
      try {
        // CRITICAL: Use CORE TOPIC for fallback, not the section-specific query
        const coreTopic = this.extractCoreTopic(cleanedTopic);
        // console.log(`🎯 Fallback searching for core topic: "${coreTopic}"`);
        const fallbackPapers = await this.fallbackService.searchWithFallback(coreTopic, needed);

        // Convert fallback papers to PMIDData format
        fallbackPapers.forEach((paper, index) => {
          const fallbackId = `fallback_${paper.source}_${index}`;
          metadata[fallbackId] = {
            pmid: fallbackId,
            title: paper.title,
            authors: paper.authors.join(', '),
            journal: paper.journal,
            year: paper.year,
            url: paper.url,
            abstract: paper.abstract,
            keywords: []
          };
          pmids.push(fallbackId);
        });



        // console.log(`✅ Added ${fallbackPapers.length} papers from fallback sources (total: ${Object.keys(metadata).length})`);
      } catch (error) {
        console.error('❌ Fallback sources failed:', error instanceof Error ? error.message : 'Unknown error');
        // Proceeding with fewer papers
        // Continue with whatever papers we have - don't fail the entire research
      }
    }

    return {
      pmids: pmids.slice(0, minPMIDs),
      metadata,
      cleanedTopic
    };
  }

  /**
   * Export ResearchPaper type for external use
   */
  static ResearchPaper = {} as ResearchPaper;
}
