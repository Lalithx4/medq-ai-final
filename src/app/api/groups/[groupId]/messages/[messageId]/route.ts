// Single Message API - Edit, Delete
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';

// PUT /api/groups/[groupId]/messages/[messageId] - Edit message
export async function PUT(
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

    // Get the message
    const { data: message } = await adminClient
      .from('group_messages')
      .select('sender_id, message_type')
      .eq('id', messageId)
      .eq('group_id', groupId)
      .single();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.sender_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 });
    }

    if (message.message_type !== 'text') {
      return NextResponse.json({ error: 'Only text messages can be edited' }, { status: 400 });
    }

    const { content } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const { data: updatedMessage, error: updateError } = await adminClient
      .from('group_messages')
      .update({
        content: content.trim(),
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating message:', updateError);
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage
    });

  } catch (error) {
    console.error('Edit message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/groups/[groupId]/messages/[messageId] - Delete message
export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const forEveryone = searchParams.get('forEveryone') === 'true';

    // Get the message
    const { data: message } = await adminClient
      .from('group_messages')
      .select('sender_id')
      .eq('id', messageId)
      .eq('group_id', groupId)
      .single();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user can delete for everyone
    if (forEveryone) {
      const { data: membership } = await adminClient
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (message.sender_id !== user.id && membership?.role !== 'admin') {
        return NextResponse.json({ 
          error: 'Only message sender or admins can delete for everyone' 
        }, { status: 403 });
      }
    } else if (message.sender_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }

    // Soft delete
    const { error: updateError } = await adminClient
      .from('group_messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_for_everyone: forEveryone,
        content: forEveryone ? 'This message was deleted' : null
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error deleting message:', updateError);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
