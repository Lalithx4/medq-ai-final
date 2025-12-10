/**
 * MultiSourceService - Orchestrate searches across multiple sources
 * Aggregates, deduplicates, and ranks results from PubMed, arXiv, and Web
 */

import { PubMedService, type PMIDData } from './pubmed-service';
import { ArxivService, type ArxivPaper } from './arxiv-service';
import { WebSearchService, type WebSearchResult } from './web-search-service';

export interface SourceSelection {
  pubmed: boolean;
  arxiv: boolean;
  web: boolean;
}

export interface UnifiedSource {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  year: string;
  source: 'PubMed' | 'arXiv' | 'Web';
  url: string;
  journal?: string;
  doi?: string;
  categories?: string[];
  snippet?: string;
  relevanceScore: number;
}

export class MultiSourceService {
  private pubmedService: PubMedService;
  private arxivService: ArxivService;
  private webSearchService: WebSearchService;

  constructor() {
    this.pubmedService = new PubMedService();
    this.arxivService = new ArxivService();
    this.webSearchService = new WebSearchService();
  }

  /**
   * Reset used PMIDs tracker (for new research sessions)
   */
  resetUsedPMIDs(): void {
    this.pubmedService.resetUsedPMIDs();
  }

  /**
   * Search across selected sources
   */
  async searchAll(
    query: string,
    sources: SourceSelection,
    maxPerSource: number = 20
  ): Promise<{
    results: UnifiedSource[];
    sourceStats: {
      pubmed: number;
      arxiv: number;
      web: number;
    };
  }> {
    console.log(`🔍 Multi-source search for: "${query}"`);
    console.log(`   Sources: PubMed=${sources.pubmed}, arXiv=${sources.arxiv}, Web=${sources.web}`);

    const allResults: UnifiedSource[] = [];
    const sourceStats = { pubmed: 0, arxiv: 0, web: 0 };

    // Search all sources in parallel
    const searchPromises: Promise<void>[] = [];

    // PubMed search
    if (sources.pubmed) {
      searchPromises.push(
        this.searchPubMed(query, maxPerSource)
          .then(results => {
            allResults.push(...results);
            sourceStats.pubmed = results.length;
          })
          .catch(err => console.error('PubMed search failed:', err))
      );
    }

    // arXiv search
    if (sources.arxiv) {
      searchPromises.push(
        this.searchArxiv(query, maxPerSource)
          .then(results => {
            allResults.push(...results);
            sourceStats.arxiv = results.length;
          })
          .catch(err => console.error('arXiv search failed:', err))
      );
    }

    // Web search
    if (sources.web) {
      searchPromises.push(
        this.searchWeb(query, maxPerSource)
          .then(results => {
            allResults.push(...results);
            sourceStats.web = results.length;
          })
          .catch(err => console.error('Web search failed:', err))
      );
    }

    // Wait for all searches to complete
    await Promise.all(searchPromises);

    // Deduplicate results
    const deduplicated = this.deduplicateResults(allResults);

    // Rank by relevance
    const ranked = this.rankResults(deduplicated, query);

    console.log(`✅ Multi-source search complete:`);
    console.log(`   PubMed: ${sourceStats.pubmed} results`);
    console.log(`   arXiv: ${sourceStats.arxiv} results`);
    console.log(`   Web: ${sourceStats.web} results`);
    console.log(`   Total: ${ranked.length} unique results`);

    return {
      results: ranked,
      sourceStats
    };
  }

  /**
   * Search PubMed
   */
  private async searchPubMed(query: string, maxResults: number): Promise<UnifiedSource[]> {
    try {
      const { pmids, metadata, cleanedTopic } = await this.pubmedService.getResearchData(query, Math.min(maxResults, 20));

      return Object.entries(metadata).map(([pmid, data]) => ({
        id: `pubmed_${pmid}`,
        title: data.title,
        authors: data.authors,
        abstract: data.abstract || '',
        year: data.year,
        source: 'PubMed' as const,
        url: data.url,
        journal: data.journal,
        doi: pmid,
        relevanceScore: 1.0 // PubMed gets highest base score (peer-reviewed)
      }));
    } catch (error) {
      console.error('PubMed search error:', error);
      return [];
    }
  }

  /**
   * Search arXiv
   */
  private async searchArxiv(query: string, maxResults: number): Promise<UnifiedSource[]> {
    try {
      const papers = await this.arxivService.searchPapers(query, maxResults);

      return papers.map(paper => ({
        id: `arxiv_${paper.id}`,
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        year: paper.published.split('-')[0] || new Date().getFullYear().toString(),
        source: 'arXiv' as const,
        url: paper.url,
        journal: `arXiv:${paper.id}`,
        doi: paper.doi,
        categories: paper.categories,
        relevanceScore: 0.85 // arXiv gets slightly lower (preprints)
      }));
    } catch (error) {
      console.error('arXiv search error:', error);
      return [];
    }
  }

  /**
   * Search Web
   */
  private async searchWeb(query: string, maxResults: number): Promise<UnifiedSource[]> {
    try {
      const results = await this.webSearchService.searchRecent(query, maxResults);

      return results.map(result => ({
        id: `web_${Buffer.from(result.url).toString('base64').substring(0, 16)}`,
        title: result.title,
        authors: result.source,
        abstract: result.snippet,
        year: result.publishedDate?.split('-')[0] || new Date().getFullYear().toString(),
        source: 'Web' as const,
        url: result.url,
        journal: result.source,
        snippet: result.snippet,
        relevanceScore: 0.7 // Web gets lowest base score (quality varies)
      }));
    } catch (error) {
      console.error('Web search error:', error);
      return [];
    }
  }

  /**
   * Deduplicate results by title similarity
   */
  private deduplicateResults(results: UnifiedSource[]): UnifiedSource[] {
    const unique: UnifiedSource[] = [];
    const seenTitles = new Set<string>();

    for (const result of results) {
      const normalizedTitle = this.normalizeTitle(result.title);

      // Check for exact match
      if (seenTitles.has(normalizedTitle)) {
        continue;
      }

      // Check for similar titles (>90% similarity)
      let isDuplicate = false;
      for (const seenTitle of seenTitles) {
        if (this.titleSimilarity(normalizedTitle, seenTitle) > 0.9) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        unique.push(result);
        seenTitles.add(normalizedTitle);
      }
    }

    return unique;
  }

  /**
   * Normalize title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate title similarity (Jaccard similarity)
   */
  private titleSimilarity(title1: string, title2: string): number {
    const words1 = new Set(title1.split(' '));
    const words2 = new Set(title2.split(' '));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Rank results by relevance
   */
  private rankResults(results: UnifiedSource[], query: string): UnifiedSource[] {
    const queryWords = query.toLowerCase().split(' ');

    // Calculate relevance scores
    for (const result of results) {
      let score = result.relevanceScore;

      // Title match bonus
      const titleLower = result.title.toLowerCase();
      const titleMatches = queryWords.filter(word => titleLower.includes(word)).length;
      score += (titleMatches / queryWords.length) * 0.3;

      // Abstract match bonus
      const abstractLower = result.abstract.toLowerCase();
      const abstractMatches = queryWords.filter(word => abstractLower.includes(word)).length;
      score += (abstractMatches / queryWords.length) * 0.2;

      // Recency bonus (last 3 years)
      const year = parseInt(result.year);
      const currentYear = new Date().getFullYear();
      if (year >= currentYear - 3) {
        score += 0.1;
      }

      // Source quality bonus
      if (result.source === 'PubMed') {
        score += 0.2; // Peer-reviewed
      } else if (result.source === 'arXiv') {
        score += 0.1; // Preprints
      }

      result.relevanceScore = score;
    }

    // Sort by relevance score (descending)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get top N results
   */
  getTopResults(results: UnifiedSource[], n: number): UnifiedSource[] {
    return results.slice(0, n);
  }

  /**
   * Filter by source
   */
  filterBySource(results: UnifiedSource[], source: 'PubMed' | 'arXiv' | 'Web'): UnifiedSource[] {
    return results.filter(r => r.source === source);
  }

  /**
   * Get statistics
   */
  getStatistics(results: UnifiedSource[]) {
    const stats = {
      total: results.length,
      bySource: {
        pubmed: results.filter(r => r.source === 'PubMed').length,
        arxiv: results.filter(r => r.source === 'arXiv').length,
        web: results.filter(r => r.source === 'Web').length
      },
      byYear: {} as Record<string, number>,
      averageRelevance: results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length
    };

    // Count by year
    for (const result of results) {
      stats.byYear[result.year] = (stats.byYear[result.year] || 0) + 1;
    }

    return stats;
  }
}
