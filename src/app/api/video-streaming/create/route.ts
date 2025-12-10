// Create Streaming Room API - Using MiroTalk SFU
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { CreateRoomInput } from '@/features/video-streaming/types';
import { 
  createMeeting, 
  generateUserToken, 
  extractRoomId, 
  buildMeetingUrl,
  isMiroTalkConfigured 
} from '@/lib/mirotalk/client';

export async function POST(request: NextRequest) {
  try {
    // Check if MiroTalk is configured
    if (!isMiroTalkConfigured()) {
      return NextResponse.json({ 
        error: 'Video streaming is not configured. Missing MIROTALK_API_SECRET.' 
      }, { status: 500 });
    }

    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateRoomInput = await request.json();
    const { 
      title, 
      description, 
      max_participants, 
      allow_chat, 
      allow_raise_hand, 
      waiting_room_enabled,
      is_scheduled,
      scheduled_at,
      scheduled_end_at,
      timezone,
    } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate scheduled time if provided
    if (is_scheduled && scheduled_at) {
      const scheduledDate = new Date(scheduled_at);
      if (scheduledDate <= new Date()) {
        return NextResponse.json({ 
          error: 'Scheduled time must be in the future' 
        }, { status: 400 });
      }
    }

    // Create MiroTalk meeting room
    console.log('🎥 Creating MiroTalk meeting...');
    const meetingResponse = await createMeeting();
    const miroTalkRoomId = extractRoomId(meetingResponse.meeting);
    console.log('✅ MiroTalk room created:', miroTalkRoomId);

    // Generate host token
    const { token: hostToken } = await generateUserToken(
      { id: user.id, name: user.user_metadata?.name, email: user.email },
      true, // isPresenter
      '4h' // 4 hour expiry
    );
    console.log('✅ Host token generated');

    // Generate unique room code for our database
    const roomCode = miroTalkRoomId; // Use MiroTalk room ID as our room code

    // Determine initial status based on scheduling
    const initialStatus = is_scheduled && scheduled_at ? 'scheduled' : 'waiting';

    // Create room in our database
    const { data: room, error: createError } = await supabase
      .from('streaming_rooms')
      .insert({
        host_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        room_code: roomCode,
        status: initialStatus,
        max_participants: max_participants || 100,
        allow_chat: allow_chat !== false,
        allow_raise_hand: allow_raise_hand !== false,
        waiting_room_enabled: waiting_room_enabled || false,
        scheduled_at: scheduled_at || null,
        scheduled_end_at: scheduled_end_at || null,
        timezone: timezone || 'UTC',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating room in database:', createError);
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }

    // Add host as participant
    await supabase
      .from('streaming_participants')
      .insert({
        room_id: room.id,
        user_id: user.id,
        role: 'host',
        is_muted: false,
        is_video_on: true,
      });

    // Build the full meeting URL with token
    const meetingUrl = buildMeetingUrl(roomCode, hostToken);

    return NextResponse.json({ 
      success: true, 
      room,
      roomCode,
      joinUrl: `/video-streaming/${roomCode}`,
      meetingUrl, // Direct MiroTalk URL for host
      hostToken,
    });
  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
