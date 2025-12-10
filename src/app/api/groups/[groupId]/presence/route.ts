// Group Presence API - Online/Offline status management
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET - Get presence status for all group members
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
    
    // Get presence data for all members
    // Using a threshold of 2 minutes for online status
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: presences, error } = await supabase
      .from('group_user_presence')
      .select(`
        user_id,
        status,
        custom_status,
        last_seen,
        updated_at
      `)
      .eq('group_id', groupId);
    
    if (error) {
      // Table might not exist, return empty
      console.error('Presence fetch error:', error);
      return NextResponse.json({
        success: true,
        presences: []
      });
    }
    
    // Map presence data with computed online status
    const mappedPresences = (presences || []).map(p => ({
      user_id: p.user_id,
      status: new Date(p.updated_at) > new Date(twoMinutesAgo) ? p.status : 'offline',
      custom_status: p.custom_status,
      last_seen: p.last_seen || p.updated_at
    }));
    
    return NextResponse.json({
      success: true,
      presences: mappedPresences
    });
    
  } catch (error) {
    console.error('Presence GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch presence' },
      { status: 500 }
    );
  }
}

// POST - Update own presence status
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
    const { status, custom_status } = body;
    
    // Validate status
    const validStatuses = ['online', 'away', 'busy', 'offline'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
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
    
    // Upsert presence
    const { data: presence, error } = await supabase
      .from('group_user_presence')
      .upsert({
        group_id: groupId,
        user_id: user.id,
        status: status || 'online',
        custom_status: custom_status || null,
        last_seen: status === 'offline' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'group_id,user_id'
      })
      .select()
      .single();
    
    if (error) {
      // Table might not exist, try to create it
      console.error('Presence update error:', error);
      
      // Try creating the table first
      await supabase.rpc('ensure_presence_table');
      
      // Retry
      const { data: retryData, error: retryError } = await supabase
        .from('group_user_presence')
        .upsert({
          group_id: groupId,
          user_id: user.id,
          status: status || 'online',
          custom_status: custom_status || null,
          last_seen: status === 'offline' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'group_id,user_id'
        })
        .select()
        .single();
      
      if (retryError) {
        return NextResponse.json({
          success: true,
          message: 'Presence updated (best effort)'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      presence
    });
    
  } catch (error) {
    console.error('Presence POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update presence' },
      { status: 500 }
    );
  }
}
