import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Helper to check if collection_members table exists
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await getSupabaseAdmin()
      .from(tableName)
      .select("id")
      .limit(1);
    
    // If error code is PGRST205, table doesn't exist
    if (error?.code === "PGRST205") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// GET /api/file-manager/shared - Get collections shared with current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if collection_members table exists
    const membersTableExists = await tableExists("collection_members");
    
    if (!membersTableExists) {
      // Table doesn't exist yet - return empty array
      console.log("collection_members table not found - run migration");
      return NextResponse.json({ collections: [] });
    }

    // Find all memberships for this user (by user_id or email)
    const { data: memberships, error: memberError } = await getSupabaseAdmin()
      .from("collection_members")
      .select("collection_id, role, status")
      .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
      .eq("status", "accepted");

    if (memberError) {
      console.error("Database error:", memberError);
      // If table doesn't exist, return empty
      if (memberError.code === "PGRST205" || memberError.code === "42P01") {
        return NextResponse.json({ collections: [] });
      }
      return NextResponse.json({ error: "Failed to fetch memberships" }, { status: 500 });
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ collections: [] });
    }

    const collectionIds = memberships.map(m => m.collection_id);

    // Get the collections
    const { data: collections, error: collError } = await getSupabaseAdmin()
      .from("file_collections")
      .select(`
        *,
        file_collection_files (count)
      `)
      .in("id", collectionIds)
      .order("name", { ascending: true });

    if (collError) {
      console.error("Database error:", collError);
      return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
    }

    // Get owner info for each collection
    const ownerIds = [...new Set(collections.map((c: any) => c.user_id))];
    const ownerMap: Record<string, string> = {};
    
    for (const ownerId of ownerIds) {
      const { data: ownerData } = await getSupabaseAdmin().auth.admin.getUserById(ownerId);
      if (ownerData?.user?.email) {
        ownerMap[ownerId] = ownerData.user.email;
      }
    }

    // Create role map for quick lookup
    const roleMap: Record<string, string> = {};
    memberships.forEach(m => {
      roleMap[m.collection_id] = m.role;
    });

    const transformedCollections = collections.map((collection: any) => ({
      id: collection.id,
      userId: collection.user_id,
      name: collection.name,
      description: collection.description,
      color: collection.color,
      icon: collection.icon,
      fileCount: collection.file_collection_files?.[0]?.count || 0,
      createdAt: collection.created_at,
      updatedAt: collection.updated_at,
      isShared: true,
      ownerEmail: ownerMap[collection.user_id] || "Unknown",
      myRole: roleMap[collection.id] || "viewer",
    }));

    return NextResponse.json({ collections: transformedCollections });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/file-manager/shared/[shareLink] - Access collection via share link
// This is handled by a separate dynamic route
