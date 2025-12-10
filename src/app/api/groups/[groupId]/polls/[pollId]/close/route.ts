// Poll Close API - Close a poll
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';

// POST /api/groups/[groupId]/polls/[pollId]/close - Close a poll
export async function POST(
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
    const { data: poll, error: pollError } = await adminClient
      .from('group_polls')
      .select('*')
      .eq('id', pollId)
      .eq('group_id', groupId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Check if poll is already closed
    if (poll.is_closed) {
      return NextResponse.json({ error: 'Poll is already closed' }, { status: 400 });
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
      return NextResponse.json({ error: 'Only the creator or admins can close this poll' }, { status: 403 });
    }

    // Close the poll
    const { error: updateError } = await adminClient
      .from('group_polls')
      .update({
        is_closed: true,
        closed_at: new Date().toISOString()
      })
      .eq('id', pollId);

    if (updateError) {
      console.error('Error closing poll:', updateError);
      return NextResponse.json({ error: 'Failed to close poll' }, { status: 500 });
    }

    // Get updated poll with results
    const { data: allVotes } = await adminClient
      .from('group_poll_votes')
      .select('option_id, user_id')
      .eq('poll_id', pollId);

    const { data: userVotes } = await adminClient
      .from('group_poll_votes')
      .select('option_id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id);

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
        is_closed: true,
        closed_at: new Date().toISOString(),
        total_votes: allVotes?.length || 0,
        results,
        user_votes: userVotes?.map(v => v.option_id) || []
      }
    });

  } catch (error) {
    console.error('Close poll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
