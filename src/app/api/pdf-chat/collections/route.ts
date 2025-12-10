import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getGeminiFileSearchService } from "@/lib/rag/gemini-file-search";

/**
 * POST /api/pdf-chat/collections
 * Create a new PDF collection with a Gemini File Search Store
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

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    // Create Gemini File Search Store with unique label
    const geminiService = getGeminiFileSearchService();
    const uniqueId = crypto.randomUUID();
    const storeLabel = `collection-${uniqueId}-${Date.now()}`;
    const storeName = await geminiService.getOrCreateStore(storeLabel);

    console.log(`📁 Created File Search Store for collection "${name}":`, {
      storeName,
      label: storeLabel,
    });

    // Create collection in database
    const { data: collection, error: createError } = await supabase
      .from("pdf_collections")
      .insert({
        user_id: user.id,
        name,
        description,
        file_search_store_id: storeName,
      })
      .select()
      .single();

    if (createError) {
      console.error("Failed to create collection:", createError);
      return NextResponse.json(
        { error: "Failed to create collection" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      collectionId: collection.id,
      storeName,
    });
  } catch (error) {
    console.error("Create collection error:", error);
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pdf-chat/collections
 * Get all collections for the current user
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

    const { data: collections, error: fetchError } = await supabase
      .from("pdf_collections")
      .select("*, pdf_documents(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Failed to fetch collections:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch collections" },
        { status: 500 }
      );
    }

    // Transform snake_case to camelCase for frontend
    const transformedCollections = collections?.map((col: any) => ({
      id: col.id,
      userId: col.user_id,
      name: col.name,
      description: col.description,
      fileSearchStoreId: col.file_search_store_id,
      createdAt: col.created_at,
      updatedAt: col.updated_at,
      PdfDocument: col.pdf_documents?.map((doc: any) => ({
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
      })) || [],
    })) || [];

    return NextResponse.json({ collections: transformedCollections });
  } catch (error) {
    console.error("Get collections error:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}
