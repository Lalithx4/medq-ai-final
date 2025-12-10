// Message Reactions API - Get and Toggle reactions
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';

// GET /api/groups/[groupId]/messages/[messageId]/reactions - Get all reactions for a message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; messageId: string }> }
) {
  try {
    const { groupId, messageId } = await params;
    const supabase = await getServerSupabase();
    const adminClient = getServiceRoleSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify membership
    const { data: membership } = await adminClient
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Get reactions with user info
    const { data: reactions, error: reactionsError } = await adminClient
      .from('group_message_reactions')
      .select('id, emoji, user_id, created_at')
      .eq('message_id', messageId);

    if (reactionsError) {
      console.error('Error fetching reactions:', reactionsError);
      return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
    }

    // Get user profiles for reactions
    const userIds = [...new Set(reactions?.map(r => r.user_id) || [])];
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Group by emoji with counts and user info
    const reactionCounts: Record<string, {
      emoji: string;
      count: number;
      users: { id: string; name: string }[];
      hasReacted: boolean;
    }> = {};

    for (const r of reactions || []) {
      const emoji = r.emoji;
      if (!reactionCounts[emoji]) {
        reactionCounts[emoji] = {
          emoji,
          count: 0,
          users: [],
          hasReacted: false
        };
      }
      reactionCounts[emoji].count += 1;
      
      const profile = profileMap.get(r.user_id);
      reactionCounts[emoji].users.push({ 
        id: r.user_id, 
        name: profile?.full_name || 'User' 
      });
      
      if (r.user_id === user.id) {
        reactionCounts[emoji].hasReacted = true;
      }
    }

    return NextResponse.json({
      success: true,
      reactions: Object.values(reactionCounts)
    });

  } catch (error) {
    console.error('Get reactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/groups/[groupId]/messages/[messageId]/reactions - Toggle a reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; messageId: string }> }
) {
  try {
    const { groupId, messageId } = await params;
    const supabase = await getServerSupabase();
    const adminClient = getServiceRoleSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emoji } = await request.json();

    if (!emoji || emoji.trim().length === 0) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    // Verify the message exists and user is a member
    const { data: message } = await adminClient
      .from('group_messages')
      .select('id')
      .eq('id', messageId)
      .eq('group_id', groupId)
      .single();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const { data: membership } = await adminClient
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Check if reaction already exists
    const { data: existing } = await adminClient
      .from('group_message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji.trim())
      .single();

    let action: 'added' | 'removed';

    if (existing) {
      // Remove reaction
      const { error: deleteError } = await adminClient
        .from('group_message_reactions')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        console.error('Error removing reaction:', deleteError);
        return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
      }
      action = 'removed';
    } else {
      // Add reaction
      const { error: insertError } = await adminClient
        .from('group_message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji: emoji.trim()
        });

      if (insertError) {
        console.error('Error adding reaction:', insertError);
        return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
      }
      action = 'added';
    }

    // Get updated reactions
    const { data: reactions } = await adminClient
      .from('group_message_reactions')
      .select('id, emoji, user_id')
      .eq('message_id', messageId);

    // Group by emoji
    const reactionCounts: Record<string, {
      emoji: string;
      count: number;
      users: { id: string }[];
      hasReacted: boolean;
    }> = {};

    for (const r of reactions || []) {
      const emojiKey = r.emoji;
      if (!reactionCounts[emojiKey]) {
        reactionCounts[emojiKey] = {
          emoji: emojiKey,
          count: 0,
          users: [],
          hasReacted: false
        };
      }
      reactionCounts[emojiKey].count += 1;
      reactionCounts[emojiKey].users.push({ id: r.user_id });
      if (r.user_id === user.id) {
        reactionCounts[emojiKey].hasReacted = true;
      }
    }

    return NextResponse.json({
      success: true,
      action,
      reactions: Object.values(reactionCounts)
    });

  } catch (error) {
    console.error('Toggle reaction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
