import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// GET /api/file-manager/collections - List all collections for current user
export async function GET(request: NextRequest) {
  try {
    console.log("[COLLECTIONS API] GET request received");
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    console.log("[COLLECTIONS API] User:", user?.id);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: collections, error } = await getSupabaseAdmin()
      .from("file_collections")
      .select(`
        *,
        file_collection_files (count)
      `)
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    console.log("[COLLECTIONS API] Query result:", { collections, error });

    if (error) {
      console.error("[COLLECTIONS API] Database error:", error);
      return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
    }

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
      // Sharing fields
      isShared: collection.is_shared || false,
      shareLink: collection.share_link,
      shareLinkEnabled: collection.share_link_enabled || false,
      shareLinkAccess: collection.share_link_access || 'login',
      shareLinkRole: collection.share_link_role || 'viewer',
      myRole: 'owner', // User owns these collections
    }));

    return NextResponse.json({ collections: transformedCollections });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/file-manager/collections - Create a new collection
export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, color, icon } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const { data: collection, error } = await getSupabaseAdmin()
      .from("file_collections")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description || null,
        color: color || "#3b82f6",
        icon: icon || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      collection: {
        id: collection.id,
        userId: collection.user_id,
        name: collection.name,
        description: collection.description,
        color: collection.color,
        icon: collection.icon,
        fileCount: 0,
        createdAt: collection.created_at,
        updatedAt: collection.updated_at,
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/file-manager/collections - Update a collection
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, description, color, icon } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Collection ID required" }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (color) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    const { data: collection, error } = await getSupabaseAdmin()
      .from("file_collections")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update collection" }, { status: 500 });
    }

    return NextResponse.json({ success: true, collection });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/file-manager/collections?id=xxx - Delete a collection
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("id");

    if (!collectionId) {
      return NextResponse.json({ error: "Collection ID required" }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from("file_collections")
      .delete()
      .eq("id", collectionId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/file-manager/collections - Add/remove files from collection
export async function PUT(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collectionId, fileId, action } = await request.json();

    if (!collectionId || !fileId) {
      return NextResponse.json({ error: "Collection ID and File ID required" }, { status: 400 });
    }

    // Verify collection belongs to user
    const { data: collection } = await getSupabaseAdmin()
      .from("file_collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .single();

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Verify file belongs to user
    const { data: file } = await getSupabaseAdmin()
      .from("user_files")
      .select("id")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single();

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (action === "remove") {
      // Remove file from collection
      const { error } = await getSupabaseAdmin()
        .from("file_collection_files")
        .delete()
        .eq("file_id", fileId)
        .eq("collection_id", collectionId);

      if (error) {
        return NextResponse.json({ error: "Failed to remove file from collection" }, { status: 500 });
      }
    } else {
      // Add file to collection (default action)
      const { error } = await getSupabaseAdmin()
        .from("file_collection_files")
        .upsert({
          file_id: fileId,
          collection_id: collectionId,
        }, {
          onConflict: "file_id,collection_id"
        });

      if (error) {
        console.error("Add to collection error:", error);
        return NextResponse.json({ error: "Failed to add file to collection" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
