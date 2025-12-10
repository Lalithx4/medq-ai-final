/**
 * Site-Wide LLM Fallback Service
 * Provides automatic fallback from Cerebras to Google Gemini on any error
 * Used across all research generation, chat, and AI features
 */

import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { GoogleGenAI } from "@google/genai";

export interface LLMResponse {
  content: string;
  provider: "cerebras" | "gemini";
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class LLMFallbackService {
  private cerebras: Cerebras;
  private gemini: GoogleGenAI;
  private cerebrasModel: string;
  private geminiModel: string;
  private useFallbackFirst: boolean = false; // For testing or when Cerebras is consistently down

  constructor(
    cerebrasApiKey: string,
    geminiApiKey: string,
    cerebrasModel: string = "llama-3.3-70b",
    geminiModel: string = "gemini-2.5-flash"
  ) {
    this.cerebras = new Cerebras({ apiKey: cerebrasApiKey });
    this.gemini = new GoogleGenAI({ apiKey: geminiApiKey });
    this.cerebrasModel = cerebrasModel;
    this.geminiModel = geminiModel;
  }

  /**
   * Enable fallback-first mode (use Gemini as primary)
   */
  setFallbackFirst(enabled: boolean) {
    this.useFallbackFirst = enabled;
    console.log(`🔄 Fallback mode: ${enabled ? "Gemini primary" : "Cerebras primary"}`);
  }

  /**
   * Generate text with automatic fallback
   */
  async generate(
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<LLMResponse> {
    const { temperature = 0.7, maxTokens = 4000, systemPrompt } = options;

    // If fallback-first mode, use Gemini directly
    if (this.useFallbackFirst) {
      console.log("🔄 Using Gemini (fallback-first mode)");
      return this.generateWithGemini(prompt, systemPrompt, temperature, maxTokens);
    }

    // Try Cerebras first
    try {
      console.log("🤖 Attempting generation with Cerebras...");
      const messages: any[] = [];
      
      if (systemPrompt) {
        messages.push({
          role: "system",
          content: systemPrompt,
        });
      }
      
      messages.push({
        role: "user",
        content: prompt,
      });

      const response = await this.cerebras.chat.completions.create({
        model: this.cerebrasModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      const content = (response.choices as any)?.[0]?.message?.content || "";
      console.log("✅ Cerebras generation successful");
      
      return {
        content,
        provider: "cerebras",
      };
    } catch (error: any) {
      // Fallback to Gemini on any error
      const errorType = error?.status === 503 ? "503 high traffic" : error?.message || "unknown";
      console.warn(`⚠️  Cerebras error (${errorType}), falling back to Gemini...`);
      return this.generateWithGemini(prompt, systemPrompt, temperature, maxTokens);
    }
  }

  /**
   * Chat completion with message history
   */
  async chat(
    messages: LLMMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<LLMResponse> {
    const { temperature = 0.7, maxTokens = 4000 } = options;

    // If fallback-first mode, use Gemini directly
    if (this.useFallbackFirst) {
      console.log("🔄 Using Gemini chat (fallback-first mode)");
      return this.chatWithGemini(messages, temperature, maxTokens);
    }

    // Try Cerebras first
    try {
      console.log("🤖 Attempting chat with Cerebras...");
      const response = await this.cerebras.chat.completions.create({
        model: this.cerebrasModel,
        messages: messages as any,
        temperature,
        max_tokens: maxTokens,
      });

      const content = (response.choices as any)?.[0]?.message?.content || "";
      console.log("✅ Cerebras chat successful");
      
      return {
        content,
        provider: "cerebras",
      };
    } catch (error: any) {
      // Fallback to Gemini on any error
      const errorType = error?.status === 503 ? "503 high traffic" : error?.message || "unknown";
      console.warn(`⚠️  Cerebras error (${errorType}), falling back to Gemini...`);
      return this.chatWithGemini(messages, temperature, maxTokens);
    }
  }

  /**
   * Generate with Google Gemini
   */
  private async generateWithGemini(
    prompt: string,
    systemPrompt?: string,
    temperature: number = 0.7,
    maxTokens: number = 4000
  ): Promise<LLMResponse> {
    try {
      // Combine system prompt and user prompt for Gemini
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;

      const response = await this.gemini.models.generateContent({
        model: this.geminiModel,
        contents: fullPrompt,
        config: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      });
      
      const content = response.text || "";
      console.log("✅ Gemini generation successful");
      
      return {
        content,
        provider: "gemini",
      };
    } catch (error: any) {
      console.error("❌ Gemini generation failed:", error.message);
      throw new Error(`Both Cerebras and Gemini failed. Last error: ${error.message}`);
    }
  }

  /**
   * Chat with Google Gemini
   */
  private async chatWithGemini(
    messages: LLMMessage[],
    temperature: number = 0.7,
    maxTokens: number = 4000
  ): Promise<LLMResponse> {
    try {
      // Convert messages to Gemini format
      // Gemini doesn't support system messages in the same way, so we prepend system content
      let fullPrompt = "";
      const systemMessages = messages.filter(m => m.role === "system");
      const chatMessages = messages.filter(m => m.role !== "system");

      if (systemMessages.length > 0) {
        fullPrompt = systemMessages.map(m => m.content).join("\n\n") + "\n\n";
      }

      // Add chat history
      fullPrompt += chatMessages.map(m => {
        const prefix = m.role === "user" ? "User: " : "Assistant: ";
        return `${prefix}${m.content}`;
      }).join("\n\n");

      const response = await this.gemini.models.generateContent({
        model: this.geminiModel,
        contents: fullPrompt,
        config: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      });
      
      const content = response.text || "";
      console.log("✅ Gemini chat successful");
      
      return {
        content,
        provider: "gemini",
      };
    } catch (error: any) {
      console.error("❌ Gemini chat failed:", error.message);
      throw new Error(`Both Cerebras and Gemini failed. Last error: ${error.message}`);
    }
  }

  /**
   * Create a LangChain-compatible wrapper
   */
  createLangChainWrapper() {
    return {
      invoke: async (input: any) => {
        const prompt = typeof input === "string" ? input : input.prompt || input.input || "";
        const systemPrompt = input.system || input.systemPrompt;
        
        const response = await this.generate(prompt, {
          systemPrompt,
          temperature: input.temperature,
          maxTokens: input.maxTokens || input.max_tokens,
        });
        
        return { content: response.content };
      },
    };
  }
}

/**
 * Create Cerebras streaming with Gemini fallback
 * For use in API routes that need streaming
 */
export async function createCerebrasStreamWithFallback(
  cerebrasApiKey: string,
  geminiApiKey: string,
  options: {
    model?: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }
) {
  const cerebras = new Cerebras({ apiKey: cerebrasApiKey });
  const gemini = new GoogleGenAI({ apiKey: geminiApiKey });
  
  try {
    // Try Cerebras streaming first
    const stream = await cerebras.chat.completions.create({
      model: options.model || "llama-3.3-70b",
      messages: options.messages as any,
      stream: true,
      max_completion_tokens: options.maxTokens || 8000,
      temperature: options.temperature || 0.7,
    });
    
    return { stream, provider: "cerebras" as const };
  } catch (error: any) {
    // Fallback to Gemini
    console.warn(`⚠️  Cerebras streaming error, falling back to Gemini...`);
    
    // Convert messages to Gemini format
    const systemMessages = options.messages.filter(m => m.role === "system");
    const chatMessages = options.messages.filter(m => m.role !== "system");
    
    let fullPrompt = "";
    if (systemMessages.length > 0) {
      fullPrompt = systemMessages.map(m => m.content).join("\n\n") + "\n\n";
    }
    fullPrompt += chatMessages.map(m => m.content).join("\n\n");
    
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
      config: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 8000,
      },
    });
    
    // Convert to async iterator for compatibility
    const stream = (async function* () {
      yield { text: () => response.text || "" };
    })();
    
    return { stream, provider: "gemini" as const };
  }
}

/**
 * Create a singleton instance
 */
let fallbackService: LLMFallbackService | null = null;

export function getLLMFallbackService(): LLMFallbackService {
  if (!fallbackService) {
    const cerebrasKey = process.env.CEREBRAS_API_KEY;
    const geminiKey = process.env.GOOGLE_AI_API_KEY;

    if (!cerebrasKey) {
      throw new Error("CEREBRAS_API_KEY is not set");
    }
    if (!geminiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not set");
    }

    fallbackService = new LLMFallbackService(cerebrasKey, geminiKey);
  }

  return fallbackService;
}
