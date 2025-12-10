import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSignedFileUrl, downloadFromWasabi, isWasabiConfigured } from "@/lib/wasabi";

// GET /api/file-manager/download?fileId=xxx - Get signed URL for file download
// GET /api/file-manager/download?fileId=xxx&inline=true - Get signed URL for inline viewing
export async function GET(request: NextRequest) {
  try {
    if (!isWasabiConfigured()) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    const inline = searchParams.get("inline") === "true";

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 });
    }

    // Get file record from database
    const { data: fileRecord, error: dbError } = await getSupabaseAdmin()
      .from("user_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (dbError || !fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check if user owns the file or has access through a shared collection
    const hasAccess = await checkFileAccess(user.id, fileRecord);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if file is stored in Wasabi
    if (fileRecord.storage_provider !== 'wasabi' || !fileRecord.file_key) {
      // For legacy files (UploadThing), return the original URL
      return NextResponse.json({
        success: true,
        url: fileRecord.file_url,
        filename: fileRecord.original_name,
        contentType: fileRecord.mime_type,
      });
    }

    // Generate signed URL for Wasabi file (valid for 1 hour)
    console.log("[DOWNLOAD] File ID:", fileId);
    console.log("[DOWNLOAD] File key from DB:", fileRecord.file_key);
    console.log("[DOWNLOAD] Storage provider:", fileRecord.storage_provider);
    console.log("[DOWNLOAD] Original file_url:", fileRecord.file_url);
    const signedUrl = await getSignedFileUrl(fileRecord.file_key, 3600);
    console.log("[DOWNLOAD] Signed URL generated:", signedUrl);

    return NextResponse.json({
      success: true,
      url: signedUrl,
      filename: fileRecord.original_name,
      contentType: fileRecord.mime_type,
      inline,
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to check if user has access to file
async function checkFileAccess(userId: string, fileRecord: any): Promise<boolean> {
  // User owns the file
  if (fileRecord.user_id === userId) {
    return true;
  }

  // Check if file is in a collection shared with the user
  if (fileRecord.collection_id) {
    const { data: share } = await getSupabaseAdmin()
      .from("collection_shares")
      .select("id")
      .eq("collection_id", fileRecord.collection_id)
      .eq("shared_with_user_id", userId)
      .single();

    if (share) {
      return true;
    }

    // Check if there's a public share link for the collection
    const { data: publicLink } = await getSupabaseAdmin()
      .from("shared_collection_links")
      .select("id")
      .eq("collection_id", fileRecord.collection_id)
      .eq("is_active", true)
      .single();

    if (publicLink) {
      return true;
    }
  }

  return false;
}
