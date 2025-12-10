// Pinned Messages API - Get all pinned messages in a group
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';

// GET /api/groups/[groupId]/pinned - Get all pinned messages
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

    // Verify membership
    const { data: membership } = await adminClient
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Get pinned messages
    const { data: messages, error: messagesError } = await adminClient
      .from('group_messages')
      .select(`
        *,
        reply_to:reply_to_id(id, content, sender_id, message_type),
        media:group_media(*)
      `)
      .eq('group_id', groupId)
      .eq('is_pinned', true)
      .order('pinned_at', { ascending: false });

    if (messagesError) {
      console.error('Error fetching pinned messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch pinned messages' }, { status: 500 });
    }

    // Get sender profiles
    const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', senderIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Enrich messages with sender info
    const enrichedMessages = (messages || []).map(m => ({
      ...m,
      sender: profileMap.get(m.sender_id) || { id: m.sender_id, full_name: 'User' }
    }));

    return NextResponse.json({
      success: true,
      messages: enrichedMessages
    });

  } catch (error) {
    console.error('Get pinned messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
