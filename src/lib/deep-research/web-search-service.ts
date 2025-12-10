/**
 * WebSearchService - Search the web using DuckDuckGo
 * Free, no API key required, privacy-focused
 */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
}

export class WebSearchService {
  private readonly rateLimit = 2000; // 2 seconds between requests
  private lastRequestTime = 0;

  /**
   * Low-level DuckDuckGo HTML scraping helper
   */
  private async searchDuckDuckGo(query: string, maxResults: number = 10): Promise<WebSearchResult[]> {
    await this.respectRateLimit();

    try {
      // Clean query
      const cleanedQuery = this.cleanQuery(query);
      console.log(`🔍 Searching web for: ${cleanedQuery}`);

      // Use DuckDuckGo HTML
      const encodedQuery = encodeURIComponent(cleanedQuery);
      const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo search failed: ${response.status}`);
      }

      const html = await response.text();
      const results = this.parseHTML(html, maxResults);

      console.log(`✅ Found ${results.length} web results`);
      return results;

    } catch (error) {
      console.error('Web search failed:', error);
      return [];
    }
  }

  /**
   * Generic web search
   */
  async search(query: string, maxResults: number = 10): Promise<WebSearchResult[]> {
    return this.searchDuckDuckGo(query, maxResults);
  }

  /**
   * Search for academic papers specifically
   */
  async searchAcademic(query: string, maxResults: number = 10): Promise<WebSearchResult[]> {
    const academicQuery = `${query} (PDF OR "research paper" OR "scientific article") site:.edu OR site:.gov OR site:researchgate.net OR site:scholar.google.com`;
    return this.searchDuckDuckGo(academicQuery, maxResults);
  }

  /**
   * Search for recent news/articles
   */
  async searchRecent(query: string, maxResults: number = 10): Promise<WebSearchResult[]> {
    const recentQuery = `${query} (2023 OR 2024 OR 2025) (news OR article OR report)`;
    return this.searchDuckDuckGo(recentQuery, maxResults);
  }

  /**
   * Clean query for web search
   */
  private cleanQuery(query: string): string {
    // Remove special characters that might break search
    let cleaned = query
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  /**
   * Parse DuckDuckGo HTML results
   */
  private parseHTML(html: string, maxResults: number): WebSearchResult[] {
    const results: WebSearchResult[] = [];

    try {
      // Extract result blocks
      const resultRegex = /<div class="result[^"]*">([\s\S]*?)<\/div>\s*<\/div>/g;
      const matches = html.match(resultRegex) || [];

      for (const match of matches.slice(0, maxResults)) {
        const result = this.parseResult(match);
        if (result && this.isRelevant(result)) {
          results.push(result);
        }
      }

    } catch (error) {
      console.error('Failed to parse DuckDuckGo HTML:', error);
    }

    return results;
  }

  /**
   * Parse single result
   */
  private parseResult(html: string): WebSearchResult | null {
    try {
      // Extract title
      const titleMatch = html.match(/<a[^>]*class="result__a"[^>]*>(.*?)<\/a>/);
      const titleRaw = titleMatch && titleMatch[1] ? titleMatch[1] : '';
      const title = this.stripHTML(titleRaw);

      // Extract URL
      const urlMatch = html.match(/href="([^"]+)"/);
      const urlRaw = urlMatch && urlMatch[1] ? urlMatch[1] : '';
      const url = this.decodeURL(urlRaw);

      // Extract snippet
      const snippetMatch = html.match(/<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/);
      const snippetRaw = snippetMatch && snippetMatch[1] ? snippetMatch[1] : '';
      const snippet = this.stripHTML(snippetRaw);

      // Extract source domain
      const source = this.extractDomain(url || '');

      if (!title || !url) {
        return null;
      }

      return {
        title,
        url,
        snippet,
        source
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Strip HTML tags
   */
  private stripHTML(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Decode DuckDuckGo URL
   */
  private decodeURL(url: string): string {
    try {
      // DuckDuckGo wraps URLs, extract the actual URL
      const uddgMatch = url.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        return decodeURIComponent(uddgMatch[1]);
      }
      return url;
    } catch {
      return url;
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlString = url || '';
      const urlObj = new URL(urlString);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Check if result is relevant (filter out low-quality sources)
   */
  private isRelevant(result: WebSearchResult): boolean {
    const url = result.url.toLowerCase();
    const title = result.title.toLowerCase();

    // Exclude social media and forums
    const excludeDomains = [
      'facebook.com', 'twitter.com', 'reddit.com', 'quora.com',
      'pinterest.com', 'instagram.com', 'tiktok.com', 'youtube.com'
    ];

    for (const domain of excludeDomains) {
      if (url.includes(domain)) {
        return false;
      }
    }

    // Prefer academic sources
    const preferDomains = [
      '.edu', '.gov', 'nih.gov', 'cdc.gov', 'who.int',
      'researchgate.net', 'scholar.google', 'pubmed', 'arxiv.org',
      'nature.com', 'science.org', 'cell.com', 'thelancet.com'
    ];

    for (const domain of preferDomains) {
      if (url.includes(domain)) {
        return true;
      }
    }

    // Check for academic keywords in title
    const academicKeywords = [
      'research', 'study', 'paper', 'journal', 'article',
      'clinical', 'trial', 'review', 'analysis', 'findings'
    ];

    for (const keyword of academicKeywords) {
      if (title.includes(keyword)) {
        return true;
      }
    }

    // Default: include if snippet is substantial
    return result.snippet.length > 100;
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
   * Convert to common format for multi-source
   */
  toCommonFormat(result: WebSearchResult) {
    return {
      id: this.generateId(result.url),
      title: result.title,
      authors: result.source,
      abstract: result.snippet,
      year: result.publishedDate?.split('-')[0] || new Date().getFullYear().toString(),
      source: 'Web',
      url: result.url,
      journal: result.source,
      snippet: result.snippet
    };
  }

  /**
   * Generate unique ID from URL
   */
  private generateId(url: string): string {
    return Buffer.from(url).toString('base64').substring(0, 16);
  }
}
