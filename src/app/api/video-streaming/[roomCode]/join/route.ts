// Join Streaming Room API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

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

    // Get room
    const { data: room, error: roomError } = await supabase
      .from('streaming_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if room has ended
    if (room.status === 'ended') {
      return NextResponse.json({ error: 'This room has ended' }, { status: 400 });
    }

    // Determine role
    const isHost = room.host_id === user.id;
    const role = isHost ? 'host' : 'viewer';

    // Check if already a participant
    const { data: existingParticipant } = await supabase
      .from('streaming_participants')
      .select('*')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .single();

    if (!existingParticipant) {
      // Add as participant
      const { error: joinError } = await supabase
        .from('streaming_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: role,
          is_muted: !isHost,
          is_video_on: isHost,
          is_in_waiting_room: room.waiting_room_enabled && !isHost,
        });

      if (joinError) {
        console.error('Error joining room:', joinError);
        return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      room,
      role,
      isHost,
      userId: user.id,
      isInWaitingRoom: room.waiting_room_enabled && !isHost && !existingParticipant,
    });
  } catch (error) {
    console.error('Join room error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
