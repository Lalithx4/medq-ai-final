import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// GET /api/file-manager/collections/members?collectionId=xxx - Get all members of a collection
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

    // Check if user has access to this collection
    const hasAccess = await checkCollectionAccess(user.id, user.email!, collectionId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: members, error } = await getSupabaseAdmin()
      .from("collection_members")
      .select("*")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    // Also get collection owner info
    const { data: collection } = await getSupabaseAdmin()
      .from("file_collections")
      .select("user_id")
      .eq("id", collectionId)
      .single();

    // Get owner's email
    const { data: ownerData } = await getSupabaseAdmin().auth.admin.getUserById(collection?.user_id || "");

    const transformedMembers: any[] = members.map((member: any) => ({
      id: member.id,
      collectionId: member.collection_id,
      userId: member.user_id,
      email: member.email,
      role: member.role,
      status: member.status,
      invitedBy: member.invited_by,
      invitedAt: member.invited_at,
      acceptedAt: member.accepted_at,
    }));

    // Add owner to the list
    if (ownerData?.user && collection) {
      transformedMembers.unshift({
        id: "owner",
        collectionId,
        userId: collection.user_id,
        email: ownerData.user.email,
        role: "owner",
        status: "accepted",
        invitedBy: null,
        invitedAt: null,
        acceptedAt: null,
        isOwner: true,
      });
    }

    return NextResponse.json({ members: transformedMembers });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/file-manager/collections/members - Invite a member to a collection
export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collectionId, email, role = "viewer" } = await request.json();

    if (!collectionId || !email) {
      return NextResponse.json({ error: "Collection ID and email required" }, { status: 400 });
    }

    // Validate role
    if (!["viewer", "editor"].includes(role)) {
      return NextResponse.json({ error: "Invalid role. Must be 'viewer' or 'editor'" }, { status: 400 });
    }

    // Check if user is owner of this collection
    const { data: collection } = await getSupabaseAdmin()
      .from("file_collections")
      .select("user_id, name")
      .eq("id", collectionId)
      .single();

    if (!collection || collection.user_id !== user.id) {
      return NextResponse.json({ error: "Only collection owner can invite members" }, { status: 403 });
    }

    // Check if not inviting self
    if (email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
    }

    // Check if already a member
    const { data: existing } = await getSupabaseAdmin()
      .from("collection_members")
      .select("id, status")
      .eq("collection_id", collectionId)
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ 
        error: `User already ${existing.status === 'accepted' ? 'a member' : 'invited'}` 
      }, { status: 400 });
    }

    // Try to find user by email to link user_id
    const { data: invitedUserList } = await getSupabaseAdmin().auth.admin.listUsers();
    const invitedUser = invitedUserList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // Create member record
    const { data: member, error } = await getSupabaseAdmin()
      .from("collection_members")
      .insert({
        collection_id: collectionId,
        user_id: invitedUser?.id || null,
        email: email.toLowerCase(),
        role,
        status: invitedUser ? "accepted" : "pending", // Auto-accept if user exists
        invited_by: user.id,
        accepted_at: invitedUser ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to invite member" }, { status: 500 });
    }

    return NextResponse.json({ 
      member: {
        id: member.id,
        collectionId: member.collection_id,
        userId: member.user_id,
        email: member.email,
        role: member.role,
        status: member.status,
        invitedBy: member.invited_by,
        invitedAt: member.invited_at,
      },
      message: invitedUser ? "Member added successfully" : "Invitation sent"
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/file-manager/collections/members - Remove a member from a collection
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const collectionId = searchParams.get("collectionId");

    if (!memberId || !collectionId) {
      return NextResponse.json({ error: "Member ID and Collection ID required" }, { status: 400 });
    }

    // Check if user is owner of this collection OR is removing themselves
    const { data: collection } = await getSupabaseAdmin()
      .from("file_collections")
      .select("user_id")
      .eq("id", collectionId)
      .single();

    const { data: memberToRemove } = await getSupabaseAdmin()
      .from("collection_members")
      .select("user_id, email")
      .eq("id", memberId)
      .single();

    const isOwner = collection?.user_id === user.id;
    const isRemovingSelf = memberToRemove?.user_id === user.id || 
                           memberToRemove?.email?.toLowerCase() === user.email?.toLowerCase();

    if (!isOwner && !isRemovingSelf) {
      return NextResponse.json({ error: "Only owner can remove members" }, { status: 403 });
    }

    const { error } = await getSupabaseAdmin()
      .from("collection_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/file-manager/collections/members - Update a member's role
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId, role } = await request.json();

    if (!memberId || !role) {
      return NextResponse.json({ error: "Member ID and role required" }, { status: 400 });
    }

    if (!["viewer", "editor"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Get the member record
    const { data: member } = await getSupabaseAdmin()
      .from("collection_members")
      .select("collection_id")
      .eq("id", memberId)
      .single();

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if user is owner
    const { data: collection } = await getSupabaseAdmin()
      .from("file_collections")
      .select("user_id")
      .eq("id", member.collection_id)
      .single();

    if (collection?.user_id !== user.id) {
      return NextResponse.json({ error: "Only owner can change roles" }, { status: 403 });
    }

    const { error } = await getSupabaseAdmin()
      .from("collection_members")
      .update({ role })
      .eq("id", memberId);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to check if user has access to a collection
async function checkCollectionAccess(userId: string, userEmail: string, collectionId: string): Promise<boolean> {
  // Check if owner
  const { data: collection } = await getSupabaseAdmin()
    .from("file_collections")
    .select("user_id")
    .eq("id", collectionId)
    .single();

  if (collection?.user_id === userId) {
    return true;
  }

  // Check if member
  const { data: member } = await getSupabaseAdmin()
    .from("collection_members")
    .select("id")
    .eq("collection_id", collectionId)
    .or(`user_id.eq.${userId},email.eq.${userEmail.toLowerCase()}`)
    .eq("status", "accepted")
    .single();

  return !!member;
}
