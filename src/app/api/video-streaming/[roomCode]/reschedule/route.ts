// Reschedule Meeting API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

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
    const { scheduled_at, scheduled_end_at, timezone } = body;

    // Validate required fields
    if (!scheduled_at) {
      return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 });
    }

    // Validate that the new time is in the future
    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ 
        error: 'Scheduled time must be in the future' 
      }, { status: 400 });
    }

    // Get the room and verify ownership
    const { data: room, error: roomError } = await supabase
      .from('streaming_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Verify the user is the host
    if (room.host_id !== user.id) {
      return NextResponse.json({ 
        error: 'Only the host can reschedule this meeting' 
      }, { status: 403 });
    }

    // Cannot reschedule a live or ended meeting
    if (room.status === 'live') {
      return NextResponse.json({ 
        error: 'Cannot reschedule a live meeting' 
      }, { status: 400 });
    }

    if (room.status === 'ended') {
      return NextResponse.json({ 
        error: 'Cannot reschedule an ended meeting' 
      }, { status: 400 });
    }

    // Update the room with new schedule
    const updateData: Record<string, any> = {
      scheduled_at,
      status: 'scheduled', // Reset status to scheduled
    };

    if (scheduled_end_at) {
      updateData.scheduled_end_at = scheduled_end_at;
    }

    if (timezone) {
      updateData.timezone = timezone;
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from('streaming_rooms')
      .update(updateData)
      .eq('id', room.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating room:', updateError);
      return NextResponse.json({ error: 'Failed to reschedule meeting' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      room: updatedRoom,
      message: 'Meeting rescheduled successfully',
    });
  } catch (error) {
    console.error('Reschedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
