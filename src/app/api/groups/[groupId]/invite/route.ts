// Group Invite API - Generate and manage invite links
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';

// GET /api/groups/[groupId]/invite - Get invite link
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

    // Get group with invite code
    const { data: group, error: groupError } = await adminClient
      .from('groups')
      .select('id, name, invite_code, invite_link_enabled')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (!group.invite_link_enabled) {
      return NextResponse.json({ error: 'Invite link is disabled for this group' }, { status: 403 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/groups/join/${group.invite_code}`;

    return NextResponse.json({
      success: true,
      invite_code: group.invite_code,
      invite_link: inviteLink,
      group_name: group.name
    });

  } catch (error) {
    console.error('Get invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/groups/[groupId]/invite - Regenerate invite code (admin only)
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

    // Check if user is admin
    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can regenerate invite links' }, { status: 403 });
    }

    // Generate new invite code
    const newInviteCode = generateInviteCode();

    const { data: updatedGroup, error: updateError } = await adminClient
      .from('groups')
      .update({ 
        invite_code: newInviteCode,
        invite_link_enabled: true 
      })
      .eq('id', groupId)
      .select('id, name, invite_code, invite_link_enabled')
      .single();

    if (updateError) {
      console.error('Error regenerating invite:', updateError);
      return NextResponse.json({ error: 'Failed to regenerate invite' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/groups/join/${updatedGroup.invite_code}`;

    return NextResponse.json({
      success: true,
      invite_code: updatedGroup.invite_code,
      invite_link: inviteLink
    });

  } catch (error) {
    console.error('Regenerate invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/groups/[groupId]/invite - Disable invite link (admin only)
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

    // Check if user is admin
    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can disable invite links' }, { status: 403 });
    }

    const { error: updateError } = await adminClient
      .from('groups')
      .update({ invite_link_enabled: false })
      .eq('id', groupId);

    if (updateError) {
      console.error('Error disabling invite:', updateError);
      return NextResponse.json({ error: 'Failed to disable invite' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Disable invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
