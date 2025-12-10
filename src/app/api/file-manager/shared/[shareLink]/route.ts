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

// GET /api/file-manager/shared/[shareLink] - Access a collection via share link
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;
    
    if (!shareLink) {
      return NextResponse.json({ error: "Share link required" }, { status: 400 });
    }

    // Check if share_link column exists on file_collections
    // First, try to find collection with share link
    const { data: collection, error } = await getSupabaseAdmin()
      .from("file_collections")
      .select("*")
      .eq("share_link", shareLink)
      .eq("share_link_enabled", true)
      .single();

    if (error) {
      console.error("Collection error:", error);
      // If column doesn't exist or no match found
      if (error.code === "PGRST204" || error.code === "42703") {
        return NextResponse.json({ 
          error: "Share link feature not set up. Please run the database migration.",
          setupRequired: true 
        }, { status: 404 });
      }
      return NextResponse.json({ error: "Invalid or disabled share link" }, { status: 404 });
    }

    if (!collection) {
      return NextResponse.json({ error: "Invalid or disabled share link" }, { status: 404 });
    }

    // Check access requirements
    const accessType = collection.share_link_access || "login";
    
    if (accessType === "login") {
      // Require login
      const supabase = await getServerSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.id) {
        return NextResponse.json({ 
          error: "Login required to access this collection",
          requiresLogin: true,
          collectionName: collection.name,
        }, { status: 401 });
      }

      // Try to auto-add user as member if collection_members table exists
      const membersTableExists = await tableExists("collection_members");
      
      if (membersTableExists && collection.user_id !== user.id) {
        try {
          const { data: existingMember } = await getSupabaseAdmin()
            .from("collection_members")
            .select("id")
            .eq("collection_id", collection.id)
            .eq("email", user.email?.toLowerCase() || "")
            .maybeSingle();

          if (!existingMember) {
            await getSupabaseAdmin()
              .from("collection_members")
              .insert({
                collection_id: collection.id,
                user_id: user.id,
                email: user.email?.toLowerCase() || "",
                role: collection.share_link_role || "viewer",
                status: "accepted",
                invited_by: collection.user_id,
                accepted_at: new Date().toISOString(),
              });
          }
        } catch (memberErr) {
          // Ignore member errors - still allow access to files
          console.log("Member auto-add skipped:", memberErr);
        }
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
          created_at
        )
      `)
      .eq("collection_id", collection.id);

    if (filesError) {
      console.error("Files error:", filesError);
    }

    // Get owner info
    const { data: ownerData } = await getSupabaseAdmin().auth.admin.getUserById(collection.user_id);

    // Transform files
    const files = (fileLinks || [])
      .filter((link: any) => link.user_files)
      .map((link: any) => ({
        id: link.user_files.id,
        name: link.user_files.filename || link.user_files.original_name,
        originalName: link.user_files.original_name,
        type: link.user_files.file_type || link.user_files.mime_type || "unknown",
        mimeType: link.user_files.mime_type,
        size: link.user_files.file_size || 0,
        url: link.user_files.file_url,
        thumbnailUrl: link.user_files.thumbnail_url,
        createdAt: link.user_files.created_at,
      }));

    return NextResponse.json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        color: collection.color || "#3b82f6",
        icon: collection.icon,
        fileCount: files.length,
        ownerEmail: ownerData?.user?.email || "Unknown",
        accessRole: collection.share_link_role || "viewer",
      },
      files,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
