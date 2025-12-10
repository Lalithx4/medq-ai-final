import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Helper to check if a table exists
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await getSupabaseAdmin()
      .from(tableName)
      .select("id")
      .limit(1);
    return !error || error.code !== "PGRST205";
  } catch {
    return false;
  }
}

// GET /api/file-manager/shared/collection/[collectionId]/files
// Get files from a shared collection that the user has access to
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const { collectionId } = await params;
    
    if (!collectionId) {
      return NextResponse.json({ error: "Collection ID required" }, { status: 400 });
    }

    // Get current user
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to this collection
    // Either they own it, or they're a member with accepted status
    const { data: collection, error: collError } = await getSupabaseAdmin()
      .from("file_collections")
      .select("id, user_id, name")
      .eq("id", collectionId)
      .single();

    if (collError || !collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Check if user owns the collection
    const isOwner = collection.user_id === user.id;

    // If not owner, check if they're an accepted member
    if (!isOwner) {
      const membersTableExists = await tableExists("collection_members");
      
      if (membersTableExists) {
        const { data: membership } = await getSupabaseAdmin()
          .from("collection_members")
          .select("id, role, status")
          .eq("collection_id", collectionId)
          .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
          .eq("status", "accepted")
          .maybeSingle();

        if (!membership) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      } else {
        // If collection_members table doesn't exist, deny access for non-owners
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Get files in this collection
    const { data: fileLinks, error: filesError } = await getSupabaseAdmin()
      .from("file_collection_files")
      .select(`
        file_id,
        user_files (
          id,
          filename,
          original_name,
          file_type,
          mime_type,
          file_size,
          file_url,
          thumbnail_url,
          is_favorite,
          is_generated,
          created_at,
          updated_at
        )
      `)
      .eq("collection_id", collectionId);

    if (filesError) {
      console.error("Files error:", filesError);
      return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
    }

    // Transform files to match UserFile interface
    const files = (fileLinks || [])
      .filter((link: any) => link.user_files)
      .map((link: any) => ({
        id: link.user_files.id,
        filename: link.user_files.filename || link.user_files.original_name,
        originalName: link.user_files.original_name,
        fileType: link.user_files.file_type || link.user_files.mime_type || "unknown",
        mimeType: link.user_files.mime_type,
        fileSize: link.user_files.file_size || 0,
        fileUrl: link.user_files.file_url,
        thumbnailUrl: link.user_files.thumbnail_url,
        isFavorite: link.user_files.is_favorite || false,
        isGenerated: link.user_files.is_generated || false,
        createdAt: link.user_files.created_at,
        updatedAt: link.user_files.updated_at,
        collectionId: collectionId,
      }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
