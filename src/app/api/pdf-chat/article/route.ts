import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getPdfIntelligenceService } from "@/lib/pdf-intelligence/pdf-intelligence-service";
import { CreditService } from "@/lib/credits/credit-service";

/**
 * POST /api/pdf-chat/article
 *
 * Body: { sessionId: string }
 *
 * Generates an IMRaD-style research article in markdown grounded in the PDFs
 * associated with the PDF chat session.
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

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

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
        { error: "Document not ready for article generation yet" },
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
    const article = await pdfIntel.generateResearchArticle({
      ragDocumentId,
      userId: user.id,
    });

    await CreditService.deductCredits(
      user.id,
      "chat_message",
      `PDF research article generation in session ${sessionId}`,
    );

    return NextResponse.json({
      content: article.content,
      mode: article.mode,
      provider: article.provider,
    });
  } catch (error) {
    console.error("[PDF Article] Error", error);
    return NextResponse.json(
      { error: "Failed to generate article" },
      { status: 500 },
    );
  }
}
