import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getPdfIntelligenceService } from "@/lib/pdf-intelligence/pdf-intelligence-service";
import { CreditService } from "@/lib/credits/credit-service";

/**
 * POST /api/pdf-chat/refine
 *
 * Body: { 
 *   sessionId: string,
 *   currentContent: string,
 *   userInstruction: string,
 *   contentType: 'analysis' | 'article'
 * }
 *
 * Refines existing analysis or article content based on user feedback.
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

    const { sessionId, currentContent, userInstruction, contentType } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    if (!currentContent) {
      return NextResponse.json(
        { error: "Current content is required" },
        { status: 400 },
      );
    }

    if (!userInstruction) {
      return NextResponse.json(
        { error: "User instruction is required" },
        { status: 400 },
      );
    }

    if (!contentType || !['analysis', 'article'].includes(contentType)) {
      return NextResponse.json(
        { error: "Content type must be 'analysis' or 'article'" },
        { status: 400 },
      );
    }

    // Verify session and load document / collection metadata
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
        { error: "Document not ready for refinement yet" },
        { status: 400 },
      );
    }

    const hasCredits = await CreditService.hasEnoughCredits(user.id, "chat_message");
    if (!hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits for this operation." },
        { status: 402 },
      );
    }

    const pdfIntel = getPdfIntelligenceService();
    const refined = await pdfIntel.refineContent({
      ragDocumentId,
      userId: user.id,
      currentContent,
      userInstruction,
      contentType,
    });

    await CreditService.deductCredits(
      user.id,
      "chat_message",
      `PDF ${contentType} refinement in session ${sessionId}`,
    );

    return NextResponse.json({
      content: refined.content,
      mode: refined.mode,
      provider: refined.provider,
    });
  } catch (error) {
    console.error("[PDF Refine] Error", error);
    return NextResponse.json(
      { error: "Failed to refine content" },
      { status: 500 },
    );
  }
}
