import { getServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { FastAPIChatRequest, FastAPIChatResponse } from "@/lib/pdf-chat/types";
import { CreditService } from "@/lib/credits/credit-service";
import { getUnifiedRAGService } from "@/lib/rag/unified-rag-service";

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

    const { sessionId, message } = await request.json();

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: "Session ID and message are required" },
        { status: 400 }
      );
    }

    // Get session and verify ownership (include both document and collection)
    const { data: session, error: sessionError } = await supabase
      .from("pdf_chat_sessions")
      .select("*, pdf_documents(*), pdf_collections(*)")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      console.error("❌ Session not found:", sessionError);
      return NextResponse.json(
        { error: "Session not found", details: sessionError?.message },
        { status: 404 }
      );
    }
    
    console.log("✅ Session found:", session.id);
    const sessAny: any = session;
    console.log("📄 Document metadata (full):", JSON.stringify(sessAny.pdf_documents?.metadata, null, 2));
    console.log("📁 Collection store:", sessAny.pdf_collections?.file_search_store_id);
    console.log("🔍 Session details:", {
      session_id: sessAny.id,
      document_id: sessAny.document_id,
      collection_id: sessAny.collection_id,
    });

    // Save user message
    console.log("💾 Saving user message...");
    const { data: userMessage, error: userMsgError } = await supabase
      .from("pdf_chat_messages")
      .insert({
        session_id: sessionId,
        role: "user",
        content: message,
      })
      .select()
      .single();

    if (userMsgError) {
      console.error("❌ Failed to save user message:", userMsgError);
      return NextResponse.json(
        { error: "Failed to save message", details: userMsgError.message },
        { status: 500 }
      );
    }
    
    console.log("✅ User message saved:", userMessage.id);

    // Credits: ensure user has enough credits for a chat message
    const hasCredits = await CreditService.hasEnoughCredits(user.id, "chat_message");
    if (!hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits for this operation." },
        { status: 402 }
      );
    }

    // Get unified RAG service
    const ragService = getUnifiedRAGService();
    const ragMode = ragService.getMode();
    
    console.log(`💬 Querying document using ${ragMode.toUpperCase()} mode`);

    try {
      // Get RAG document ID - prioritize collection store, then document metadata, then fallback
      let ragDocumentId: string;
      let collStore = sessAny?.pdf_collections?.file_search_store_id;

      // If join didn't populate, fetch the collection directly
      if (!collStore && sessAny?.collection_id) {
        const { data: coll, error: collErr } = await supabase
          .from("pdf_collections")
          .select("file_search_store_id")
          .eq("id", sessAny.collection_id)
          .single();
        if (!collErr) {
          collStore = coll?.file_search_store_id;
        } else {
          console.warn("⚠️ Could not load collection store from join or direct fetch", collErr);
        }
      }
      const docMeta = sessAny?.pdf_documents?.metadata;

      console.log("🔍 Determining RAG document ID:", {
        collStore,
        docMetaRagDocId: docMeta?.ragDocumentId,
        docMetaStoreName: docMeta?.storeName,
        fallbackDocId: sessAny?.document_id,
      });

      if (collStore) {
        // Debug: check collection documents readiness
        try {
          console.log("🔎 Debug: Collection chat context", {
            session_id: sessAny?.id,
            collection_id: sessAny?.collection_id,
            store: collStore,
          });
          if (sessAny?.collection_id) {
            const { data: collDocs, error: collDocsErr } = await supabase
              .from("pdf_documents")
              .select("id,status,original_filename,metadata")
              .eq("collection_id", sessAny.collection_id)
              .eq("user_id", user.id);
            if (collDocsErr) {
              console.warn("⚠️ Debug: Failed to load collection documents", collDocsErr);
            } else {
              const total = collDocs?.length || 0;
              const ready = collDocs?.filter(d => d.status === "ready").length || 0;
              const processing = collDocs?.filter(d => d.status === "processing").length || 0;
              const pending = collDocs?.filter(d => d.status === "pending").length || 0;
              const errorCount = collDocs?.filter(d => d.status === "error").length || 0;
              console.log("📊 Debug: Collection documents status", {
                total,
                ready,
                processing,
                pending,
                error: errorCount,
                sample: collDocs?.slice(0, 2),
              });
            }
          }
        } catch (dbgErr) {
          console.warn("⚠️ Debug: error while gathering collection debug info", dbgErr);
        }
        // Collection session - use File Search Store ID
        ragDocumentId = collStore;
        console.log(`📁 ✅ Using Collection File Search Store: ${ragDocumentId}`);
      } else if (docMeta?.ragDocumentId) {
        // Single document session - use document's RAG ID
        ragDocumentId = docMeta.ragDocumentId;
        console.log(`📄 ✅ Using Document RAG ID from metadata.ragDocumentId: ${ragDocumentId}`);
      } else if (sessAny?.document_id) {
        // Fallback to document_id
        ragDocumentId = sessAny.document_id;
        console.log(`📄 ⚠️ Using fallback document_id (no metadata): ${ragDocumentId}`);
      } else {
        console.warn("⚠️ Unable to determine ragDocumentId for session", sessionId);
        return NextResponse.json({ error: "Document not ready for chat yet" }, { status: 400 });
      }
      
      console.log(`💬 User query: ${message}`);
      
      // Query using unified RAG service (works with both modes!)
      const result = await ragService.chat(
        ragDocumentId,
        message,
        user.id
      );
      
      console.log(`✅ RAG response received:`, result);

      // Check if answer is grounded (for Gemini mode)
      const isGrounded = (result as any).grounded !== false;
      if (!isGrounded) {
        console.warn(`⚠️  UNGROUNDED ANSWER DETECTED! Gemini did not use File Search.`);
      }

      // Save assistant response
      const { data: assistantMessage, error: assistantMsgError } = await supabase
        .from("pdf_chat_messages")
        .insert({
          session_id: sessionId,
          role: "assistant",
          content: result.answer,
          sources: result.sources,
          confidence_score: result.confidence_score,
        })
        .select()
        .single();

      if (assistantMsgError) {
        return NextResponse.json(
          { error: "Failed to save assistant response" },
          { status: 500 }
        );
      }

      // Deduct credits after successful response
      await CreditService.deductCredits(
        user.id,
        "chat_message",
        `PDF Chat message in session ${sessionId}`
      );

      return NextResponse.json({
        messageId: assistantMessage.id,
        content: result.answer,
        grounded: isGrounded,
        warning: !isGrounded ? "This answer may not be based on your uploaded documents. Please verify the information." : undefined,
        sources: result.sources,
        confidence: result.confidence_score,
      });
    } catch (fastAPIError: any) {
      console.error("❌ RAG service error:", fastAPIError);
      console.error("❌ Error stack:", fastAPIError?.stack);

      // Determine error message based on error type
      const isOverloaded = fastAPIError?.message?.includes('overloaded') || 
                          fastAPIError?.message?.includes('503') ||
                          fastAPIError?.message?.includes('UNAVAILABLE');
      
      const errorMessage = isOverloaded
        ? "The AI service is currently experiencing high demand. I've tried multiple times but couldn't get a response. Please try again in a few moments."
        : "I'm sorry, I encountered an error processing your question. Please try again.";

      // Save error message
      await supabase
        .from("pdf_chat_messages")
        .insert({
          session_id: sessionId,
          role: "assistant",
          content: errorMessage,
        });

      return NextResponse.json(
        { 
          error: isOverloaded ? "Service temporarily overloaded" : "RAG service error",
          message: errorMessage
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
