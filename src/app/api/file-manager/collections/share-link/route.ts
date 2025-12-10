import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// GET /api/file-manager/collections/share-link?collectionId=xxx - Get share link settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collectionId");

    if (!collectionId) {
      return NextResponse.json({ error: "Collection ID required" }, { status: 400 });
    }

    // Check if user is owner
    const { data: collection, error } = await getSupabaseAdmin()
      .from("file_collections")
      .select("user_id, share_link, share_link_enabled, share_link_access, share_link_role")
      .eq("id", collectionId)
      .single();

    if (error || !collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.user_id !== user.id) {
      return NextResponse.json({ error: "Only owner can view share settings" }, { status: 403 });
    }

    return NextResponse.json({
      shareLink: collection.share_link,
      enabled: collection.share_link_enabled,
      access: collection.share_link_access || "login",
      role: collection.share_link_role || "viewer",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/file-manager/collections/share-link - Update share link settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collectionId, enabled, access, role, regenerate } = await request.json();

    if (!collectionId) {
      return NextResponse.json({ error: "Collection ID required" }, { status: 400 });
    }

    // Validate inputs
    if (access && !["public", "login"].includes(access)) {
      return NextResponse.json({ error: "Access must be 'public' or 'login'" }, { status: 400 });
    }

    if (role && !["viewer", "editor"].includes(role)) {
      return NextResponse.json({ error: "Role must be 'viewer' or 'editor'" }, { status: 400 });
    }

    // Check if user is owner
    const { data: collection } = await getSupabaseAdmin()
      .from("file_collections")
      .select("user_id, share_link")
      .eq("id", collectionId)
      .single();

    if (!collection || collection.user_id !== user.id) {
      return NextResponse.json({ error: "Only owner can update share settings" }, { status: 403 });
    }

    const updateData: Record<string, any> = {};
    
    if (enabled !== undefined) {
      updateData.share_link_enabled = enabled;
    }
    
    if (access) {
      updateData.share_link_access = access;
    }
    
    if (role) {
      updateData.share_link_role = role;
    }

    // Regenerate share link if requested
    if (regenerate) {
      updateData.share_link = crypto.randomUUID();
    }

    const { data: updated, error } = await getSupabaseAdmin()
      .from("file_collections")
      .update(updateData)
      .eq("id", collectionId)
      .select("share_link, share_link_enabled, share_link_access, share_link_role")
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to update share settings" }, { status: 500 });
    }

    return NextResponse.json({
      shareLink: updated.share_link,
      enabled: updated.share_link_enabled,
      access: updated.share_link_access,
      role: updated.share_link_role,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
