// Single Poll API - Get poll details
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';

// GET /api/groups/[groupId]/polls/[pollId] - Get a specific poll
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; pollId: string }> }
) {
  try {
    const { groupId, pollId } = await params;
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

    // Get the poll
    const { data: poll, error: pollError } = await adminClient
      .from('group_polls')
      .select('*')
      .eq('id', pollId)
      .eq('group_id', groupId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Get user's votes
    const { data: userVotes } = await adminClient
      .from('group_poll_votes')
      .select('option_id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id);

    // Get all votes for results
    const { data: allVotes } = await adminClient
      .from('group_poll_votes')
      .select('option_id, user_id')
      .eq('poll_id', pollId);

    // Calculate results
    const results = (poll.options || []).map((opt: any) => {
      const optionVotes = allVotes?.filter(v => v.option_id === opt.id) || [];
      return {
        option_id: opt.id,
        vote_count: optionVotes.length,
        percentage: (allVotes?.length || 0) > 0 
          ? Math.round((optionVotes.length / (allVotes?.length || 1)) * 100) 
          : 0,
        voters: poll.is_anonymous ? [] : optionVotes.map(v => ({ id: v.user_id }))
      };
    });

    return NextResponse.json({
      success: true,
      poll: {
        ...poll,
        total_votes: allVotes?.length || 0,
        results,
        user_votes: userVotes?.map(v => v.option_id) || []
      }
    });

  } catch (error) {
    console.error('Get poll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/groups/[groupId]/polls/[pollId] - Delete a poll (creator/admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; pollId: string }> }
) {
  try {
    const { groupId, pollId } = await params;
    const supabase = await getServerSupabase();
    const adminClient = getServiceRoleSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the poll
    const { data: poll } = await adminClient
      .from('group_polls')
      .select('created_by, message_id')
      .eq('id', pollId)
      .eq('group_id', groupId)
      .single();

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Check if user is creator or admin
    const { data: membership } = await adminClient
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    const isCreator = poll.created_by === user.id;
    const isAdmin = membership?.role && ['admin', 'owner'].includes(membership.role);

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Only the creator or admins can delete this poll' }, { status: 403 });
    }

    // Delete the poll (votes will be cascade deleted)
    const { error: deleteError } = await adminClient
      .from('group_polls')
      .delete()
      .eq('id', pollId);

    if (deleteError) {
      console.error('Error deleting poll:', deleteError);
      return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 });
    }

    // Delete the associated message
    if (poll.message_id) {
      await adminClient
        .from('group_messages')
        .delete()
        .eq('id', poll.message_id);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete poll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
