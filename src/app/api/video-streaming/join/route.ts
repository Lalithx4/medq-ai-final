// Join Streaming Room API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomCode } = await request.json();

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
    }

    // Get room details - simple query without auth.users join
    const { data: room, error: roomError } = await supabase
      .from('streaming_rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (roomError) {
      console.error('Room query error:', roomError);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'ended') {
      return NextResponse.json({ error: 'This room has ended' }, { status: 400 });
    }

    // Check participant count
    const { count } = await supabase
      .from('streaming_participants')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)
      .is('left_at', null);

    if (count && count >= room.max_participants) {
      return NextResponse.json({ error: 'Room is full' }, { status: 400 });
    }

    // Check if already a participant
    const { data: existingParticipant } = await supabase
      .from('streaming_participants')
      .select('id, role, is_in_waiting_room')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .single();

    let participantRole = 'viewer';
    let isInWaitingRoom = false;
    
    if (existingParticipant) {
      // Update left_at to null (rejoin)
      await supabase
        .from('streaming_participants')
        .update({ left_at: null, joined_at: new Date().toISOString() })
        .eq('id', existingParticipant.id);
      
      participantRole = existingParticipant.role;
      isInWaitingRoom = existingParticipant.is_in_waiting_room || false;
    } else {
      // Check if this is the host
      if (room.host_id === user.id) {
        participantRole = 'host';
      }

      // Determine if should go to waiting room
      isInWaitingRoom = room.waiting_room_enabled && participantRole === 'viewer';

      // Add as new participant
      const { error: joinError } = await supabase
        .from('streaming_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: participantRole,
          is_in_waiting_room: isInWaitingRoom,
        });

      if (joinError && !joinError.message.includes('duplicate')) {
        console.error('Join error:', joinError);
        return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        title: room.title,
        description: room.description,
        room_code: room.room_code,
        status: room.status,
        host_id: room.host_id,
        allow_chat: room.allow_chat,
        allow_raise_hand: room.allow_raise_hand,
        waiting_room_enabled: room.waiting_room_enabled,
      },
      role: participantRole,
      isInWaitingRoom: isInWaitingRoom,
      userId: user.id,
    });
  } catch (error) {
    console.error('Join room error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
