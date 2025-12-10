import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * GET /api/pdf-chat/collections/[id]
 * Get a specific collection with its documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: collectionId } = await params;

    const { data: collection, error: fetchError } = await supabase
      .from("pdf_collections")
      .select("*, pdf_documents(*)")
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Transform to camelCase expected by frontend
    const transformed = {
      id: collection.id,
      userId: collection.user_id,
      name: collection.name,
      description: collection.description,
      fileSearchStoreId: collection.file_search_store_id,
      createdAt: collection.created_at,
      updatedAt: collection.updated_at,
      PdfDocument: (collection.pdf_documents || []).map((doc: any) => ({
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
      })),
    };

    return NextResponse.json({ collection: transformed });
  } catch (error) {
    console.error("Get collection error:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pdf-chat/collections/[id]
 * Delete a collection and all its documents
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: collectionId } = await params;

    // Verify ownership
    const { data: collection, error: collectionError } = await supabase
      .from("pdf_collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Delete collection (documents will be set to null due to ON DELETE SET NULL)
    const { error: deleteError } = await supabase
      .from("pdf_collections")
      .delete()
      .eq("id", collectionId);

    if (deleteError) {
      console.error("Failed to delete collection:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete collection" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete collection error:", error);
    return NextResponse.json(
      { error: "Failed to delete collection" },
      { status: 500 }
    );
  }
}
