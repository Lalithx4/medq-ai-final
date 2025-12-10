import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// GET /api/file-manager/collections/presence?collectionId=xxx - Get who's online
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

    // Get active users (last seen within 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: presence, error } = await getSupabaseAdmin()
      .from("collection_presence")
      .select("*")
      .eq("collection_id", collectionId)
      .eq("is_active", true)
      .gte("last_seen", twoMinutesAgo);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch presence" }, { status: 500 });
    }

    return NextResponse.json({ 
      onlineUsers: presence.map((p: any) => ({
        userId: p.user_id,
        email: p.user_email,
        name: p.user_name,
        avatar: p.user_avatar,
        lastSeen: p.last_seen,
      }))
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/file-manager/collections/presence - Update presence (heartbeat)
export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collectionId, isActive = true } = await request.json();

    if (!collectionId) {
      return NextResponse.json({ error: "Collection ID required" }, { status: 400 });
    }

    // Get user metadata
    const { data: userData } = await supabase.auth.getUser();
    const userMeta = userData.user?.user_metadata || {};

    // Upsert presence
    const { error } = await getSupabaseAdmin()
      .from("collection_presence")
      .upsert({
        collection_id: collectionId,
        user_id: user.id,
        user_email: user.email,
        user_name: userMeta.full_name || userMeta.name || user.email?.split("@")[0],
        user_avatar: userMeta.avatar_url || userMeta.picture,
        last_seen: new Date().toISOString(),
        is_active: isActive,
      }, {
        onConflict: "collection_id,user_id"
      });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/file-manager/collections/presence - Leave collection (mark offline)
export async function DELETE(request: NextRequest) {
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

    const { error } = await getSupabaseAdmin()
      .from("collection_presence")
      .update({ is_active: false })
      .eq("collection_id", collectionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
