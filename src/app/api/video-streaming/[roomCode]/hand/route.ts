// Hand Raise API Route
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ roomCode: string }>;
}

// Toggle hand raise
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Check if hand raising is allowed
    if (!room.allow_raise_hand) {
      return NextResponse.json({ error: 'Hand raising is disabled for this room' }, { status: 403 });
    }

    // Get participant
    const { data: participant, error: participantError } = await supabase
      .from('streaming_participants')
      .select('*')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'You are not in this room' }, { status: 403 });
    }

    // Toggle hand_raised
    const newHandRaised = !participant.hand_raised;

    const { data: updatedParticipant, error: updateError } = await supabase
      .from('streaming_participants')
      .update({ 
        hand_raised: newHandRaised,
        updated_at: new Date().toISOString()
      })
      .eq('id', participant.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to toggle hand' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      handRaised: newHandRaised,
      participant: updatedParticipant
    });
  } catch (error) {
    console.error('Hand toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
