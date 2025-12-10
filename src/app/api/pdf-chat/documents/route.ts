import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * GET /api/pdf-chat/documents
 * Get all documents for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all documents for this user
    const { data: documents, error: docsError } = await supabase
      .from("pdf_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (docsError) {
      console.error("Failed to fetch documents:", docsError);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    // Transform snake_case to camelCase for frontend
    const transformedDocs = documents?.map((doc: any) => ({
      id: doc.id,
      userId: doc.user_id,
      collectionId: doc.collection_id,
      filename: doc.filename,
      originalName: doc.original_filename,
      fileUrl: doc.file_url,
      fileSize: doc.file_size,
      pageCount: doc.page_count,
      status: doc.status,
      processingError: doc.error_message,
      metadata: doc.metadata,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    })) || [];

    return NextResponse.json({ documents: transformedDocs });
  } catch (error) {
    console.error("Get documents error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
