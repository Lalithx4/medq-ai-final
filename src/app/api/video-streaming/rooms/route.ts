// List User's Streaming Rooms API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get rooms hosted by user
    let query = supabase
      .from('streaming_rooms')
      .select('*')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: hostedRooms, error: hostedError } = await query;

    if (hostedError) {
      console.error('Error fetching hosted rooms:', hostedError);
    }

    // Get rooms user participated in
    const { data: participatedRooms, error: participatedError } = await supabase
      .from('streaming_participants')
      .select(`
        room:streaming_rooms (*)
      `)
      .eq('user_id', user.id)
      .neq('role', 'host')
      .order('joined_at', { ascending: false })
      .limit(limit);

    if (participatedError) {
      console.error('Error fetching participated rooms:', participatedError);
    }

    // Get participant counts for hosted rooms
    const roomsWithCounts = await Promise.all(
      (hostedRooms || []).map(async (room) => {
        const { count } = await supabase
          .from('streaming_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .is('left_at', null);

        return { ...room, participant_count: count || 0 };
      })
    );

    return NextResponse.json({
      success: true,
      hosted: roomsWithCounts || [],
      participated: (participatedRooms || [])
        .map(p => p.room)
        .filter(Boolean),
    });
  } catch (error) {
    console.error('List rooms error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
