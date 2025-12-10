import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getPdfIntelligenceService } from "@/lib/pdf-intelligence/pdf-intelligence-service";
import { CreditService } from "@/lib/credits/credit-service";

/**
 * POST /api/pdf-chat/analysis
 *
 * Body: { sessionId: string }
 *
 * Returns structured tables + markdown summary for the PDFs in the session.
 * This does NOT create chat messages; it is read-only analysis.
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
        { error: "Document not ready for analysis yet" },
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
    const analysis = await pdfIntel.analyzeDocument({
      ragDocumentId,
      userId: user.id,
    });

    await CreditService.deductCredits(
      user.id,
      "chat_message",
      `PDF data analysis in session ${sessionId}`,
    );

    return NextResponse.json({
      summaryMarkdown: analysis.summaryMarkdown,
      tables: analysis.tables,
    });
  } catch (error) {
    console.error("[PDF Analysis] Error", error);
    return NextResponse.json(
      { error: "Failed to run analysis" },
      { status: 500 },
    );
  }
}
