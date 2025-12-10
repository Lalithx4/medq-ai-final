// Single Group API - GET, PUT, DELETE
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';
import { UpdateGroupInput } from '@/features/groups/types';

// GET /api/groups/[groupId] - Get single group with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS
    const adminClient = getServiceRoleSupabase();

    // Check if user is a member
    const { data: membership, error: memberError } = await adminClient
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Get group details
    const { data: group, error: groupError } = await adminClient
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get member count
    const { count: memberCount } = await adminClient
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    // Get creator profile
    const { data: creator } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .eq('id', group.created_by)
      .single();

    return NextResponse.json({
      success: true,
      group: {
        ...group,
        member_count: memberCount || 0,
        creator,
        my_role: membership.role,
        my_membership: membership
      }
    });

  } catch (error) {
    console.error('Get group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/groups/[groupId] - Update group settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS
    const adminClient = getServiceRoleSupabase();

    // Check if user is admin
    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update group settings' }, { status: 403 });
    }

    const body: UpdateGroupInput = await request.json();
    const updates: Record<string, any> = {};

    if (body.name !== undefined) {
      if (body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Group name cannot be empty' }, { status: 400 });
      }
      updates.name = body.name.trim();
    }
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url || null;
    if (body.only_admins_can_message !== undefined) updates.only_admins_can_message = body.only_admins_can_message;
    if (body.only_admins_can_add_members !== undefined) updates.only_admins_can_add_members = body.only_admins_can_add_members;
    if (body.mute_notifications !== undefined) updates.mute_notifications = body.mute_notifications;
    if (body.invite_link_enabled !== undefined) updates.invite_link_enabled = body.invite_link_enabled;

    updates.updated_at = new Date().toISOString();

    const { data: updatedGroup, error: updateError } = await adminClient
      .from('groups')
      .update(updates)
      .eq('id', groupId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating group:', updateError);
      return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      group: updatedGroup
    });

  } catch (error) {
    console.error('Update group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/groups/[groupId] - Delete group (creator only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS
    const adminClient = getServiceRoleSupabase();

    // Check if user is the creator
    const { data: group } = await adminClient
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the group creator can delete the group' }, { status: 403 });
    }

    // Delete the group (cascade will handle members, messages, etc.)
    const { error: deleteError } = await adminClient
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (deleteError) {
      console.error('Error deleting group:', deleteError);
      return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
