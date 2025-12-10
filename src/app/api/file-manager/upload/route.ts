import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { uploadToWasabi, isWasabiConfigured, getSignedFileUrl } from "@/lib/wasabi";
import { generateAITags, getTagColor } from "@/features/file-manager/lib/ai-tagger";
import { generateEmbedding } from "@/features/file-manager/lib/embeddings";

export async function POST(request: NextRequest) {
  try {
    // Check Wasabi configuration
    if (!isWasabiConfigured()) {
      console.error("Wasabi is not configured. Please set WASABI_ACCESS_KEY_ID, WASABI_SECRET_ACCESS_KEY, and WASABI_BUCKET_NAME environment variables.");
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const collectionId = formData.get("collectionId") as string | null;
    
    console.log("[UPLOAD] File:", file?.name, "CollectionId:", collectionId);
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert File to Buffer for Wasabi upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload file to Wasabi (stored in users/{userId}/files/... folder)
    const uploadResult = await uploadToWasabi(
      user.id,
      buffer,
      file.name,
      file.type || 'application/octet-stream'
    );

    const { key, url, size } = uploadResult;
    const fileType = file.name.split(".").pop()?.toLowerCase() || "unknown";
    const mimeType = file.type;

    // Create file record in Supabase with Wasabi URL
    const { data: fileRecord, error: dbError } = await getSupabaseAdmin()
      .from("user_files")
      .insert({
        user_id: user.id,
        filename: file.name,
        original_name: file.name,
        file_type: fileType,
        mime_type: mimeType,
        file_size: size,
        file_url: url,           // Wasabi public URL
        file_key: key,           // Wasabi object key (users/{userId}/files/...)
        storage_provider: 'wasabi', // Track which storage provider
        is_generated: false,
        is_favorite: false,
        is_indexed: false,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ error: "Failed to save file record" }, { status: 500 });
    }

    // If collectionId is provided, add file to collection
    if (collectionId) {
      console.log("[UPLOAD] Adding file to collection:", collectionId);
      const { error: collectionError } = await getSupabaseAdmin()
        .from("file_collection_files")
        .insert({
          file_id: fileRecord.id,
          collection_id: collectionId,
        });
      
      if (collectionError) {
        console.error("Failed to add file to collection:", collectionError);
        // Don't fail the upload, just log the error
      } else {
        console.log("[UPLOAD] File added to collection successfully");
      }
    }

    // Generate AI tags in the background
    generateTagsForFile(fileRecord.id, file.name, fileType).catch(console.error);

    // Generate embeddings for searchable content
    if (["pdf", "doc", "docx", "txt", "md"].includes(fileType)) {
      indexFileContent(fileRecord.id, url, fileType).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.original_name,
        fileType: fileRecord.file_type,
        mimeType: fileRecord.mime_type,
        fileSize: fileRecord.file_size,
        fileUrl: fileRecord.file_url,
        isGenerated: fileRecord.is_generated,
        isFavorite: fileRecord.is_favorite,
        createdAt: fileRecord.created_at,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Background function to generate AI tags
async function generateTagsForFile(
  fileId: string,
  filename: string,
  fileType: string
) {
  try {
    // Generate basic tags from filename for now
    // Full content-based tagging would require file parsing
    const result = await generateAITags(filename, filename);

    if (result.tags.length > 0) {
      // Insert tags
      const tagRecords = result.tags.map((tagName: string) => ({
        file_id: fileId,
        tag_name: tagName,
        tag_type: result.category || 'general',
        confidence: 0.8,
        color: getTagColor(tagName),
        is_ai_generated: true,
      }));

      await getSupabaseAdmin().from("file_tags").insert(tagRecords);
    }
  } catch (error) {
    console.error("Tag generation error:", error);
  }
}

// Background function to index file content
async function indexFileContent(fileId: string, fileUrl: string, fileType: string) {
  try {
    // Fetch and extract text from file
    const response = await fetch(fileUrl);
    const content = await response.text();

    // Generate embedding
    const embedding = await generateEmbedding(content.slice(0, 8000)); // Limit content

    if (embedding) {
      // Store embedding chunk
      await getSupabaseAdmin().from("file_chunks").insert({
        file_id: fileId,
        chunk_index: 0,
        content: content.slice(0, 2000),
        embedding: embedding,
        start_position: 0,
        end_position: Math.min(content.length, 2000),
      });

      // Mark file as indexed
      await getSupabaseAdmin()
        .from("user_files")
        .update({ is_indexed: true })
        .eq("id", fileId);
    }
  } catch (error) {
    console.error("Indexing error:", error);
  }
}
