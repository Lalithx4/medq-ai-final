import { getServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { FastAPIProcessRequest, FastAPIProcessResponse } from "@/lib/pdf-chat/types";
import { CreditService } from "@/lib/credits/credit-service";
import { CREDIT_COSTS } from "@/lib/credits/costs";
import { getUnifiedRAGService } from "@/lib/rag/unified-rag-service";
import { getGeminiFileSearchService } from "@/lib/rag/gemini-file-search";
import { readFile } from "fs/promises";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const FASTAPI_API_KEY = process.env.FASTAPI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get document with collection info
    const { data: document, error: docError } = await supabase
      .from("pdf_documents")
      .select("*, pdf_collections(*)")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update status to processing
    await supabase
      .from("pdf_documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    // Get unified RAG service (automatically detects mode from env)
    const ragService = getUnifiedRAGService();
    const ragMode = ragService.getMode();

    console.log(`📄 Processing document using ${ragMode.toUpperCase()} mode`);

    try {
      // Read file from disk
      console.log(`📂 Reading file from: ${document.file_url}`);
      const fileBuffer = await readFile(document.file_url);

      // If document belongs to a collection, upload to that collection's File Search Store
      let result;
      const collection = document.pdf_collections;

      if (collection) {
        const existingStore = collection.file_search_store_id as string | null;
        const isRealStore = !!existingStore && existingStore.startsWith("fileSearchStores/");

        console.log("📁 Document belongs to collection", {
          collection_id: collection.id,
          collection_name: collection.name,
          existingStore,
          isRealStore,
          documentFileName: document.original_filename || document.filename,
        });

        const geminiService = getGeminiFileSearchService();
        // For legacy human-readable values, pass undefined so the service creates a real store
        const requestedStore = isRealStore ? existingStore : undefined;

        const uploadResult = await geminiService.uploadDocument(
          fileBuffer,
          document.original_filename || document.filename,
          requestedStore
        );

        console.log("✅ Uploaded to collection store", {
          requestedStore,
          actualStore: uploadResult.storeName,
        });

        // If collection had a legacy label or mismatching value, migrate it to the real store name
        if (!isRealStore || existingStore !== uploadResult.storeName) {
          console.log("🔄 Updating collection store name to real resource", {
            old: existingStore,
            new: uploadResult.storeName,
          });
          await supabase
            .from("pdf_collections")
            .update({ file_search_store_id: uploadResult.storeName })
            .eq("id", collection.id);
        }

        result = {
          success: true,
          mode: 'gemini',
          documentId: uploadResult.storeName,
          metadata: {
            fileId: uploadResult.fileId,
            fileName: uploadResult.fileName,
            collectionId: document.collection_id
          },
        };
      } else {
        console.log(`📄 Single document, creating individual store`);
        console.log(`📄 Calling ragService.uploadDocument for user ${user.id}, file: ${document.original_filename || document.filename}`);
        // Upload to RAG system (creates individual store for single documents)
        result = await ragService.uploadDocument(
          fileBuffer,
          document.original_filename || document.filename,
          user.id,
          "application/pdf"
        );
        console.log(`📄 Single-doc upload result:`, {
          success: result.success,
          mode: result.mode,
          documentId: result.documentId,
          metadata: result.metadata,
        });
      }

      if (result.success) {
        // Store RAG-specific metadata
        const ragMetadata = {
          ragMode: result.mode,
          ragDocumentId: result.documentId, // Store name or fileUri for later retrieval
          ...result.metadata,
        };
        console.log(`💾 Persisting metadata to pdf_documents for doc ${documentId}:`, ragMetadata);

        // Update document status to ready
        const { error: updateError } = await supabase
          .from("pdf_documents")
          .update({
            status: "ready",
            page_count: ragMetadata.numChunks || 0,
            metadata: ragMetadata,
          })
          .eq("id", documentId);

        if (updateError) {
          console.error("❌ Failed to update document status:", updateError);
          throw new Error(`Failed to update document status: ${updateError.message}`);
        }

        console.log(`✅ Document ${documentId} status updated to READY with metadata:`, ragMetadata);

        // Credits: deduct based on number of chunks (if available)
        const numChunks = ragMetadata.numChunks || 0;
        const perChunk = CREDIT_COSTS.pdf_embedding_per_chunk || 0;
        const embeddingCost = Math.max(0, numChunks * perChunk);

        if (embeddingCost > 0) {
          const hasCredits = await CreditService.hasEnoughCreditsForAmount(user.id, embeddingCost);
          if (!hasCredits) {
            return NextResponse.json(
              {
                success: true,
                documentId,
                status: "ready",
                message: `Document processed successfully using ${result.mode} mode`,
                warning: `Insufficient credits to cover embedding cost of ${embeddingCost}. Please top up.`,
              },
              { status: 402 }
            );
          }

          await CreditService.deductAmount(
            user.id,
            embeddingCost,
            `PDF processing (${result.mode} mode) for document ${documentId}`,
            "pdf_embedding_chunks"
          );
        }

        console.log(`✅ Document processed successfully using ${result.mode} mode`);

        return NextResponse.json({
          success: true,
          documentId,
          status: "ready",
          mode: result.mode,
          message: `Document processed successfully using ${result.mode} mode`,
        });
      } else {
        // Update document status to error
        await supabase
          .from("pdf_documents")
          .update({
            status: "error",
            error_message: result.error || "Processing failed",
          })
          .eq("id", documentId);

        return NextResponse.json({
          success: false,
          documentId,
          status: "error",
          error: result.error,
        });
      }
    } catch (processingError: any) {
      console.error("❌ Document processing error:", processingError);
      console.error("Error details:", processingError.message, processingError.stack);

      const errorMessage = processingError.message || "Failed to process document";

      // Update document status to error
      await supabase
        .from("pdf_documents")
        .update({
          status: "error",
          error_message: errorMessage,
        })
        .eq("id", documentId);

      return NextResponse.json({
        success: false,
        documentId,
        status: "error",
        error: errorMessage,
      });
    }
  } catch (error) {
    console.error("Process error:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}
