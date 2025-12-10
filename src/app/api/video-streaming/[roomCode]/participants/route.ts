// Participant Management API
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
      .select('id')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get participants
    const { data: participants, error: participantsError } = await supabase
      .from('streaming_participants')
      .select(`
        id,
        user_id,
        role,
        is_muted,
        is_video_on,
        hand_raised,
        is_in_waiting_room,
        joined_at
      `)
      .eq('room_id', room.id)
      .is('left_at', null)
      .order('joined_at', { ascending: true });

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
    }

    // Get user profiles
    const userIds = participants?.map(p => p.user_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const participantsWithProfiles = participants?.map(p => ({
      ...p,
      user: profileMap.get(p.user_id) || { id: p.user_id, email: 'Unknown' },
    }));

    return NextResponse.json({
      success: true,
      participants: participantsWithProfiles || [],
    });
  } catch (error) {
    console.error('Get participants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update participant (mute, kick, promote, etc.)
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

    const { participantId, action, value } = await request.json();

    // Get room and verify host
    const { data: room, error: roomError } = await supabase
      .from('streaming_rooms')
      .select('id, host_id')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get participant
    const { data: participant, error: participantError } = await supabase
      .from('streaming_participants')
      .select('*')
      .eq('id', participantId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Check permissions
    const isHost = room.host_id === user.id;
    const isSelf = participant.user_id === user.id;

    let updateData: any = {};

    switch (action) {
      case 'mute':
        if (!isHost && !isSelf) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }
        updateData = { is_muted: value !== false };
        break;

      case 'unmute':
        if (!isSelf) {
          return NextResponse.json({ error: 'Only user can unmute themselves' }, { status: 403 });
        }
        updateData = { is_muted: false };
        break;

      case 'toggle_video':
        if (!isSelf) {
          return NextResponse.json({ error: 'Only user can toggle their video' }, { status: 403 });
        }
        updateData = { is_video_on: !participant.is_video_on };
        break;

      case 'raise_hand':
        if (!isSelf) {
          return NextResponse.json({ error: 'Only user can raise their hand' }, { status: 403 });
        }
        updateData = { hand_raised: !participant.hand_raised };
        break;

      case 'lower_hand':
        if (!isHost && !isSelf) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }
        updateData = { hand_raised: false };
        break;

      case 'promote':
        if (!isHost) {
          return NextResponse.json({ error: 'Only host can promote' }, { status: 403 });
        }
        updateData = { role: 'co-host' };
        break;

      case 'demote':
        if (!isHost) {
          return NextResponse.json({ error: 'Only host can demote' }, { status: 403 });
        }
        updateData = { role: 'viewer' };
        break;

      case 'admit':
        if (!isHost) {
          return NextResponse.json({ error: 'Only host can admit from waiting room' }, { status: 403 });
        }
        updateData = { is_in_waiting_room: false };
        break;

      case 'kick':
        if (!isHost) {
          return NextResponse.json({ error: 'Only host can kick participants' }, { status: 403 });
        }
        updateData = { left_at: new Date().toISOString() };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('streaming_participants')
      .update(updateData)
      .eq('id', participantId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update participant' }, { status: 500 });
    }

    return NextResponse.json({ success: true, participant: updated });
  } catch (error) {
    console.error('Update participant error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
