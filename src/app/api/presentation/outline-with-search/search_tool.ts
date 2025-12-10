import { env } from "@/env";
import { tavily } from "@tavily/core";
import { type Tool } from "ai";
import z from "zod";

// Only initialize Tavily if API key is available
const tavilyService = env.TAVILY_API_KEY ? tavily({ apiKey: env.TAVILY_API_KEY }) : null;

export const search_tool: Tool = {
  description:
    "A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events like news, weather, stock price etc. Input should be a search query.",
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }: { query: string }) => {
    if (!tavilyService) {
      console.warn("Tavily API key not configured, skipping search");
      return JSON.stringify({ results: [], message: "Search not available - API key not configured" });
    }
    
    try {
      const response = await tavilyService.search(query, { max_results: 5 });
      return JSON.stringify(response);
    } catch (error) {
      console.error("Search error:", error);
      return "Search failed";
    }
  },
};
