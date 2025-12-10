// Group Member API - Update or Remove specific member
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';

// PUT /api/groups/[groupId]/members/[userId] - Update member role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  try {
    const { groupId, userId } = await params;
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

    const body = await request.json();
    const { role, is_muted, notifications_enabled } = body;

    const updates: Record<string, any> = {};
    if (role !== undefined) updates.role = role;
    if (is_muted !== undefined) updates.is_muted = is_muted;
    if (notifications_enabled !== undefined) updates.notifications_enabled = notifications_enabled;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data: updatedMember, error: updateError } = await adminClient
      .from('group_members')
      .update(updates)
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating member:', updateError);
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
    }

    // Add system message for role change
    if (role) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      const name = profile?.full_name || 'Someone';
      const action = role === 'admin' ? 'is now an admin' : 'is no longer an admin';
      
      await adminClient
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content: `${name} ${action}`,
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

// DELETE /api/groups/[groupId]/members/[userId] - Remove member or leave group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  try {
    const { groupId, userId } = await params;
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS
    const adminClient = getServiceRoleSupabase();

    // Check if user is leaving themselves or an admin removing someone
    const isSelf = user.id === userId;

    if (!isSelf) {
      // Check if requesting user is admin
      const { data: membership } = await adminClient
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (!membership || membership.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can remove other members' }, { status: 403 });
      }
    }

    // Check target member exists
    const { data: targetMember } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // If removing an admin, check if there are other admins
    if (targetMember.role === 'admin') {
      const { count: adminCount } = await adminClient
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('role', 'admin');

      if ((adminCount || 0) <= 1) {
        return NextResponse.json({ 
          error: 'Cannot remove the last admin. Promote another member to admin first.' 
        }, { status: 400 });
      }
    }

    // Get profile for system message
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();
    
    const name = profile?.full_name || 'Someone';

    // Remove member
    const { error: deleteError } = await adminClient
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    // Add system message
    const content = isSelf ? `${name} left the group` : `${name} was removed`;
    await adminClient
      .from('group_messages')
      .insert({
        group_id: groupId,
        sender_id: user.id,
        content,
        message_type: 'system'
      });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
