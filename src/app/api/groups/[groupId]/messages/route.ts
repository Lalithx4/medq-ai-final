// Group Messages API - List and Send messages
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';
import { SendMessageInput } from '@/features/groups/types';
import { getSignedFileUrl } from '@/lib/wasabi/client';

// GET /api/groups/[groupId]/messages - List messages with pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await getServerSupabase();
    const adminClient = getServiceRoleSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a member
    const { data: membership } = await adminClient
      .from('group_members')
      .select('role, last_read_at')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor'); // ISO timestamp for pagination

    // Build query
    let query = adminClient
      .from('group_messages')
      .select(`
        *,
        reply_to:reply_to_id(id, content, sender_id, message_type),
        media:group_media(*)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Get one extra to check if there are more

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Check if there are more messages
    const hasMore = messages && messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    // Get sender profiles
    const senderIds = [...new Set(resultMessages?.map(m => m.sender_id) || [])];
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', senderIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // For users not in profiles table, try to get from auth.users
    const missingUserIds = senderIds.filter(id => !profileMap.has(id));
    if (missingUserIds.length > 0) {
      // Try to get user info from auth admin API
      for (const userId of missingUserIds) {
        try {
          const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(userId);
          if (authUser) {
            const metadata = authUser.user_metadata || {};
            profileMap.set(userId, {
              id: userId,
              full_name: metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'User',
              avatar_url: metadata.avatar_url || metadata.picture || null,
              email: authUser.email
            });
          }
        } catch (e) {
          console.log(`Could not get auth user ${userId}:`, e);
        }
      }
    }

    // Process messages and refresh signed URLs for media
    const processedMessages = await Promise.all(
      (resultMessages || []).map(async (m) => {
        // Refresh signed URLs for media attachments
        let mediaWithSignedUrls = m.media || [];
        if (mediaWithSignedUrls.length > 0) {
          mediaWithSignedUrls = await Promise.all(
            mediaWithSignedUrls.map(async (mediaItem: { file_key?: string; file_url?: string }) => {
              if (mediaItem.file_key) {
                try {
                  const signedUrl = await getSignedFileUrl(mediaItem.file_key, 3600); // 1 hour
                  return { ...mediaItem, file_url: signedUrl };
                } catch (error) {
                  console.error('Error refreshing signed URL:', error);
                  return mediaItem;
                }
              }
              return mediaItem;
            })
          );
        }

        return {
          ...m,
          media: mediaWithSignedUrls,
          sender: profileMap.get(m.sender_id) || { id: m.sender_id, full_name: 'User' },
          reply_to: m.reply_to ? {
            ...m.reply_to,
            sender: profileMap.get(m.reply_to.sender_id) || { id: m.reply_to.sender_id, full_name: 'User' }
          } : null
        };
      })
    );
    
    // Reverse to show oldest first
    processedMessages.reverse();

    // Update last_read_at
    await adminClient
      .from('group_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      messages: processedMessages,
      hasMore,
      cursor: hasMore && resultMessages ? resultMessages[resultMessages.length - 1].created_at : null
    });

  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/groups/[groupId]/messages - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await getServerSupabase();
    const adminClient = getServiceRoleSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check membership and group settings
    const { data: group } = await adminClient
      .from('groups')
      .select('only_admins_can_message')
      .eq('id', groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    if (group.only_admins_can_message && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can send messages in this group' }, { status: 403 });
    }

    const body: SendMessageInput = await request.json();
    const { content, message_type = 'text', reply_to_id, metadata } = body;

    if (!content && message_type === 'text') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Create message
    const { data: message, error: createError } = await adminClient
      .from('group_messages')
      .insert({
        group_id: groupId,
        sender_id: user.id,
        content: content?.trim() || null,
        message_type,
        reply_to_id: reply_to_id || null,
        metadata: metadata || {}
      })
      .select(`
        *,
        reply_to:reply_to_id(id, content, sender_id, message_type)
      `)
      .single();

    if (createError) {
      console.error('Error creating message:', createError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Get sender profile - try profiles table first, then auth.users
    let senderProfile: { id: string; full_name: string; avatar_url: string | null; email: string | null } | null = null;
    const { data: profileData } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .eq('id', user.id)
      .single();
    
    if (profileData) {
      senderProfile = profileData;
    } else {
      // Fallback to auth.users metadata
      try {
        const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(user.id);
        if (authUser) {
          const metadata = authUser.user_metadata || {};
          senderProfile = {
            id: user.id,
            full_name: metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'User',
            avatar_url: metadata.avatar_url || metadata.picture || null,
            email: authUser.email || null
          };
        }
      } catch (e) {
        console.log('Could not get auth user:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: {
        ...message,
        sender: senderProfile || { id: user.id, full_name: 'User' }
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
