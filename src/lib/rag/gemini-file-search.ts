/**
 * Gemini File Search API Integration
 * Uses official File Search Stores API for document RAG
 * Reference: https://ai.google.dev/gemini-api/docs/file-search
 */

import { GoogleGenAI } from "@google/genai";
import { env } from "@/env";

export interface GeminiFileMetadata {
  fileId: string;
  fileName: string;
  storeName: string;
  displayName: string;
  uploadedAt: string;
}

export interface GeminiSearchResult {
  answer: string;
  citations: Array<{
    text: string;
    source: string;
  }>;
  storeName: string;
  grounded?: boolean; // Whether Gemini used File Search (grounding detection)
}

export class GeminiFileSearchService {
  private client: GoogleGenAI;
  private model: string;
  private defaultStoreName: string | null = null;

  constructor(apiKey?: string, model: string = "gemini-2.5-flash") {
    this.client = new GoogleGenAI({ 
      apiKey: apiKey || env.GOOGLE_AI_API_KEY 
    });
    this.model = model;
  }

  /**
   * Get or create default File Search Store
   */
  async getOrCreateStore(storeName?: string): Promise<string> {
    // CASE 1: A specific existing store resource is provided (e.g. a collection store)
    // and already looks like a real File Search Store resource name.
    if (storeName && storeName.startsWith("fileSearchStores/")) {
      return storeName;
    }

    // CASE 2: A label is provided (e.g. per-document or per-collection store request).
    // In this case we ALWAYS create a new store with that displayName and do NOT
    // reuse the default store. This prevents unrelated documents from mixing.
    if (storeName) {
      try {
        console.log(`🏗️  Creating NEW File Search Store with label: ${storeName}`);
        const store = await this.client.fileSearchStores.create({
          config: {
            displayName: storeName,
          },
        });

        console.log(`✅ Created dedicated File Search Store:`, {
          name: store.name,
          displayName: store.displayName,
          label: storeName,
          createTime: store.createTime,
        });
        return store.name || "";
      } catch (error) {
        console.error("❌ Failed to create dedicated store:", error);
        throw error;
      }
    }

    // CASE 3: No name provided – lazily create or reuse a single default store.
    if (this.defaultStoreName) {
      return this.defaultStoreName;
    }

    try {
      const store = await this.client.fileSearchStores.create({
        config: {
          displayName: "medical-documents-store",
        },
      });

      this.defaultStoreName = store.name || null;
      console.log(`✅ Created File Search Store: ${store.name}`);
      return store.name || "";
    } catch (error) {
      console.error("❌ Failed to create store:", error);
      throw error;
    }
  }

  /**
   * Upload a document to File Search Store
   * Official API: https://ai.google.dev/gemini-api/docs/file-search
   */
  async uploadDocument(
    fileBuffer: Buffer,
    fileName: string,
    storeName?: string
  ): Promise<GeminiFileMetadata> {
    console.log(`📤 uploadDocument called:`, {
      fileName,
      fileSize: fileBuffer.length,
      requestedStoreName: storeName,
    });
    const actualStoreName = await this.getOrCreateStore(storeName);
    console.log(`🎯 Target store resolved to: ${actualStoreName}`);
    console.log(`🔑 IMPORTANT: This file will be uploaded to store: ${actualStoreName}`);
    console.log(`🔑 File name: ${fileName}`);
    console.log(`🔑 File size: ${fileBuffer.length} bytes`);

    console.log(`📤 Uploading ${fileName} to Gemini File Search Store...`);

    // Convert Buffer to Blob for API compatibility
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });

    let lastErr: any = null;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`📡 Upload attempt ${attempt}/${maxAttempts} to store ${actualStoreName}`);
        console.log(`🚀 Uploading file to Gemini (attempt ${attempt}/${maxAttempts}):`, {
          fileName,
          storeName: actualStoreName,
          fileSize: fileBuffer.length,
        });
        let operation = await this.client.fileSearchStores.uploadToFileSearchStore({
          file: blob,
          fileSearchStoreName: actualStoreName,
          config: {
            displayName: fileName,
            mimeType: 'application/pdf',
          }
        });
        console.log(`✅ Upload initiated, operation name: ${operation.name}`);

        // Wait for import to complete
        while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          operation = await this.client.operations.get({ operation });
        }

        // The SDK returns the file info in operation.response, not operation.result or operation.file
        const response = (operation as any).response;
        const documentName = response?.documentName;
        
        console.log(`✅ Document uploaded successfully:`, {
          operationName: operation.name,
          documentName: documentName,
          parent: response?.parent,
          storeName: actualStoreName,
          operationDone: operation.done,
        });
        
        // CRITICAL: Verify the file is actually in the store
        if (!documentName) {
          console.error(`❌❌❌ CRITICAL: File upload completed but no documentName returned!`);
          console.error(`❌ Operation:`, operation);
          console.error(`❌ Response:`, response);
          throw new Error('File upload failed: No documentName in operation response');
        }
        
        console.log(`✅✅✅ File confirmed uploaded to store ${actualStoreName}`);
        console.log(`📎 Document Name (URI): ${documentName}`);
        console.log(`📎 Parent Store: ${response?.parent}`);
        
        return {
          fileId: documentName, // Use the actual document name as the file ID
          fileName: fileName,
          storeName: actualStoreName,
          displayName: fileName,
          uploadedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err);
        const isOverloaded = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('temporarily');
        console.warn(`⚠️ Upload failed (attempt ${attempt}): ${msg}`);
        if (attempt < maxAttempts && isOverloaded) {
          const wait = Math.pow(2, attempt) * 1000; // 2s, 4s
          console.log(`⏳ Retrying upload in ${wait/1000}s...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        break;
      }
    }
    console.error("❌ Gemini file upload failed after retries:", lastErr);
    throw new Error(`Failed to upload file to Gemini: ${lastErr}`);
  }

  /**
   * Delete a File Search Store (cleanup utility)
   */
  async deleteStore(storeName: string): Promise<boolean> {
    try {
      console.log(`🗑️  Deleting File Search Store: ${storeName}`);
      await this.client.fileSearchStores.delete({
        name: storeName,
      });
      console.log(`✅ Store deleted successfully: ${storeName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete store ${storeName}:`, error);
      return false;
    }
  }

  /**
   * List all File Search Stores (for cleanup/debugging)
   */
  async listAllStores(): Promise<any[]> {
    try {
      console.log(`📋 Listing all File Search Stores...`);
      const response = await this.client.fileSearchStores.list({});
      const stores = (response as any).fileSearchStores || [];
      console.log(`📋 Found ${stores.length} store(s):`, stores.map((s: any) => ({
        name: s.name,
        displayName: s.displayName,
        createTime: s.createTime,
      })));
      return stores;
    } catch (error) {
      console.error(`❌ Failed to list stores:`, error);
      return [];
    }
  }

  /**
   * List files in a File Search Store for verification
   */
  async listFilesInStore(storeName: string): Promise<any[]> {
    try {
      console.log(`📋 Listing files in store: ${storeName}`);
      // Use the correct API method to get store details
      const storeDetails = await this.client.fileSearchStores.get({
        name: storeName,
      });
      console.log(`📋 Store details:`, {
        name: (storeDetails as any).name,
        displayName: (storeDetails as any).displayName,
        createTime: (storeDetails as any).createTime,
      });
      // Note: The SDK may not provide a direct way to list files in a store
      // This is a limitation we'll document in logs
      console.log(`ℹ️  Note: Gemini SDK doesn't provide file listing API. Store verified to exist.`);
      return [];
    } catch (error) {
      console.error(`❌ Failed to get store details for ${storeName}:`, error);
      return [];
    }
  }

  /**
   * Query File Search Store with automatic retrieval
   * Official API: Uses File Search tool for automatic RAG
   */
  async queryStore(
    storeName: string,
    query: string,
    retries = 3
  ): Promise<GeminiSearchResult> {
    let lastError: any;
    
    // First, verify what files are in the store
    await this.listFilesInStore(storeName);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔍 Querying File Search Store (attempt ${attempt}/${retries}): "${query}" in store: ${storeName}`);

        // Use File Search tool - SDK expects contents as string and tools in config
        const params: any = {
          model: this.model,
          contents: query,  // SDK expects a string, not an array!
          config: {
            tools: [
              {
                fileSearch: {
                  fileSearchStoreNames: [storeName],
                },
              },
            ],
            temperature: 0.3,
          },
        };

        console.log(`📤 Sending request to Gemini with params:`, JSON.stringify({
          model: params.model,
          contents: typeof params.contents === 'string' ? `"${params.contents.substring(0, 50)}..."` : params.contents,
          hasConfig: !!params.config,
          hasTools: !!params.config?.tools,
          toolsLength: params.config?.tools?.length,
          fileSearchStoreNames: params.config?.tools?.[0]?.fileSearch?.fileSearchStoreNames,
          temperature: params.config?.temperature,
        }, null, 2));

        const response: any = await this.client.models.generateContent(params as any);

        // DEBUG: Log full response structure
        console.log(`🔍 Full Gemini response structure:`, JSON.stringify({
          hasText: !!response?.text,
          hasCandidates: !!response?.candidates,
          candidatesLength: response?.candidates?.length,
          firstCandidate: response?.candidates?.[0] ? {
            hasContent: !!response.candidates[0].content,
            hasGroundingMetadata: !!response.candidates[0].groundingMetadata,
            finishReason: response.candidates[0].finishReason,
          } : null,
        }, null, 2));

        // Resilient answer extraction across SDK versions
        const answer =
          response?.text ??
          response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(" ") ??
          "";

        // Check if File Search tool was actually used (grounding detection)
        const groundingMetadata = response?.candidates?.[0]?.groundingMetadata;
        const usedFileSearch = groundingMetadata?.searchEntryPoint || groundingMetadata?.groundingChunks;
        
        if (!usedFileSearch) {
          console.warn(`⚠️  WARNING: Gemini may not have used File Search for this query!`);
          console.warn(`⚠️  Answer might not be grounded in the uploaded documents.`);
          console.warn(`⚠️  Consider this answer as potentially unreliable.`);
        } else {
          console.log(`✅ Answer generated with File Search (grounded)`);
          console.log(`📚 Grounding metadata:`, {
            hasSearchEntry: !!groundingMetadata?.searchEntryPoint,
            chunkCount: groundingMetadata?.groundingChunks?.length || 0,
          });
        }

        // Extract citations if available
        const citations: Array<{ text: string; source: string }> = [];
        if (groundingMetadata?.groundingChunks) {
          groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web || chunk.retrievedContext) {
              citations.push({
                text: chunk.retrievedContext?.text || chunk.web?.title || 'N/A',
                source: chunk.retrievedContext?.uri || chunk.web?.uri || 'N/A',
              });
            }
          });
        }

        return {
          answer,
          citations,
          storeName,
          grounded: !!usedFileSearch,
        };
      } catch (error: any) {
        lastError = error;
        const isOverloaded = error?.message?.includes('503') || 
                           error?.message?.includes('overloaded') ||
                           error?.message?.includes('UNAVAILABLE');
        
        if (isOverloaded && attempt < retries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`⏳ Model overloaded, retrying in ${waitTime/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        console.error("❌ Gemini File Search failed:", error);
        break;
      }
    }
    
    throw new Error(`Failed to query store after ${retries} attempts: ${lastError}`);
  }

  /**
   * List all File Search Stores
   */
  async listStores(): Promise<any[]> {
    try {
      const stores = await this.client.fileSearchStores.list();
      // Convert Pager to array
      const storeArray: any[] = [];
      for await (const store of stores) {
        storeArray.push(store);
      }
      return storeArray;
    } catch (error) {
      console.error("❌ Failed to list stores:", error);
      throw error;
    }
  }

}

/**
 * Get singleton instance of Gemini File Search service
 */
let geminiFileSearchInstance: GeminiFileSearchService | null = null;

export function getGeminiFileSearchService(): GeminiFileSearchService {
  if (!geminiFileSearchInstance) {
    geminiFileSearchInstance = new GeminiFileSearchService();
  }
  return geminiFileSearchInstance;
}
