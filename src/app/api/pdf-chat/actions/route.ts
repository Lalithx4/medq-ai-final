import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { CreditService } from "@/lib/credits/credit-service";
import { getPdfIntelligenceService } from "@/lib/pdf-intelligence/pdf-intelligence-service";

/**
 * POST /api/pdf-chat/actions
 *
 * Body: {
 *   action: "pdf_summary" | "slides";
 *   sessionId: string;
 * }
 *
 * This route is additive and does not modify existing chat behaviour.
 * It reuses the same session + RAG resolution logic as /api/pdf-chat/chat
 * but calls PdfIntelligenceService to generate higher-level artifacts
 * (summary markdown or slide outline markdown).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, sessionId } = await request.json();

    if (!action || !sessionId) {
      return NextResponse.json(
        { error: "Action and sessionId are required" },
        { status: 400 },
      );
    }

    if (!["pdf_summary", "pdf_summary_docx", "slides"].includes(action)) {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    // Load session with document / collection info (same pattern as /api/pdf-chat/chat)
    const { data: session, error: sessionError } = await supabase
      .from("pdf_chat_sessions")
      .select("*, pdf_documents(*), pdf_collections(*)")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found", details: sessionError?.message },
        { status: 404 },
      );
    }

    const sessAny: any = session;
    let ragDocumentId: string;
    let collStore = sessAny?.pdf_collections?.file_search_store_id as string | null;
    const docMeta = sessAny?.pdf_documents?.metadata as any | null;

    // If join didn't populate collection store, try fetching collection directly
    if (!collStore && sessAny?.collection_id) {
      const { data: coll } = await supabase
        .from("pdf_collections")
        .select("file_search_store_id")
        .eq("id", sessAny.collection_id)
        .single();
      collStore = coll?.file_search_store_id || null;
    }

    if (collStore) {
      ragDocumentId = collStore;
    } else if (docMeta?.ragDocumentId) {
      ragDocumentId = docMeta.ragDocumentId;
    } else if (sessAny?.document_id) {
      ragDocumentId = sessAny.document_id;
    } else {
      return NextResponse.json(
        { error: "Document not ready for actions yet" },
        { status: 400 },
      );
    }

    // Credits: reuse chat_message cost so we don't introduce new pricing yet
    const hasCredits = await CreditService.hasEnoughCredits(user.id, "chat_message");
    if (!hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits for this operation." },
        { status: 402 },
      );
    }

    const pdfIntel = getPdfIntelligenceService();
    let content: string;

    if (action === "pdf_summary" || action === "pdf_summary_docx") {
      const result = await pdfIntel.generatePdfSummary({
        ragDocumentId,
        userId: user.id,
      });
      content = result.content;
    } else {
      const result = await pdfIntel.generateSlideOutline({
        ragDocumentId,
        userId: user.id,
      });
      content = result.content;
    }

    // Save as assistant message in this session so history remains consistent
    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from("pdf_chat_messages")
      .insert({
        session_id: sessionId,
        role: "assistant",
        content,
      })
      .select()
      .single();

    if (assistantMsgError) {
      return NextResponse.json(
        { error: "Failed to save generated content" },
        { status: 500 },
      );
    }

    // Deduct credits after successful generation
    await CreditService.deductCredits(
      user.id,
      "chat_message",
      `PDF Intelligence action (${action}) in session ${sessionId}`,
    );

    const format = action === "slides" ? "pptx" : action === "pdf_summary_docx" ? "docx" : "pdf";
    const downloadUrl = `/api/pdf-chat/download?sessionId=${encodeURIComponent(
      sessionId,
    )}&messageId=${encodeURIComponent(assistantMessage.id)}&format=${format}`;

    return NextResponse.json({
      messageId: assistantMessage.id,
      content,
      action,
      downloadUrl,
    });
  } catch (error) {
    console.error("PDF actions error:", error);
    return NextResponse.json(
      { error: "Failed to perform PDF action" },
      { status: 500 },
    );
  }
}
