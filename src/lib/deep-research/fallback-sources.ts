/**
 * Fallback Medical Research Sources
 * When PubMed is unavailable, use these alternative sources
 */

import { RateLimiterManager } from './rate-limiter';

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: string;
  journal: string;
  url: string;
  doi?: string;
  source: 'crossref' | 'semantic-scholar' | 'openalex';
}

export class CrossRefService {
  private baseUrl = 'https://api.crossref.org/works';
  private rateLimiter = RateLimiterManager.getFallbackLimiter();

  async searchPapers(query: string, maxResults: number = 20): Promise<ResearchPaper[]> {
    try {
      const params = new URLSearchParams({
        query,
        rows: String(maxResults),
        filter: 'type:journal-article,has-abstract:true,from-pub-date:2000-01-01',
        select: 'DOI,title,author,published,published-print,container-title,abstract'
      });

      const response = await this.rateLimiter.enqueue(() =>
        fetch(`${this.baseUrl}?${params}`, {
          headers: { 
            'User-Agent': 'BioDocsAI/1.0 (+https://biodocsai.com; contact@biodocsai.com)',
            'Accept': 'application/json'
          }
        })
      );
      
      if (!response.ok) {
        console.warn(`[CrossRef] API error: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      return (data.message?.items || [])
        .filter((item: any) => item.DOI && item.title?.[0])
        .map((item: any) => ({
          id: item.DOI,
          title: item.title?.[0] || 'Untitled',
          authors: item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()) || ['Unknown'],
          abstract: item.abstract || '',
          year: item.published?.['date-parts']?.[0]?.[0]?.toString() || item['published-print']?.['date-parts']?.[0]?.[0]?.toString() || 'Unknown',
          journal: item['container-title']?.[0] || 'Unknown Journal',
          url: `https://doi.org/${item.DOI}`,
          doi: item.DOI,
          source: 'crossref' as const
        }));
    } catch (error) {
      console.error('[CrossRef] search failed:', error);
      return [];
    }
  }
}

export class SemanticScholarService {
  private baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';
  private rateLimiter = RateLimiterManager.getFallbackLimiter();

  async searchPapers(query: string, maxResults: number = 20): Promise<ResearchPaper[]> {
    try {
      const params = new URLSearchParams({
        query,
        limit: String(maxResults),
        fields: 'title,authors,year,abstract,venue,url,externalIds'
      });

      const response = await this.rateLimiter.enqueue(() =>
        fetch(`${this.baseUrl}?${params}`, {
          headers: { 
            'User-Agent': 'BioDocsAI/1.0 (+https://biodocsai.com; contact@biodocsai.com)',
            'Accept': 'application/json'
          }
        })
      );
      
      if (!response.ok) {
        console.warn(`[Semantic Scholar] API error: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      return (data.data || [])
        .filter((paper: any) => paper.title && paper.url)
        .map((paper: any) => ({
          id: paper.paperId,
          title: paper.title || 'Untitled',
          authors: paper.authors?.map((a: any) => a.name) || ['Unknown'],
          abstract: paper.abstract || '',
          year: paper.year?.toString() || 'Unknown',
          journal: paper.venue || 'Unknown Journal',
          url: paper.url || `https://semanticscholar.org/paper/${paper.paperId}`,
          doi: paper.externalIds?.DOI,
          source: 'semantic-scholar' as const
        }));
    } catch (error) {
      console.error('[Semantic Scholar] search failed:', error);
      return [];
    }
  }
}

export class OpenAlexService {
  private baseUrl = 'https://api.openalex.org/works';
  private rateLimiter = RateLimiterManager.getFallbackLimiter();

  async searchPapers(query: string, maxResults: number = 20): Promise<ResearchPaper[]> {
    try {
      const params = new URLSearchParams({
        search: query,
        'per-page': String(maxResults),
        select: 'id,title,authorships,publication_year,abstract_inverted_index,host_venue,doi',
        filter: 'type:journal-article,has_abstract:true,from_publication_date:2000-01-01'
      });

      const response = await this.rateLimiter.enqueue(() =>
        fetch(`${this.baseUrl}?${params}`, {
          headers: { 
            'User-Agent': 'BioDocsAI/1.0 (+https://biodocsai.com; contact@biodocsai.com)',
            'Accept': 'application/json'
          }
        })
      );
      
      if (!response.ok) {
        console.warn(`[OpenAlex] API error: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      
      return (data.results || [])
        .filter((work: any) => work.title && (work.doi || work.id))
        .map((work: any) => ({
          id: work.id,
          title: work.title || 'Untitled',
          authors: work.authorships?.map((a: any) => a.author?.display_name).filter(Boolean) || ['Unknown'],
          abstract: work.abstract_inverted_index ? this.parseAbstract(work.abstract_inverted_index) : '',
          year: work.publication_year?.toString() || 'Unknown',
          journal: work.host_venue?.display_name || 'Unknown Journal',
          url: work.doi ? `https://doi.org/${work.doi}` : work.id,
          doi: work.doi,
          source: 'openalex' as const
        }));
    } catch (error) {
      console.error('[OpenAlex] search failed:', error);
      return [];
    }
  }

  private parseAbstract(abstractIndex: Record<string, number[]>): string {
    if (!abstractIndex) return '';
    try {
      const entries: Array<{ word: string; positions: number[] }> = Object.entries(abstractIndex).map(([word, positions]) => ({ 
        word, 
        positions: Array.isArray(positions) ? positions : [] 
      }));
      entries.sort((a, b) => Math.min(...a.positions, Infinity) - Math.min(...b.positions, Infinity));
      return entries.map(w => w.word).join(' ');
    } catch {
      return '';
    }
  }
}

/**
 * Unified fallback service that aggregates multiple sources
 */
export class FallbackResearchService {
  private static globalUsedPaperIds: Set<string> = new Set(); // Global deduplication tracker
  
  private crossRefService = new CrossRefService();
  private semanticScholarService = new SemanticScholarService();
  private openAlexService = new OpenAlexService();

  /**
   * Reset global used papers tracker (call at start of new research session)
   */
  static resetGlobalUsedPapers(): void {
    FallbackResearchService.globalUsedPaperIds.clear();
    console.log('🔄 Reset global fallback papers tracker');
  }

  async searchWithFallback(query: string, targetCount: number = 20): Promise<ResearchPaper[]> {
    console.log(`🔍 Using fallback sources for: ${query}`);

    // Query all sources in parallel - rate limiter handles throttling
    const perSource = Math.max(20, targetCount);
    const [crossRefResult, semanticResult, openAlexResult] = await Promise.allSettled([
      this.crossRefService.searchPapers(query, perSource),
      this.semanticScholarService.searchPapers(query, perSource),
      this.openAlexService.searchPapers(query, perSource)
    ]);

    const all: ResearchPaper[] = [];
    if (crossRefResult?.status === 'fulfilled') all.push(...crossRefResult.value);
    if (semanticResult?.status === 'fulfilled') all.push(...semanticResult.value);
    if (openAlexResult?.status === 'fulfilled') all.push(...openAlexResult.value);

    // Filter to quality items (must have title, url/doi, journal, and abstract)
    const quality = all.filter(p => 
      p.title && 
      p.title.length > 10 &&
      (p.url || p.doi) && 
      p.journal && 
      p.journal !== 'Unknown Journal' &&
      p.abstract && 
      p.abstract.length > 50
    );

    // Deduplicate by DOI, then by normalized title (both locally and globally)
    const seenDois = new Set<string>();
    const seenTitles = new Set<string>();
    const dedup: ResearchPaper[] = [];
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    
    for (const p of quality) {
      const doiKey = (p.doi || '').toLowerCase();
      const titleKey = norm(p.title);
      const uniqueId = doiKey || titleKey;
      
      // Check both local (this batch) and global (across sections) duplicates
      if (doiKey && (seenDois.has(doiKey) || FallbackResearchService.globalUsedPaperIds.has(doiKey))) continue;
      if (!doiKey && (seenTitles.has(titleKey) || FallbackResearchService.globalUsedPaperIds.has(titleKey))) continue;
      
      // Mark as seen locally and globally
      if (doiKey) {
        seenDois.add(doiKey);
        FallbackResearchService.globalUsedPaperIds.add(doiKey);
      } else {
        seenTitles.add(titleKey);
        FallbackResearchService.globalUsedPaperIds.add(titleKey);
      }
      
      dedup.push(p);
    }

    // Basic ranking: keyword overlap, DOI presence, recency
    const kw = norm(query).split(' ').filter(Boolean);
    const score = (p: ResearchPaper) => {
      const title = norm(p.title);
      const abstract = norm(p.abstract || '');
      const overlap = kw.reduce((acc, w) => 
        acc + (title.includes(w) ? 2 : 0) + (abstract.includes(w) ? 1 : 0), 0
      );
      const hasDoi = p.doi ? 5 : 0;
      const year = parseInt(p.year || '0', 10) || 0;
      const recency = Math.max(0, year - 2000) / 2;
      return overlap + hasDoi + recency;
    };

    dedup.sort((x, y) => score(y) - score(x));
    const finalList = dedup.slice(0, targetCount);

    console.log(`✅ Fallback sources: ${dedup.length} unique papers (from ${all.length} total, ${FallbackResearchService.globalUsedPaperIds.size} globally used)`);
    return finalList;
  }
}
