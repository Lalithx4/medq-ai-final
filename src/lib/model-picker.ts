import { createOpenAI } from "@ai-sdk/openai";
import { type LanguageModelV1 } from "ai";
import { createOllama } from "ollama-ai-provider";
import { env } from "@/env";

/**
 * Centralized model picker function for all presentation generation routes
 * Supports OpenAI, Ollama, LM Studio, and Cerebras models
 */
export function modelPicker(
  modelProvider: string,
  modelId?: string,
): LanguageModelV1 {
  if (modelProvider === "ollama" && modelId) {
    // Use Ollama AI provider
    const ollama = createOllama();
    return ollama(modelId) as unknown as LanguageModelV1;
  }

  if (modelProvider === "lmstudio" && modelId) {
    // Use LM Studio with OpenAI compatible provider
    const lmstudio = createOpenAI({
      name: "lmstudio",
      baseURL: "http://localhost:1234/v1",
      apiKey: "lmstudio",
    });
    return lmstudio(modelId) as unknown as LanguageModelV1;
  }

  if (modelProvider === "cerebras" && modelId) {
    // Use Cerebras with OpenAI compatible provider
    const cerebras = createOpenAI({
      name: "cerebras",
      baseURL: "https://api.cerebras.ai/v1",
      apiKey: env.CEREBRAS_API_KEY || "",
    });
    return cerebras(modelId) as unknown as LanguageModelV1;
  }

  // Default to OpenAI
  const openai = createOpenAI();
  return openai("gpt-4o-mini") as unknown as LanguageModelV1;
}
