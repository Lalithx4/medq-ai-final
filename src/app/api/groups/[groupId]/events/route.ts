// Group Events API - List and Create Events
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// GET - List events for a group
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { groupId } = params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Verify user is a member
    const { data: membership } = await supabase
      .from('group_members')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();
    
    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this group' },
        { status: 403 }
      );
    }
    
    // Build query
    let query = supabase
      .from('group_events')
      .select(`
        *,
        creator:profiles!group_events_created_by_fkey(id, full_name, avatar_url),
        rsvps:group_event_rsvps(
          id,
          user_id,
          status,
          user:profiles!group_event_rsvps_user_id_fkey(id, full_name, avatar_url)
        )
      `)
      .eq('group_id', groupId)
      .order('start_time', { ascending: true })
      .limit(limit);
    
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('end_time', endDate);
    }
    
    const { data: events, error } = await query;
    
    if (error) {
      console.error('Events fetch error:', error);
      return NextResponse.json({
        success: true,
        events: []
      });
    }
    
    // Process events to add computed fields
    const processedEvents = (events || []).map(event => {
      const rsvps = event.rsvps || [];
      const userRsvp = rsvps.find((r: any) => r.user_id === user.id);
      
      return {
        ...event,
        rsvp_counts: {
          yes: rsvps.filter((r: any) => r.status === 'yes').length,
          no: rsvps.filter((r: any) => r.status === 'no').length,
          maybe: rsvps.filter((r: any) => r.status === 'maybe').length
        },
        user_rsvp: userRsvp?.status
      };
    });
    
    return NextResponse.json({
      success: true,
      events: processedEvents
    });
    
  } catch (error) {
    console.error('Events GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST - Create a new event
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { groupId } = params;
    const body = await request.json();
    
    const {
      title,
      description,
      location,
      location_type,
      meeting_link,
      start_time,
      end_time,
      all_day,
      recurrence,
      reminder_minutes,
      color
    } = body;
    
    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }
    
    if (!start_time || !end_time) {
      return NextResponse.json(
        { success: false, error: 'Start and end time are required' },
        { status: 400 }
      );
    }
    
    // Verify user is a member
    const { data: membership } = await supabase
      .from('group_members')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();
    
    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this group' },
        { status: 403 }
      );
    }
    
    // Create event
    const eventId = crypto.randomUUID();
    const { data: event, error } = await supabase
      .from('group_events')
      .insert({
        id: eventId,
        group_id: groupId,
        created_by: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        location_type: location_type || 'virtual',
        meeting_link: meeting_link?.trim() || null,
        start_time,
        end_time,
        all_day: all_day || false,
        recurrence: recurrence || null,
        reminder_minutes: reminder_minutes || 15,
        color: color || '#3B82F6'
      })
      .select(`
        *,
        creator:profiles!group_events_created_by_fkey(id, full_name, avatar_url)
      `)
      .single();
    
    if (error) {
      console.error('Event create error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create event' },
        { status: 500 }
      );
    }
    
    // Auto-RSVP creator as 'yes'
    await supabase
      .from('group_event_rsvps')
      .insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        user_id: user.id,
        status: 'yes'
      });
    
    return NextResponse.json({
      success: true,
      event: {
        ...event,
        rsvp_counts: { yes: 1, no: 0, maybe: 0 },
        user_rsvp: 'yes'
      }
    });
    
  } catch (error) {
    console.error('Events POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
