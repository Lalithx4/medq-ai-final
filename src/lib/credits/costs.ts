export const CREDIT_COSTS = {
    pdf_embedding_per_chunk: 1,
    citation_search: 5,
    ai_chat_message: 1,
    deep_research_query: 10,
    presentation_generation: 50,
    research_paper_generation: 50,
};

export function getCreditCost(operation: string): number {
    const costs: Record<string, number> = {
        ...CREDIT_COSTS,
        // Add aliases if needed
        'pdf_embedding_chunks': 1, // alias
    };
    return costs[operation] || 0;
}
