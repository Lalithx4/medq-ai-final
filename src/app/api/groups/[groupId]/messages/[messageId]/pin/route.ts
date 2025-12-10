// Pin/Unpin Message API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';

// POST /api/groups/[groupId]/messages/[messageId]/pin - Pin a message
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

    // Verify user is admin/owner
    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only admins can pin messages' }, { status: 403 });
    }

    // Verify message exists in this group
    const { data: message } = await adminClient
      .from('group_messages')
      .select('id')
      .eq('id', messageId)
      .eq('group_id', groupId)
      .single();

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Pin the message
    const { error: updateError } = await adminClient
      .from('group_messages')
      .update({
        is_pinned: true,
        pinned_at: new Date().toISOString(),
        pinned_by: user.id
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error pinning message:', updateError);
      return NextResponse.json({ error: 'Failed to pin message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Pin message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/groups/[groupId]/messages/[messageId]/pin - Unpin a message
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

    // Verify user is admin/owner
    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only admins can unpin messages' }, { status: 403 });
    }

    // Unpin the message
    const { error: updateError } = await adminClient
      .from('group_messages')
      .update({
        is_pinned: false,
        pinned_at: null,
        pinned_by: null
      })
      .eq('id', messageId)
      .eq('group_id', groupId);

    if (updateError) {
      console.error('Error unpinning message:', updateError);
      return NextResponse.json({ error: 'Failed to unpin message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unpin message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
