import { getServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Get all sessions for a document
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");
    const collectionId = searchParams.get("collectionId");

    if (!documentId && !collectionId) {
      return NextResponse.json(
        { error: "Document ID or Collection ID is required" },
        { status: 400 }
      );
    }

    // Get all sessions for the document or collection
    let query = supabase
      .from("pdf_chat_sessions")
      .select("*")
      .eq("user_id", user.id);

    if (documentId) {
      query = query.eq("document_id", documentId);
    } else if (collectionId) {
      query = query.eq("collection_id", collectionId);
    }

    const { data: sessions, error: sessionsError } = await query.order("created_at", { ascending: false });

    if (sessionsError) {
      console.error("❌ Failed to fetch sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to fetch sessions", details: sessionsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST - Create a new session
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

    const { documentId, collectionId, title } = await request.json();

    if (!documentId && !collectionId) {
      return NextResponse.json(
        { error: "Document ID or Collection ID is required" },
        { status: 400 }
      );
    }

    // Verify document or collection exists and belongs to user
    if (documentId) {
      const { data: document, error: docError } = await supabase
        .from("pdf_documents")
        .select("id")
        .eq("id", documentId)
        .eq("user_id", user.id)
        .single();

      if (docError || !document) {
        console.error("❌ Document not found:", docError);
        return NextResponse.json(
          { error: "Document not found", details: docError?.message },
          { status: 404 }
        );
      }
    } else if (collectionId) {
      const { data: collection, error: collError } = await supabase
        .from("pdf_collections")
        .select("id")
        .eq("id", collectionId)
        .eq("user_id", user.id)
        .single();

      if (collError || !collection) {
        console.error("❌ Collection not found:", collError);
        return NextResponse.json(
          { error: "Collection not found", details: collError?.message },
          { status: 404 }
        );
      }
    }

    // Create new session
    const { data: session, error: sessionError } = await supabase
      .from("pdf_chat_sessions")
      .insert({
        document_id: documentId || null,
        collection_id: collectionId || null,
        user_id: user.id,
        title: title || "New Chat",
      })
      .select()
      .single();

    if (sessionError) {
      console.error("❌ Failed to create session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session", details: sessionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session_id: session.id,
      title: session.title,
    });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
