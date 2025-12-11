/**
 * Credit costs for various operations
 * This module defines the credit cost for each operation type
 */

// Pricing plan interface
export interface PricingPlan {
    id: string;
    name: string;
    priceUSD: number;
    priceINR: number;
    credits: number;
    features: string[];
    popular?: boolean;
}

// Available pricing plans
export const PRICING_PLANS: PricingPlan[] = [
    {
        id: "free",
        name: "Free",
        priceUSD: 0,
        priceINR: 0,
        credits: 50,
        features: [
            "50 credits per month",
            "Basic AI assistance",
            "PDF chat (limited)",
            "Community support",
        ],
    },
    {
        id: "pro",
        name: "Pro",
        priceUSD: 19,
        priceINR: 1499,
        credits: 500,
        features: [
            "500 credits per month",
            "Advanced AI models",
            "Unlimited PDF chat",
            "Deep research",
            "Priority support",
        ],
        popular: true,
    },
    {
        id: "enterprise",
        name: "Enterprise",
        priceUSD: 49,
        priceINR: 3999,
        credits: 2000,
        features: [
            "2000 credits per month",
            "All Pro features",
            "Custom integrations",
            "Dedicated support",
            "Team collaboration",
        ],
    },
];

// Credit costs for each operation type
export const CREDIT_COSTS: Record<string, number> = {
    // Research operations
    "deep-research": 5,
    "research-paper": 10,
    "research-paper-generate": 15,

    // Document operations
    "pdf-chat": 2,
    "pdf-chat-query": 1,
    "pdf-upload": 1,

    // Clinical operations
    "cdss": 3,
    "cdss-query": 2,
    "clinical-analysis": 5,

    // General operations
    "ai-query": 1,
    "ai-generation": 2,

    // Default cost for unknown operations
    "default": 1,
};

/**
 * Get the credit cost for a given operation
 * @param operation - The operation identifier
 * @returns The credit cost for the operation
 */
export function getCreditCost(operation: string): number {
    return CREDIT_COSTS[operation] ?? CREDIT_COSTS["default"] ?? 1;
}

/**
 * Get all available operations and their costs
 * @returns Record of operation names to credit costs
 */
export function getAllCreditCosts(): Record<string, number> {
    return { ...CREDIT_COSTS };
}

/**
 * Get a pricing plan by its ID
 * @param planId - The plan identifier (free, pro, enterprise)
 * @returns The pricing plan or undefined if not found
 */
export function getPlanById(planId: string): PricingPlan | undefined {
    return PRICING_PLANS.find((plan) => plan.id === planId);
}
