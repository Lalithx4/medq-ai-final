// Chat Messages API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get room
    const { data: room, error: roomError } = await supabase
      .from('streaming_rooms')
      .select('id, allow_chat')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (!room.allow_chat) {
      return NextResponse.json({ error: 'Chat is disabled in this room' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const before = searchParams.get('before');

    // Get messages
    let query = supabase
      .from('stream_chat_messages')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Get user profiles
    const userIds = [...new Set(messages?.map(m => m.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const messagesWithProfiles = messages?.map(m => ({
      ...m,
      user: profileMap.get(m.user_id) || { id: m.user_id, full_name: 'Unknown' },
    })).reverse(); // Reverse to show oldest first

    return NextResponse.json({
      success: true,
      messages: messagesWithProfiles || [],
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await request.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get room
    const { data: room, error: roomError } = await supabase
      .from('streaming_rooms')
      .select('id, allow_chat, status')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (!room.allow_chat) {
      return NextResponse.json({ error: 'Chat is disabled in this room' }, { status: 403 });
    }

    if (room.status === 'ended') {
      return NextResponse.json({ error: 'Room has ended' }, { status: 400 });
    }

    // Verify user is a participant
    const { data: participant } = await supabase
      .from('streaming_participants')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'You must join the room to chat' }, { status: 403 });
    }

    // Insert message
    const { data: newMessage, error: insertError } = await supabase
      .from('stream_chat_messages')
      .insert({
        room_id: room.id,
        user_id: user.id,
        message: message.trim(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: {
        ...newMessage,
        user: profile || { full_name: 'Unknown' },
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
