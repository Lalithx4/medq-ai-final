// Group Typing Indicator API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';

// POST /api/groups/[groupId]/typing - Start typing indicator
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await getServerSupabase();
    const adminClient = getServiceRoleSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check membership
    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Upsert typing indicator
    const { error: upsertError } = await adminClient
      .from('group_typing_indicators')
      .upsert({
        group_id: groupId,
        user_id: user.id,
        started_at: new Date().toISOString()
      }, {
        onConflict: 'group_id,user_id'
      });

    if (upsertError) {
      console.error('Error setting typing indicator:', upsertError);
      return NextResponse.json({ error: 'Failed to set typing indicator' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Typing indicator error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/groups/[groupId]/typing - Stop typing indicator
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await getServerSupabase();
    const adminClient = getServiceRoleSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete typing indicator
    await adminClient
      .from('group_typing_indicators')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Stop typing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/groups/[groupId]/typing - Get current typing users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await getServerSupabase();
    const adminClient = getServiceRoleSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check membership
    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Get typing indicators (only within last 10 seconds)
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    
    const { data: typing, error: typingError } = await adminClient
      .from('group_typing_indicators')
      .select('*')
      .eq('group_id', groupId)
      .neq('user_id', user.id) // Don't include current user
      .gt('started_at', tenSecondsAgo);

    if (typingError) {
      console.error('Error fetching typing indicators:', typingError);
      return NextResponse.json({ error: 'Failed to fetch typing indicators' }, { status: 500 });
    }

    // Get user profiles
    const userIds = typing?.map(t => t.user_id) || [];
    let profiles: any[] = [];
    
    if (userIds.length > 0) {
      const { data: profileData } = await adminClient
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      profiles = profileData || [];
    }

    const profileMap = new Map(profiles.map(p => [p.id, p]));
    
    const typingWithProfiles = typing?.map(t => ({
      ...t,
      user: profileMap.get(t.user_id) || { id: t.user_id, full_name: 'Someone' }
    })) || [];

    return NextResponse.json({
      success: true,
      typing: typingWithProfiles
    });

  } catch (error) {
    console.error('Get typing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
