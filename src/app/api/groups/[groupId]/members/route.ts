// Group Members API - List, Add, Update, Remove members
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';
import { AddMemberInput, MemberRole } from '@/features/groups/types';

// GET /api/groups/[groupId]/members - List all members
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
    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Get all members with profiles
    const { data: members, error: membersError } = await adminClient
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('role', { ascending: true }) // Admins first
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Get user profiles
    const userIds = members?.map(m => m.user_id) || [];
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // For users not in profiles table, try to get from auth.users
    const missingUserIds = userIds.filter(id => !profileMap.has(id));
    if (missingUserIds.length > 0) {
      for (const userId of missingUserIds) {
        try {
          const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(userId);
          if (authUser) {
            const metadata = authUser.user_metadata || {};
            profileMap.set(userId, {
              id: userId,
              full_name: metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'User',
              avatar_url: metadata.avatar_url || metadata.picture || null,
              email: authUser.email
            });
          }
        } catch (e) {
          console.log(`Could not get auth user ${userId}:`, e);
        }
      }
    }

    const membersWithProfiles = members?.map(m => ({
      ...m,
      user: profileMap.get(m.user_id) || { id: m.user_id, full_name: 'User' }
    }));

    return NextResponse.json({
      success: true,
      members: membersWithProfiles || [],
      total: membersWithProfiles?.length || 0
    });

  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/groups/[groupId]/members - Add members
export async function POST(
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

    // Get group settings and check permissions
    const { data: group } = await adminClient
      .from('groups')
      .select('only_admins_can_add_members, max_members')
      .eq('id', groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member and has permission
    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    if (group.only_admins_can_add_members && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can add members to this group' }, { status: 403 });
    }

    const body = await request.json();
    const members: AddMemberInput[] = Array.isArray(body) ? body : [body];

    if (members.length === 0) {
      return NextResponse.json({ error: 'No members to add' }, { status: 400 });
    }

    // Check current member count
    const { count: currentCount } = await adminClient
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if ((currentCount || 0) + members.length > group.max_members) {
      return NextResponse.json({ 
        error: `Cannot add members. Group limit is ${group.max_members} members` 
      }, { status: 400 });
    }

    // Add members
    const newMembers = members.map(m => ({
      group_id: groupId,
      user_id: m.user_id,
      role: m.role || 'member',
      added_by: user.id
    }));

    const { data: addedMembers, error: addError } = await adminClient
      .from('group_members')
      .upsert(newMembers, { onConflict: 'group_id,user_id', ignoreDuplicates: true })
      .select();

    if (addError) {
      console.error('Error adding members:', addError);
      return NextResponse.json({ error: 'Failed to add members' }, { status: 500 });
    }

    // Add system message
    if (addedMembers && addedMembers.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name')
        .in('id', addedMembers.map(m => m.user_id));

      const names = profiles?.map(p => p.full_name || 'Someone').join(', ') || 'members';
      
      await adminClient
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content: `added ${names}`,
          message_type: 'system'
        });
    }

    return NextResponse.json({
      success: true,
      added: addedMembers?.length || 0
    });

  } catch (error) {
    console.error('Add members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/groups/[groupId]/members - Update member role
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
      return NextResponse.json({ error: 'Only admins can update member roles' }, { status: 403 });
    }

    const { user_id, role, is_muted, notifications_enabled } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (role !== undefined) updates.role = role;
    if (is_muted !== undefined) updates.is_muted = is_muted;
    if (notifications_enabled !== undefined) updates.notifications_enabled = notifications_enabled;

    const { data: updatedMember, error: updateError } = await adminClient
      .from('group_members')
      .update(updates)
      .eq('group_id', groupId)
      .eq('user_id', user_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating member:', updateError);
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
    }

    // Add system message for role change
    if (role !== undefined) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('full_name')
        .eq('id', user_id)
        .single();

      const action = role === 'admin' ? 'made admin' : 'removed as admin';
      await adminClient
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content: `${action}: ${profile?.full_name || 'member'}`,
          message_type: 'system'
        });
    }

    return NextResponse.json({
      success: true,
      member: updatedMember
    });

  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/groups/[groupId]/members - Remove member
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

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('user_id');

    if (!targetUserId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Check if user is leaving or removing someone
    const isLeaving = targetUserId === user.id;

    if (!isLeaving) {
      // Check if user is admin
      const { data: membership } = await adminClient
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (!membership || membership.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 });
      }
    }

    // Check if target is the creator
    const { data: group } = await adminClient
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single();

    if (group?.created_by === targetUserId && !isLeaving) {
      return NextResponse.json({ error: 'Cannot remove the group creator' }, { status: 403 });
    }

    // Get target user profile for system message
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', targetUserId)
      .single();

    // Remove member
    const { error: deleteError } = await adminClient
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', targetUserId);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    // Add system message
    const message = isLeaving 
      ? `${targetProfile?.full_name || 'Someone'} left the group`
      : `removed ${targetProfile?.full_name || 'member'}`;

    await adminClient
      .from('group_messages')
      .insert({
        group_id: groupId,
        sender_id: user.id,
        content: message,
        message_type: 'system'
      });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
