// Join Group via Invite Code API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';

// POST /api/groups/join/[inviteCode] - Join a group via invite link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    const { inviteCode } = await params;
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS
    const adminClient = getServiceRoleSupabase();

    // Find group by invite code
    const { data: group, error: groupError } = await adminClient
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    }

    if (!group.invite_link_enabled) {
      return NextResponse.json({ error: 'This invite link has been disabled' }, { status: 403 });
    }

    // Check if already a member
    const { data: existingMember } = await adminClient
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json({
        success: true,
        message: 'You are already a member of this group',
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          avatar_url: group.avatar_url
        },
        already_member: true
      });
    }

    // Check member count
    const { count: memberCount } = await adminClient
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id);

    if ((memberCount || 0) >= group.max_members) {
      return NextResponse.json({ error: 'This group is full' }, { status: 403 });
    }

    // Add user as member
    const { data: membership, error: memberError } = await adminClient
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'member'
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error joining group:', memberError);
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
    }

    // Get user profile for system message
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Add system message
    await adminClient
      .from('group_messages')
      .insert({
        group_id: group.id,
        sender_id: user.id,
        content: `${profile?.full_name || 'Someone'} joined via invite link`,
        message_type: 'system'
      });

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        avatar_url: group.avatar_url
      },
      membership
    });

  } catch (error) {
    console.error('Join group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/groups/join/[inviteCode] - Get group info before joining
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    const { inviteCode } = await params;
    const supabase = await getServerSupabase();
    
    // Don't require auth for viewing group info
    const { data: { user } } = await supabase.auth.getUser();

    // Use service role to bypass RLS
    const adminClient = getServiceRoleSupabase();

    // Find group by invite code
    const { data: group, error: groupError } = await adminClient
      .from('groups')
      .select('id, name, description, avatar_url, invite_link_enabled, max_members')
      .eq('invite_code', inviteCode)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    }

    if (!group.invite_link_enabled) {
      return NextResponse.json({ error: 'This invite link has been disabled' }, { status: 403 });
    }

    // Get member count
    const { count: memberCount } = await adminClient
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id);

    // Check if user is already a member
    let isMember = false;
    if (user) {
      const { data: membership } = await adminClient
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .single();
      
      isMember = !!membership;
    }

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        avatar_url: group.avatar_url,
        member_count: memberCount || 0,
        max_members: group.max_members,
        is_full: (memberCount || 0) >= group.max_members
      },
      is_member: isMember,
      is_authenticated: !!user
    });

  } catch (error) {
    console.error('Get group info error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
