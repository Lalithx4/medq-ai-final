// Generate MiroTalk Token API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { 
  createJoinUrlWithAd,
  isMiroTalkConfigured,
  type AdData,
} from '@/lib/mirotalk/client';
import { adService } from '@/lib/ads/ad-service';

export async function POST(request: NextRequest) {
  console.log('\n🎥 === MIROTALK TOKEN API CALLED ===' );
  
  try {
    // Check if MiroTalk is configured
    if (!isMiroTalkConfigured()) {
      console.error('❌ MIROTALK_API_SECRET is not configured');
      return NextResponse.json({ 
        error: 'Video streaming is not configured. Missing MIROTALK_API_SECRET.' 
      }, { status: 500 });
    }

    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomCode, role = 'viewer' } = await request.json();

    if (!roomCode) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
    }

    // Verify room exists and user has access
    const { data: room, error: roomError } = await supabase
      .from('streaming_rooms')
      .select('id, host_id, status')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if room is accessible
    if (room.status === 'ended') {
      return NextResponse.json({ error: 'This room has ended' }, { status: 400 });
    }

    // Determine if user is host
    const isHost = room.host_id === user.id;
    const isPresenter = isHost || role === 'co-host';

    // Get user's profile from User table for targeting
    const { data: userProfile } = await supabase
      .from('User')
      .select('name, email, interests, location, image')
      .eq('id', user.id)
      .single();

    const userName = userProfile?.name || user.user_metadata?.name || user.email || 'Guest';

    // Select a targeted ad for this user/room context
    let adData: Awaited<ReturnType<typeof adService.selectTargetedAd>> = null;
    try {
      adData = await adService.selectTargetedAd({
        userId: user.id,
        userEmail: user.email || undefined,
        specialty: userProfile?.interests?.[0] || undefined, // First interest as specialty
        location: userProfile?.location || undefined,
        roomType: room.status === 'live' ? 'live' : 'consultation',
        roomId: roomCode,
      });
      if (adData) {
        console.log('📢 Targeted ad selected:', adData.sponsor);
      }
    } catch (adError) {
      console.error('Ad selection error (non-blocking):', adError);
      // Continue without ad - don't block the meeting
    }

    // Create meeting URL with embedded ad data in JWT token
    // This uses the custom token approach that MiroTalk expects
    console.log('🔑 Creating MiroTalk join URL for user:', userName);
    
    // Convert adData to the AdData format expected by MiroTalk
    const adPayload: AdData | null = adData ? {
      sponsor: adData.sponsor,
      sponsorLogo: adData.sponsorLogo,
      message: adData.message,
      url: adData.url,
      ctaText: adData.ctaText,
      impressionId: adData.impressionId,
      campaignId: adData.campaignId,
      trackingUrl: adData.trackingUrl,
    } : null;

    if (adPayload) {
      console.log('📦 [TOKEN API] Embedding Ad Payload:', JSON.stringify(adPayload, null, 2));
    } else {
      console.log('⚠️ [TOKEN API] No ad payload to embed');
    }

    const meetingUrl = createJoinUrlWithAd(
      roomCode,
      { 
        id: user.id, 
        name: userName, 
        email: user.email,
        image: userProfile?.image || user.user_metadata?.avatar_url || null,
      },
      isPresenter,
      adPayload
    );

    console.log('✅ MiroTalk join URL created with embedded ad token');
    console.log('🔗 Generated URL:', meetingUrl);

    const response = {
      success: true,
      meetingUrl,
      roomCode,
      isHost,
      isPresenter,
      ad: adData, // Also return ad data separately for client-side use
    };
    
    console.log('📤 [TOKEN API] Sending Response:', JSON.stringify(response, null, 2));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
