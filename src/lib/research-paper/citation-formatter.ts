/**
 * Citation Formatter - Format citations in different academic styles
 * Supports: APA, MLA, IEEE, Vancouver, Chicago, Harvard
 */

export interface CitationData {
  authors: string;
  year: string;
  title: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url: string;
  pmid?: string;
  accessDate?: string;
}

export type CitationStyle = 'APA' | 'MLA' | 'IEEE' | 'Vancouver' | 'Chicago' | 'Harvard';

export class CitationFormatter {
  
  /**
   * Format in-text citation
   */
  static formatInText(data: CitationData, style: CitationStyle, citationNumber?: number): string {
    switch (style) {
      case 'APA':
        return this.formatAPAInText(data);
      case 'MLA':
        return this.formatMLAInText(data);
      case 'IEEE':
        return `[${citationNumber}]`;
      case 'Vancouver':
        return `[${citationNumber}]`;
      case 'Chicago':
        return this.formatChicagoInText(data, citationNumber);
      case 'Harvard':
        return this.formatHarvardInText(data);
      default:
        return `(${this.getFirstAuthorLastName(data.authors)}, ${data.year})`;
    }
  }

  /**
   * Format full reference
   */
  static formatReference(data: CitationData, style: CitationStyle, citationNumber?: number): string {
    switch (style) {
      case 'APA':
        return this.formatAPAReference(data);
      case 'MLA':
        return this.formatMLAReference(data);
      case 'IEEE':
        return this.formatIEEEReference(data, citationNumber || 1);
      case 'Vancouver':
        return this.formatVancouverReference(data, citationNumber || 1);
      case 'Chicago':
        return this.formatChicagoReference(data, citationNumber || 1);
      case 'Harvard':
        return this.formatHarvardReference(data);
      default:
        return this.formatAPAReference(data);
    }
  }

  // ============================================================================
  // APA 7th Edition
  // ============================================================================

  private static formatAPAInText(data: CitationData): string {
    const author = this.getFirstAuthorLastName(data.authors);
    return `(${author}, ${data.year})`;
  }

  private static formatAPAReference(data: CitationData): string {
    let ref = `${data.authors} (${data.year}). ${data.title}. `;
    
    if (data.journal) {
      ref += `*${data.journal}*`;
      if (data.volume) {
        ref += `, *${data.volume}*`;
        if (data.issue) {
          ref += `(${data.issue})`;
        }
      }
      if (data.pages) {
        ref += `, ${data.pages}`;
      }
      ref += '. ';
    }
    
    if (data.doi) {
      ref += `https://doi.org/${data.doi}`;
    } else if (data.url) {
      ref += data.url;
    }
    
    return ref;
  }

  // ============================================================================
  // MLA 9th Edition
  // ============================================================================

  private static formatMLAInText(data: CitationData): string {
    const author = this.getFirstAuthorLastName(data.authors);
    return `(${author})`;
  }

  private static formatMLAReference(data: CitationData): string {
    let ref = `${data.authors}. "${data.title}." `;
    
    if (data.journal) {
      ref += `*${data.journal}*`;
      if (data.volume) {
        ref += `, vol. ${data.volume}`;
        if (data.issue) {
          ref += `, no. ${data.issue}`;
        }
      }
      ref += `, ${data.year}`;
      if (data.pages) {
        ref += `, pp. ${data.pages}`;
      }
      ref += '. ';
    }
    
    if (data.url) {
      ref += data.url;
      if (data.accessDate) {
        ref += `. Accessed ${data.accessDate}`;
      }
    }
    
    return ref;
  }

  // ============================================================================
  // IEEE
  // ============================================================================

  private static formatIEEEReference(data: CitationData, number: number): string {
    let ref = `[${number}] ${data.authors}, "${data.title}," `;
    
    if (data.journal) {
      ref += `*${data.journal}*`;
      if (data.volume) {
        ref += `, vol. ${data.volume}`;
        if (data.issue) {
          ref += `, no. ${data.issue}`;
        }
      }
      if (data.pages) {
        ref += `, pp. ${data.pages}`;
      }
      ref += `, ${data.year}`;
    }
    
    if (data.doi) {
      ref += `, doi: ${data.doi}`;
    }
    
    return ref + '.';
  }

  // ============================================================================
  // Vancouver (Medical)
  // ============================================================================

  private static formatVancouverReference(data: CitationData, number: number): string {
    let ref = `${number}. ${data.authors}. ${data.title}. `;
    
    if (data.journal) {
      ref += `${data.journal}. ${data.year}`;
      if (data.volume) {
        ref += `;${data.volume}`;
        if (data.issue) {
          ref += `(${data.issue})`;
        }
      }
      if (data.pages) {
        ref += `:${data.pages}`;
      }
      ref += '.';
    }
    
    if (data.pmid) {
      ref += ` PMID: ${data.pmid}.`;
    }
    
    if (data.doi) {
      ref += ` doi: ${data.doi}`;
    }
    
    return ref;
  }

  // ============================================================================
  // Chicago (Notes and Bibliography)
  // ============================================================================

  private static formatChicagoInText(data: CitationData, number?: number): string {
    return `<sup>${number}</sup>`;
  }

  private static formatChicagoReference(data: CitationData, number: number): string {
    let ref = `${number}. ${data.authors}. "${data.title}." `;
    
    if (data.journal) {
      ref += `*${data.journal}*`;
      if (data.volume) {
        ref += ` ${data.volume}`;
        if (data.issue) {
          ref += `, no. ${data.issue}`;
        }
      }
      ref += ` (${data.year})`;
      if (data.pages) {
        ref += `: ${data.pages}`;
      }
      ref += '.';
    }
    
    if (data.doi) {
      ref += ` https://doi.org/${data.doi}`;
    }
    
    return ref;
  }

  // ============================================================================
  // Harvard
  // ============================================================================

  private static formatHarvardInText(data: CitationData): string {
    const author = this.getFirstAuthorLastName(data.authors);
    return `(${author} ${data.year})`;
  }

  private static formatHarvardReference(data: CitationData): string {
    let ref = `${data.authors} (${data.year}) '${data.title}', `;
    
    if (data.journal) {
      ref += `*${data.journal}*`;
      if (data.volume) {
        ref += `, ${data.volume}`;
        if (data.issue) {
          ref += `(${data.issue})`;
        }
      }
      if (data.pages) {
        ref += `, pp. ${data.pages}`;
      }
      ref += '.';
    }
    
    if (data.doi) {
      ref += ` doi: ${data.doi}`;
    }
    
    return ref;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private static getFirstAuthorLastName(authors: string): string {
    // Extract first author's last name
    const firstAuthor = authors.split(',')[0].split(' et al')[0].trim();
    const parts = firstAuthor.split(' ');
    return parts[parts.length - 1];
  }

  /**
   * Convert UnifiedSource to CitationData
   */
  static fromUnifiedSource(source: any): CitationData {
    return {
      authors: source.authors || 'Unknown',
      year: source.year || new Date().getFullYear().toString(),
      title: source.title || 'Untitled',
      journal: source.journal,
      volume: source.volume,
      issue: source.issue,
      pages: source.pages,
      doi: source.doi,
      url: source.url,
      pmid: source.id?.replace('pubmed_', ''),
    };
  }

  /**
   * Format entire reference list
   */
  static formatReferenceList(
    sources: any[],
    style: CitationStyle
  ): string {
    const citations = sources.map((source, index) => {
      const citationData = this.fromUnifiedSource(source);
      return this.formatReference(citationData, style, index + 1);
    });

    let header = '';
    switch (style) {
      case 'APA':
      case 'Harvard':
        header = '## References\n\n';
        break;
      case 'MLA':
        header = '## Works Cited\n\n';
        break;
      case 'IEEE':
      case 'Vancouver':
      case 'Chicago':
        header = '## References\n\n';
        break;
    }

    return header + citations.join('\n\n');
  }

  /**
   * Replace citation placeholders in text
   */
  static applyCitationsToText(
    text: string,
    sources: any[],
    style: CitationStyle
  ): string {
    // Replace [1], [2], etc. with proper in-text citations
    let result = text;
    
    sources.forEach((source, index) => {
      const citationData = this.fromUnifiedSource(source);
      const inText = this.formatInText(citationData, style, index + 1);
      
      // For numbered styles (IEEE, Vancouver), keep [1], [2]
      if (style === 'IEEE' || style === 'Vancouver') {
        // Already in correct format
        return;
      }
      
      // For author-year styles, replace [1] with (Author, Year)
      const pattern = new RegExp(`\\[${index + 1}\\]`, 'g');
      result = result.replace(pattern, inText);
    });
    
    return result;
  }
}
