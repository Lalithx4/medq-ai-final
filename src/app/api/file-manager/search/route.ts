import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateEmbedding } from "@/features/file-manager/lib/embeddings";

// POST /api/file-manager/search - Semantic search for files
export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query, limit = 10 } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    let files: any[] = [];

    // If we have embeddings enabled, do semantic search
    if (queryEmbedding) {
      // Semantic search using pgvector
      const { data: chunks, error: searchError } = await getSupabaseAdmin().rpc(
        "match_file_chunks",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.7,
          match_count: limit * 2, // Get more chunks, then dedupe by file
          p_user_id: user.id,
        }
      );

      if (searchError) {
        console.error("Semantic search error:", searchError);
        // Fall back to text search
      } else if (chunks && chunks.length > 0) {
        // Get unique file IDs
        const fileIds = [...new Set(chunks.map((c: any) => c.file_id))].slice(0, limit);

        // Fetch full file data
        const { data: semanticFiles } = await getSupabaseAdmin()
          .from("user_files")
          .select(`
            *,
            file_tags (*)
          `)
          .in("id", fileIds)
          .eq("user_id", user.id);

        if (semanticFiles) {
          files = semanticFiles;
        }
      }
    }

    // If no semantic results, fall back to text search
    if (files.length === 0) {
      const { data: textFiles, error } = await getSupabaseAdmin()
        .from("user_files")
        .select(`
          *,
          file_tags (*)
        `)
        .eq("user_id", user.id)
        .or(`filename.ilike.%${query}%,original_name.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Text search error:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
      }

      files = textFiles || [];
    }

    // Also search by tags
    const { data: tagFiles } = await getSupabaseAdmin()
      .from("file_tags")
      .select(`
        file_id,
        user_files!inner (
          *,
          file_tags (*)
        )
      `)
      .eq("user_files.user_id", user.id)
      .ilike("tag_name", `%${query}%`)
      .limit(limit);

    // Merge and dedupe results
    const allFiles = [...files];
    if (tagFiles) {
      for (const tf of tagFiles) {
        const fileData = (tf as any).user_files;
        if (fileData && !allFiles.some((f: any) => f.id === fileData.id)) {
          allFiles.push(fileData);
        }
      }
    }

    // Transform to frontend format
    const transformedFiles = allFiles.slice(0, limit).map((file: any) => ({
      id: file.id,
      userId: file.user_id,
      filename: file.filename,
      originalName: file.original_name,
      fileType: file.file_type,
      mimeType: file.mime_type,
      fileSize: file.file_size,
      fileUrl: file.file_url,
      thumbnailUrl: file.thumbnail_url,
      isGenerated: file.is_generated,
      sourceFeature: file.source_feature,
      isFavorite: file.is_favorite,
      createdAt: file.created_at,
      tags: file.file_tags?.map((tag: any) => ({
        id: tag.id,
        tagName: tag.tag_name,
        tagType: tag.tag_type,
        confidence: tag.confidence,
        color: tag.color,
        isAiGenerated: tag.is_ai_generated,
      })) || [],
    }));

    return NextResponse.json({ files: transformedFiles });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
