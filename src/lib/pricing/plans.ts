export interface PricingPlan {
  id: string;
  name: string;
  credits: number;
  priceUSD: number;
  priceINR: number;
  features: string[];
  popular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    credits: 100,
    priceUSD: 0,
    priceINR: 0,
    features: [
      "100 free credits on signup",
      "Basic AI features",
      "Limited presentations",
      "Community support",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    credits: 1000,
    priceUSD: 9.99,
    priceINR: 799,
    features: [
      "1,000 credits/month (auto-refresh)",
      "All AI features",
      "Unlimited presentations",
      "Priority support",
      "Export to PDF/PPTX",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    credits: 5000,
    priceUSD: 29.99,
    priceINR: 2499,
    popular: true,
    features: [
      "5,000 credits/month (auto-refresh)",
      "Advanced AI models",
      "Custom themes",
      "API access",
      "Priority processing",
      "Dedicated support",
    ],
  },
];

// Credit costs for different operations
export const CREDIT_COSTS = {
  // Presentation
  presentation_outline: 5,
  presentation_generate: 10,
  presentation_edit: 3,
  
  // Research
  research_paper: 15,
  deep_research: 20,
  
  // Chat
  chat_message: 1,
  
  // Editor
  editor_generate: 5,
  editor_improve: 3,
  editor_citations: 2,
  
  // AI Writing Features (SciSpace-like)
  ai_autocomplete: 1,      // AI sentence completion
  ai_paraphrase: 3,        // Text paraphrasing
  citation_search: 0,      // Citation search is free
  
  // Images
  image_generate: 5,
  image_unsplash: 0, // Free

  // PDF Chat
  // Processing cost per MB of uploaded PDF (rounded up)
  pdf_process_per_mb: 2,
  // Embedding cost per chunk created during processing
  pdf_embedding_per_chunk: 1,
};

export function getCreditCost(operation: string): number {
  return CREDIT_COSTS[operation as keyof typeof CREDIT_COSTS] || 1;
}

export function getPlanById(planId: string): PricingPlan | undefined {
  return PRICING_PLANS.find(plan => plan.id === planId);
}
