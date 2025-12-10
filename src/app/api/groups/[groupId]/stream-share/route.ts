// Group Stream Share API - Share video streams to group
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';
import { ShareStreamInput } from '@/features/groups/types';

// POST /api/groups/[groupId]/stream-share - Share a stream to the group
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

    const body: ShareStreamInput = await request.json();
    const { stream_room_id, message } = body;

    if (!stream_room_id) {
      return NextResponse.json({ error: 'stream_room_id is required' }, { status: 400 });
    }

    // Get stream details
    const { data: stream, error: streamError } = await adminClient
      .from('streaming_rooms')
      .select('id, title, description, room_code, status, host_id')
      .eq('id', stream_room_id)
      .single();

    if (streamError || !stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    // Check if user has access to this stream (is host or participant)
    const { data: streamParticipant } = await adminClient
      .from('streaming_participants')
      .select('id')
      .eq('room_id', stream_room_id)
      .eq('user_id', user.id)
      .single();

    if (!streamParticipant && stream.host_id !== user.id) {
      return NextResponse.json({ 
        error: 'You can only share streams you are participating in' 
      }, { status: 403 });
    }

    // Create message with stream share type
    const { data: groupMessage, error: messageError } = await adminClient
      .from('group_messages')
      .insert({
        group_id: groupId,
        sender_id: user.id,
        content: message?.trim() || `Shared a live stream: ${stream.title}`,
        message_type: 'stream_share',
        metadata: {
          stream_room_id: stream.id,
          stream_title: stream.title,
          room_code: stream.room_code,
          stream_status: stream.status
        }
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating stream share message:', messageError);
      return NextResponse.json({ error: 'Failed to share stream' }, { status: 500 });
    }

    // Create stream share record
    const { data: streamShare, error: shareError } = await adminClient
      .from('group_stream_shares')
      .insert({
        group_id: groupId,
        message_id: groupMessage.id,
        stream_room_id: stream.id,
        shared_by: user.id,
        stream_title: stream.title,
        stream_description: stream.description,
        room_code: stream.room_code
      })
      .select()
      .single();

    if (shareError) {
      console.error('Error creating stream share record:', shareError);
      // Don't fail, the message is already created
    }

    // Get sender profile
    const { data: senderProfile } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: {
        ...groupMessage,
        sender: senderProfile || { id: user.id, full_name: 'Unknown' },
        stream_share: {
          ...streamShare,
          stream_room: stream
        }
      },
      share: streamShare
    });

  } catch (error) {
    console.error('Share stream error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/groups/[groupId]/stream-share - Get all shared streams in group
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

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // Get stream shares
    let query = adminClient
      .from('group_stream_shares')
      .select(`
        *,
        stream_room:streaming_rooms(id, title, description, room_code, status, host_id)
      `)
      .eq('group_id', groupId)
      .order('shared_at', { ascending: false });

    const { data: shares, error: sharesError } = await query;

    if (sharesError) {
      console.error('Error fetching stream shares:', sharesError);
      return NextResponse.json({ error: 'Failed to fetch stream shares' }, { status: 500 });
    }

    // Filter active streams if requested
    let filteredShares = shares || [];
    if (activeOnly) {
      filteredShares = filteredShares.filter(
        s => s.stream_room?.status === 'live' || s.stream_room?.status === 'waiting'
      );
    }

    // Get sharer profiles
    const sharerIds = [...new Set(filteredShares.map(s => s.shared_by))];
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', sharerIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const sharesWithProfiles = filteredShares.map(s => ({
      ...s,
      sharer: profileMap.get(s.shared_by) || { id: s.shared_by, full_name: 'Unknown' }
    }));

    return NextResponse.json({
      success: true,
      shares: sharesWithProfiles
    });

  } catch (error) {
    console.error('Get stream shares error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
