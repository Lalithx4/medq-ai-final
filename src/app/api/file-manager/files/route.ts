import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// GET /api/file-manager/files - List all files for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isGenerated = searchParams.get("isGenerated");
    const collectionId = searchParams.get("collectionId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    let files;
    let error;

    // If filtering by collection, use a different query approach
    if (collectionId) {
      // First get file IDs in the collection
      const { data: collectionFiles, error: cfError } = await getSupabaseAdmin()
        .from("file_collection_files")
        .select("file_id")
        .eq("collection_id", collectionId);
      
      if (cfError) {
        console.error("Error fetching collection files:", cfError);
        return NextResponse.json({ error: "Failed to fetch collection files" }, { status: 500 });
      }

      const fileIds = collectionFiles?.map(cf => cf.file_id) || [];
      console.log("[FILES API] Collection", collectionId, "has", fileIds.length, "files");

      if (fileIds.length === 0) {
        files = [];
      } else {
        const { data, error: filesError } = await getSupabaseAdmin()
          .from("user_files")
          .select(`
            *,
            file_tags (*),
            file_collections:file_collection_files(
              collection:file_collections(*)
            )
          `)
          .eq("user_id", user.id)
          .in("id", fileIds)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        
        files = data;
        error = filesError;
      }
    } else {
      // Standard query without collection filter
      let query = getSupabaseAdmin()
        .from("user_files")
        .select(`
          *,
          file_tags (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (isGenerated !== null) {
        query = query.eq("is_generated", isGenerated === "true");
      }

      const result = await query;
      files = result.data;
      error = result.error;
    }
    
    // Fetch collection associations for all files
    if (files && files.length > 0) {
      const fileIds = files.map((f: any) => f.id);
      const { data: fileCollectionLinks } = await getSupabaseAdmin()
        .from("file_collection_files")
        .select(`
          file_id,
          collection:file_collections(*)
        `)
        .in("file_id", fileIds);
      
      // Create a map of file_id -> collections
      const fileCollectionsMap: Record<string, any[]> = {};
      (fileCollectionLinks || []).forEach((link: any) => {
        if (!fileCollectionsMap[link.file_id]) {
          fileCollectionsMap[link.file_id] = [];
        }
        if (link.collection) {
          fileCollectionsMap[link.file_id].push(link.collection);
        }
      });
      
      // Attach collections to files
      files = files.map((file: any) => ({
        ...file,
        file_collections: fileCollectionsMap[file.id] || []
      }));
    }

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
    }

    // Transform data to match frontend types
    const transformedFiles = files.map((file: any) => ({
      id: file.id,
      userId: file.user_id,
      filename: file.filename,
      originalName: file.original_name,
      fileType: file.file_type,
      mimeType: file.mime_type,
      fileSize: file.file_size,
      fileUrl: file.file_url,
      fileKey: file.file_key,
      thumbnailUrl: file.thumbnail_url,
      isGenerated: file.is_generated,
      sourceFeature: file.source_feature,
      sourceId: file.source_id,
      isFavorite: file.is_favorite,
      isIndexed: file.is_indexed,
      metadata: file.metadata,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
      tags: file.file_tags?.map((tag: any) => ({
        id: tag.id,
        fileId: tag.file_id,
        tagName: tag.tag_name,
        tagType: tag.tag_type,
        confidence: tag.confidence,
        color: tag.color,
        isAiGenerated: tag.is_ai_generated,
      })) || [],
      collections: file.file_collections || [],
    }));

    return NextResponse.json({ files: transformedFiles });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/file-manager/files?id=xxx - Delete a file
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    // Verify ownership
    const { data: file, error: fetchError } = await getSupabaseAdmin()
      .from("user_files")
      .select("id, file_key")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from database (cascades to tags, chunks, collection associations)
    const { error: deleteError } = await getSupabaseAdmin()
      .from("user_files")
      .delete()
      .eq("id", fileId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }

    // TODO: Delete from uploadthing storage
    // await utapi.deleteFiles(file.file_key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/file-manager/files - Update a file
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, isFavorite, filename } = body;

    if (!id) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (typeof isFavorite === "boolean") {
      updateData.is_favorite = isFavorite;
    }
    if (filename) {
      updateData.filename = filename;
    }

    const { data: file, error } = await getSupabaseAdmin()
      .from("user_files")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
    }

    return NextResponse.json({ success: true, file });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
