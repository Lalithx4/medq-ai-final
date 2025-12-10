import { getServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: documentId } = await params;

    // Get document
    const { data: document, error: docError } = await supabase
      .from("pdf_documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    console.log(`📄 Document ${documentId} status: ${document.status}, file_url: ${document.file_url}`);

    // Transform to camelCase for frontend
    const transformed = {
      id: document.id,
      userId: document.user_id,
      collectionId: document.collection_id,
      filename: document.filename,
      originalName: document.original_filename,
      fileUrl: document.file_url,
      fileSize: document.file_size,
      pageCount: document.page_count,
      status: document.status,
      processingError: document.error_message,
      metadata: document.metadata,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
    };

    return NextResponse.json({ document: transformed });
  } catch (error) {
    console.error("Get document error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: documentId } = await params;

    // Get document to verify ownership and get file path
    const { data: document, error: docError } = await supabase
      .from("pdf_documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete all sessions and messages for this document
    const { data: sessions } = await supabase
      .from("pdf_chat_sessions")
      .select("id")
      .eq("document_id", documentId);

    if (sessions) {
      for (const session of sessions) {
        // Delete messages
        await supabase
          .from("pdf_chat_messages")
          .delete()
          .eq("session_id", session.id);
      }
      
      // Delete sessions
      await supabase
        .from("pdf_chat_sessions")
        .delete()
        .eq("document_id", documentId);
    }

    // Delete document from database
    const { error: deleteError } = await supabase
      .from("pdf_documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      console.error("Failed to delete document:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 }
      );
    }

    // Delete physical file if it exists
    if (document.file_url) {
      try {
        const filePath = path.join(process.cwd(), document.file_url);
        await fs.unlink(filePath);
        console.log(`🗑️ Deleted file: ${filePath}`);
      } catch (fileError) {
        console.error("Failed to delete file:", fileError);
        // Don't fail the request if file deletion fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
