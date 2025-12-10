// Group Event RSVP API - Update RSVP for an event
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// POST - RSVP to an event
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string; eventId: string } }
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
    
    const { groupId, eventId } = params;
    const body = await request.json();
    const { status } = body;
    
    // Validate status
    const validStatuses = ['yes', 'no', 'maybe'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid RSVP status' },
        { status: 400 }
      );
    }
    
    // Verify user is a member
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();
    
    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this group' },
        { status: 403 }
      );
    }
    
    // Verify event exists
    const { data: event } = await supabase
      .from('group_events')
      .select('id')
      .eq('id', eventId)
      .eq('group_id', groupId)
      .single();
    
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Upsert RSVP
    const { data: rsvp, error } = await supabase
      .from('group_event_rsvps')
      .upsert({
        id: crypto.randomUUID(),
        event_id: eventId,
        user_id: user.id,
        status,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'event_id,user_id'
      })
      .select()
      .single();
    
    if (error) {
      console.error('RSVP error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update RSVP' },
        { status: 500 }
      );
    }
    
    // Get updated RSVP counts
    const { data: allRsvps } = await supabase
      .from('group_event_rsvps')
      .select('status')
      .eq('event_id', eventId);
    
    const rsvpCounts = {
      yes: (allRsvps || []).filter(r => r.status === 'yes').length,
      no: (allRsvps || []).filter(r => r.status === 'no').length,
      maybe: (allRsvps || []).filter(r => r.status === 'maybe').length
    };
    
    return NextResponse.json({
      success: true,
      rsvp,
      rsvp_counts: rsvpCounts
    });
    
  } catch (error) {
    console.error('RSVP POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update RSVP' },
      { status: 500 }
    );
  }
}
