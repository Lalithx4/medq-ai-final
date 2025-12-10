/**
 * Unified RAG Service
 * Toggleable between self-hosted RAG and Gemini File Search
 * Controlled by RAG_MODE environment variable
 */

import { env } from "@/env";
import { getGeminiFileSearchService, GeminiFileMetadata, GeminiSearchResult } from "./gemini-file-search";
import { getLLMFallbackService } from "@/lib/llm/llm-fallback";

export type RAGMode = "self-hosted" | "gemini";

export interface DocumentUploadResult {
  success: boolean;
  documentId: string;
  fileName: string;
  mode: RAGMode;
  metadata?: any;
  error?: string;
}

export interface DocumentSearchResult {
  context: string;
  chunks: Array<{
    text: string;
    score?: number;
    metadata?: any;
  }>;
  mode: RAGMode;
}

export interface ChatResponse {
  answer: string;
  context: string;
  mode: RAGMode;
  provider: string; // "cerebras" or "gemini"
  sources?: Array<{
    page_number: number;
    similarity: number;
    text_excerpt: string;
    chunk_id?: string;
  }>;
  confidence_score?: number;
}

export class UnifiedRAGService {
  private mode: RAGMode;
  private geminiService: ReturnType<typeof getGeminiFileSearchService> | null = null;
  private llmService: ReturnType<typeof getLLMFallbackService>;

  constructor() {
    // Read mode from environment variable
    const modeEnv = process.env.RAG_MODE?.toLowerCase() || "self-hosted";
    this.mode = modeEnv === "gemini" ? "gemini" : "self-hosted";
    
    console.log(`🎯 RAG Mode: ${this.mode.toUpperCase()}`);

    // Initialize services based on mode
    if (this.mode === "gemini") {
      this.geminiService = getGeminiFileSearchService();
    }
    
    this.llmService = getLLMFallbackService();
  }

  /**
   * Get current RAG mode
   */
  getMode(): RAGMode {
    return this.mode;
  }

  /**
   * Upload document (routes to appropriate service)
   */
  async uploadDocument(
    fileBuffer: Buffer,
    fileName: string,
    userId: string,
    mimeType: string = "application/pdf"
  ): Promise<DocumentUploadResult> {
    try {
      if (this.mode === "gemini") {
        return await this.uploadToGemini(fileBuffer, fileName, userId, mimeType);
      } else {
        return await this.uploadToSelfHosted(fileBuffer, fileName, userId);
      }
    } catch (error) {
      console.error("❌ Document upload failed:", error);
      return {
        success: false,
        documentId: "",
        fileName,
        mode: this.mode,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Search and answer query (routes to appropriate service)
   */
  async chat(
    documentId: string,
    query: string,
    userId: string
  ): Promise<ChatResponse> {
    try {
      if (this.mode === "gemini") {
        return await this.chatWithGemini(documentId, query);
      } else {
        return await this.chatWithSelfHosted(documentId, query, userId);
      }
    } catch (error) {
      console.error("❌ Chat failed:", error);
      throw error;
    }
  }

  // ============================================
  // GEMINI MODE IMPLEMENTATION
  // ============================================

  private async uploadToGemini(
    fileBuffer: Buffer,
    fileName: string,
    userId: string,
    mimeType: string
  ): Promise<DocumentUploadResult> {
    if (!this.geminiService) {
      throw new Error("Gemini service not initialized");
    }

    console.log(`📤 [GEMINI] Uploading ${fileName} for user ${userId}...`);

    // For single-document flows we create a dedicated File Search Store per document,
    // so different PDFs do not share the same retrieval context.
    // Use crypto.randomUUID() to ensure absolute uniqueness
    const uniqueId = crypto.randomUUID();
    const storeLabel = `doc-${uniqueId}-${Date.now()}`;

    const metadata = await this.geminiService.uploadDocument(
      fileBuffer,
      fileName,
      storeLabel
    );

    // Store metadata in Supabase for tracking
    // (Optional: you can still use Supabase to track documents)
    
    return {
      success: true,
      documentId: metadata.storeName, // Use store name as document ID
      fileName: metadata.fileName,
      mode: "gemini",
      metadata: {
        storeName: metadata.storeName,
        displayName: metadata.displayName,
        uploadedAt: metadata.uploadedAt,
      },
    };
  }

  private async chatWithGemini(
    storeName: string,
    query: string
  ): Promise<ChatResponse> {
    if (!this.geminiService) {
      throw new Error("Gemini service not initialized");
    }

    console.log(`💬 [GEMINI] Querying File Search Store...`);

    // Augment the user query to explicitly instruct Gemini to use the attached documents
    const augmentedQuery = `You have access to one or more PDF documents via a File Search Store.
Your job is to answer STRICTLY based on the contents of those documents.

If the question asks for a summary, you MUST read and summarise the documents.
If you cannot find anything relevant in the documents, say so explicitly, but only after checking them.

User question:\n${query}`;

    // Query the File Search Store (Gemini handles retrieval automatically)
    const searchResult = await this.geminiService.queryStore(storeName, augmentedQuery);

    console.log(`✅ [GEMINI] Answer generated with automatic retrieval`);

    return {
      answer: searchResult.answer,
      context: searchResult.answer, // Gemini includes context in answer
      mode: "gemini",
      provider: "gemini-file-search",
      sources: [], // Gemini doesn't provide explicit sources
      confidence_score: 0.9, // Default confidence for Gemini
    };
  }

  // ============================================
  // SELF-HOSTED MODE IMPLEMENTATION
  // ============================================

  private async uploadToSelfHosted(
    fileBuffer: Buffer,
    fileName: string,
    userId: string
  ): Promise<DocumentUploadResult> {
    console.log(`📤 [SELF-HOSTED] Uploading ${fileName}...`);

    // Call existing Railway backend
    const backendUrl = process.env.RAG_BACKEND_URL || "http://localhost:8080";
    
    // Save file temporarily
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");
    
    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, `upload-${Date.now()}-${fileName}`);
    
    await fs.writeFile(tempPath, fileBuffer);

    try {
      // Call Railway backend API
      const response = await fetch(`${backendUrl}/api/pdf-chat/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_path: tempPath,
          filename: fileName,
          user_id: userId,
          document_id: `doc-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const result = await response.json();

      // Cleanup temp file
      await fs.unlink(tempPath).catch(() => {});

      return {
        success: true,
        documentId: result.document_id,
        fileName: result.filename,
        mode: "self-hosted",
        metadata: {
          numChunks: result.num_chunks,
          numEntities: result.num_entities,
          processingTime: result.processing_time,
        },
      };
    } catch (error) {
      // Cleanup temp file on error
      await fs.unlink(tempPath).catch(() => {});
      throw error;
    }
  }

  private async chatWithSelfHosted(
    documentId: string,
    query: string,
    userId: string
  ): Promise<ChatResponse> {
    console.log(`💬 [SELF-HOSTED] Querying document...`);

    const backendUrl = process.env.RAG_BACKEND_URL || "http://localhost:8080";

    const response = await fetch(`${backendUrl}/api/pdf-chat/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document_id: documentId,
        query: query,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const result = await response.json();

    return {
      answer: result.answer,
      context: result.context || "",
      mode: "self-hosted",
      provider: "self-hosted-rag",
      sources: result.sources || [],
      confidence_score: result.confidence_score || 0.8,
    };
  }
}

/**
 * Get singleton instance
 */
let unifiedRAGInstance: UnifiedRAGService | null = null;

export function getUnifiedRAGService(): UnifiedRAGService {
  if (!unifiedRAGInstance) {
    unifiedRAGInstance = new UnifiedRAGService();
  }
  return unifiedRAGInstance;
}
