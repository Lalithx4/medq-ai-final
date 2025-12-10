// Get Room Details API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    // Get room details
    const { data: room, error: roomError } = await supabase
      .from('streaming_rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get participant count
    const { count: participantCount } = await supabase
      .from('streaming_participants')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)
      .is('left_at', null);

    // Get host info
    const { data: host } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('id', room.host_id)
      .single();

    return NextResponse.json({
      success: true,
      room: {
        ...room,
        host,
        participant_count: participantCount || 0,
      },
      isHost: user?.id === room.host_id,
    });
  } catch (error) {
    console.error('Get room error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update room (start/end stream)
export async function PATCH(
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

    const body = await request.json();
    const { action } = body;

    // Get room
    const { data: room, error: roomError } = await supabase
      .from('streaming_rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Only host can control the room
    if (room.host_id !== user.id) {
      return NextResponse.json({ error: 'Only host can control the room' }, { status: 403 });
    }

    let updateData: any = {};

    switch (action) {
      case 'start':
        if (room.status !== 'waiting') {
          return NextResponse.json({ error: 'Room already started or ended' }, { status: 400 });
        }
        updateData = { status: 'live', started_at: new Date().toISOString() };
        break;

      case 'end':
        if (room.status === 'ended') {
          return NextResponse.json({ error: 'Room already ended' }, { status: 400 });
        }
        const duration = room.started_at 
          ? Math.floor((Date.now() - new Date(room.started_at).getTime()) / 1000)
          : 0;
        updateData = { 
          status: 'ended', 
          ended_at: new Date().toISOString(),
          total_duration_seconds: duration
        };
        break;

      case 'toggle_recording':
        updateData = { is_recording: !room.is_recording };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from('streaming_rooms')
      .update(updateData)
      .eq('id', room.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
    }

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error) {
    console.error('Update room error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete room
export async function DELETE(
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

    // Delete room (only host)
    const { error: deleteError } = await supabase
      .from('streaming_rooms')
      .delete()
      .eq('room_code', roomCode.toUpperCase())
      .eq('host_id', user.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
