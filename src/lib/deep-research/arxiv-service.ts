/**
 * ArxivService - Search and fetch papers from arXiv
 * Covers: Physics, Mathematics, Computer Science, Quantitative Biology, Statistics
 */

export interface ArxivPaper {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  published: string;
  updated: string;
  categories: string[];
  url: string;
  pdfUrl: string;
  doi?: string;
}

export class ArxivService {
  private readonly baseUrl = 'http://export.arxiv.org/api/query';
  private readonly rateLimit = 3000; // 3 seconds between requests
  private lastRequestTime = 0;

  /**
   * Search arXiv for papers
   */
  async searchPapers(query: string, maxResults: number = 20): Promise<ArxivPaper[]> {
    await this.respectRateLimit();

    try {
      // Clean and optimize query
      const cleanedQuery = this.cleanQuery(query);
      console.log(`🔍 Searching arXiv for: ${cleanedQuery}`);

      // Build search URL
      const params = new URLSearchParams({
        search_query: `all:${cleanedQuery}`,
        start: '0',
        max_results: maxResults.toString(),
        sortBy: 'relevance',
        sortOrder: 'descending'
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.status}`);
      }

      const xmlText = await response.text();
      const papers = this.parseArxivXML(xmlText);

      console.log(`✅ Found ${papers.length} papers from arXiv`);
      return papers;

    } catch (error) {
      console.error('arXiv search failed:', error);
      return [];
    }
  }

  /**
   * Search by category
   */
  async searchByCategory(query: string, category: string, maxResults: number = 20): Promise<ArxivPaper[]> {
    await this.respectRateLimit();

    try {
      const cleanedQuery = this.cleanQuery(query);
      
      const params = new URLSearchParams({
        search_query: `cat:${category} AND all:${cleanedQuery}`,
        start: '0',
        max_results: maxResults.toString(),
        sortBy: 'relevance',
        sortOrder: 'descending'
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.status}`);
      }

      const xmlText = await response.text();
      return this.parseArxivXML(xmlText);

    } catch (error) {
      console.error('arXiv category search failed:', error);
      return [];
    }
  }

  /**
   * Get relevant categories based on topic
   */
  private getRelevantCategories(topic: string): string[] {
    const topicLower = topic.toLowerCase();
    const categories: string[] = [];

    // Computer Science
    if (topicLower.match(/machine learning|ai|artificial intelligence|neural network|deep learning/)) {
      categories.push('cs.LG', 'cs.AI');
    }
    if (topicLower.match(/computer vision|image processing/)) {
      categories.push('cs.CV');
    }
    if (topicLower.match(/nlp|natural language|text processing/)) {
      categories.push('cs.CL');
    }

    // Biology
    if (topicLower.match(/biology|genomics|protein|dna|rna|cell/)) {
      categories.push('q-bio.GN', 'q-bio.BM');
    }
    if (topicLower.match(/neuroscience|brain|neural/)) {
      categories.push('q-bio.NC');
    }

    // Physics
    if (topicLower.match(/physics|quantum|particle/)) {
      categories.push('physics');
    }

    // Mathematics
    if (topicLower.match(/mathematics|statistics|probability/)) {
      categories.push('math', 'stat');
    }

    return categories;
  }

  /**
   * Clean query for arXiv search
   */
  private cleanQuery(query: string): string {
    // Remove common filler words
    let cleaned = query.toLowerCase()
      .replace(/\b(research|study|paper|article|on|about|the|a|an)\b/gi, ' ')
      .trim();

    // Remove special characters that might break arXiv search
    cleaned = cleaned.replace(/[^\w\s-]/g, ' ');

    // Remove extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Parse arXiv XML response
   */
  private parseArxivXML(xmlText: string): ArxivPaper[] {
    const papers: ArxivPaper[] = [];

    try {
      // Simple XML parsing (in production, use a proper XML parser)
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      const entries = xmlText.match(entryRegex) || [];

      for (const entry of entries) {
        const paper = this.parseEntry(entry);
        if (paper) {
          papers.push(paper);
        }
      }

    } catch (error) {
      console.error('Failed to parse arXiv XML:', error);
    }

    return papers;
  }

  /**
   * Parse single entry
   */
  private parseEntry(entry: string): ArxivPaper | null {
    try {
      // Extract fields using regex
      const idRaw = this.extractTag(entry, 'id');
      const id = idRaw ? idRaw.replace('http://arxiv.org/abs/', '') : '';
      const titleRaw = this.extractTag(entry, 'title');
      const title = titleRaw ? titleRaw.replace(/\s+/g, ' ').trim() : '';
      const summaryRaw = this.extractTag(entry, 'summary');
      const summary = summaryRaw ? summaryRaw.replace(/\s+/g, ' ').trim() : '';
      const published = this.extractTag(entry, 'published') || '';
      const updated = this.extractTag(entry, 'updated') || '';

      // Extract authors
      const authorMatches = entry.match(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g) || [];
      const authors = authorMatches
        .map(author => {
          const name = author.match(/<name>(.*?)<\/name>/)?.[1] || '';
          return name.trim();
        })
        .filter(name => name.length > 0)
        .slice(0, 5); // Limit to 5 authors

      const authorsStr = authors.length > 3 
        ? `${authors.slice(0, 3).join(', ')} et al.`
        : authors.join(', ');

      // Extract categories
      const categoryMatches = entry.match(/<category term="(.*?)"/g) || [];
      const categories = categoryMatches.map(cat => 
        cat.match(/term="(.*?)"/)?.[1] || ''
      ).filter(cat => cat.length > 0);

      // Extract DOI if available
      const doiMatch = entry.match(/<arxiv:doi.*?>(.*?)<\/arxiv:doi>/);
      const doi = doiMatch && doiMatch[1] ? doiMatch[1] : undefined;

      if (!id || !title) {
        return null;
      }

      return {
        id,
        title,
        authors: authorsStr,
        abstract: summary,
        published: published.split('T')[0], // Get date only
        updated: updated.split('T')[0],
        categories,
        url: `https://arxiv.org/abs/${id}`,
        pdfUrl: `https://arxiv.org/pdf/${id}.pdf`,
        doi
      };

    } catch (error) {
      console.error('Failed to parse arXiv entry:', error);
      return null;
    }
  }

  /**
   * Extract XML tag content
   */
  private extractTag(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Rate limiting
   */
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimit) {
      const waitTime = this.rateLimit - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Convert ArxivPaper to common format for multi-source
   */
  toCommonFormat(paper: ArxivPaper) {
    return {
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract,
      year: paper.published.split('-')[0],
      source: 'arXiv',
      url: paper.url,
      doi: paper.doi,
      journal: `arXiv preprint ${paper.id}`,
      categories: paper.categories,
      pdfUrl: paper.pdfUrl
    };
  }
}
