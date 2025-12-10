/**
 * Token Extraction Utilities
 * 
 * Extract token usage from different AI provider responses
 */

export interface TokenCount {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export class TokenExtractor {
  /**
   * Extract tokens from OpenAI response
   */
  static fromOpenAI(response: any): TokenCount {
    const usage = response.usage || {};
    
    return {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
    };
  }

  /**
   * Extract tokens from Cerebras response
   */
  static fromCerebras(response: any): TokenCount {
    const usage = response.usage || {};
    
    return {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
    };
  }

  /**
   * Extract tokens from Together AI response
   */
  static fromTogether(response: any): TokenCount {
    const usage = response.usage || {};
    
    return {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
    };
  }

  /**
   * Extract tokens from Ollama response
   * Note: Ollama may not always provide token counts
   */
  static fromOllama(response: any): TokenCount {
    // Ollama sometimes provides token counts in different formats
    const usage = response.usage || response.eval_count || {};
    
    return {
      inputTokens: usage.prompt_tokens || usage.prompt_eval_count || 0,
      outputTokens: usage.completion_tokens || usage.eval_count || 0,
      totalTokens: usage.total_tokens || 0,
    };
  }

  /**
   * Extract tokens from streaming response chunks
   * Accumulate tokens from multiple chunks
   */
  static fromStreamChunks(chunks: any[]): TokenCount {
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;

    for (const chunk of chunks) {
      const usage = chunk.usage || {};
      if (usage.prompt_tokens) inputTokens = usage.prompt_tokens;
      if (usage.completion_tokens) outputTokens += usage.completion_tokens || 0;
    }

    totalTokens = inputTokens + outputTokens;

    return { inputTokens, outputTokens, totalTokens };
  }

  /**
   * Estimate tokens from text (fallback when API doesn't provide counts)
   * 
   * Rough estimation: ~4 characters per token for English text
   * This is approximate and varies by model and language
   */
  static estimateFromText(text: string): number {
    if (!text) return 0;
    
    // Remove extra whitespace
    const cleanText = text.trim().replace(/\s+/g, ' ');
    
    // Rough estimation: 4 characters per token
    return Math.ceil(cleanText.length / 4);
  }

  /**
   * Estimate input and output tokens from prompt and response
   */
  static estimateFromTexts(prompt: string, response: string): TokenCount {
    const inputTokens = this.estimateFromText(prompt);
    const outputTokens = this.estimateFromText(response);
    const totalTokens = inputTokens + outputTokens;

    return { inputTokens, outputTokens, totalTokens };
  }

  /**
   * Generic extractor - tries to detect format automatically
   */
  static fromResponse(response: any, provider?: string): TokenCount {
    // If provider is specified, use specific extractor
    if (provider) {
      switch (provider.toLowerCase()) {
        case 'openai':
          return this.fromOpenAI(response);
        case 'cerebras':
          return this.fromCerebras(response);
        case 'together':
          return this.fromTogether(response);
        case 'ollama':
          return this.fromOllama(response);
      }
    }

    // Try to auto-detect format
    if (response.usage) {
      return {
        inputTokens: response.usage.prompt_tokens || 0,
        outputTokens: response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0,
      };
    }

    // If no usage data, return zeros
    console.warn('No token usage data found in response');
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }

  /**
   * Validate token counts
   */
  static validate(tokens: TokenCount): boolean {
    if (tokens.inputTokens < 0 || tokens.outputTokens < 0 || tokens.totalTokens < 0) {
      console.error('Invalid token counts: negative values');
      return false;
    }

    // Total should equal sum of input and output (with small tolerance for rounding)
    const expectedTotal = tokens.inputTokens + tokens.outputTokens;
    const diff = Math.abs(tokens.totalTokens - expectedTotal);
    
    if (diff > 1) {
      console.warn(`Token count mismatch: total=${tokens.totalTokens}, expected=${expectedTotal}`);
      // Auto-correct
      tokens.totalTokens = expectedTotal;
    }

    return true;
  }
}
