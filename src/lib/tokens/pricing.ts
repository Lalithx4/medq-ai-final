/**
 * Token Pricing Configuration
 * 
 * Prices are per 1 million tokens in USD
 * Updated: 2025-10-21
 */

export interface ModelPricing {
  input: number;  // Price per 1M input tokens
  output: number; // Price per 1M output tokens
}

export interface ProviderPricing {
  [modelId: string]: ModelPricing;
}

/**
 * Token pricing by provider and model
 * All prices in USD per 1 million tokens
 */
export const TOKEN_PRICING: Record<string, ProviderPricing> = {
  openai: {
    'gpt-4': {
      input: 30.00,
      output: 60.00,
    },
    'gpt-4-turbo': {
      input: 10.00,
      output: 30.00,
    },
    'gpt-4-turbo-preview': {
      input: 10.00,
      output: 30.00,
    },
    'gpt-3.5-turbo': {
      input: 0.50,
      output: 1.50,
    },
    'gpt-3.5-turbo-16k': {
      input: 3.00,
      output: 4.00,
    },
  },
  cerebras: {
    'llama3.1-8b': {
      input: 0.10,
      output: 0.10,
    },
    'llama3.1-70b': {
      input: 0.60,
      output: 0.60,
    },
    'llama-3.3-70b': {
      input: 0.60,
      output: 0.60,
    },
  },
  together: {
    'meta-llama/Llama-3-70b-chat-hf': {
      input: 0.88,
      output: 0.88,
    },
    'meta-llama/Llama-3-8b-chat-hf': {
      input: 0.20,
      output: 0.20,
    },
    'mistralai/Mixtral-8x7B-Instruct-v0.1': {
      input: 0.60,
      output: 0.60,
    },
  },
  ollama: {
    // Local models - no cost
    'llama2': {
      input: 0,
      output: 0,
    },
    'llama3': {
      input: 0,
      output: 0,
    },
    'mistral': {
      input: 0,
      output: 0,
    },
    '*': {
      input: 0,
      output: 0,
    },
  },
  lmstudio: {
    // Local models - no cost
    '*': {
      input: 0,
      output: 0,
    },
  },
};

/**
 * Get pricing for a specific model
 */
export function getModelPricing(
  provider: string,
  modelId: string
): ModelPricing {
  const providerPricing = TOKEN_PRICING[provider.toLowerCase()];
  
  if (!providerPricing) {
    console.warn(`Unknown provider: ${provider}, using default pricing`);
    return { input: 0, output: 0 };
  }

  // Try exact match first
  let pricing = providerPricing[modelId];
  
  // If not found, try wildcard
  if (!pricing) {
    pricing = providerPricing['*'];
  }

  // If still not found, use default
  if (!pricing) {
    console.warn(`Unknown model: ${modelId} for provider ${provider}, using default pricing`);
    return { input: 0, output: 0 };
  }

  return pricing;
}

/**
 * Calculate cost for given token counts
 */
export function calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  provider: string,
  modelId: string
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = getModelPricing(provider, modelId);

  // Convert from per-million to actual cost
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
  };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Format token count for display
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1_000_000).toFixed(2)}M`;
}
