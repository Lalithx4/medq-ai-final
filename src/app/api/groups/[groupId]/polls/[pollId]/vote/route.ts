// Poll Vote API - Vote on a poll
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';

// POST /api/groups/[groupId]/polls/[pollId]/vote - Vote on a poll
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

    const body = await request.json();
    const { option_ids } = body;

    if (!option_ids || !Array.isArray(option_ids) || option_ids.length === 0) {
      return NextResponse.json({ error: 'At least one option must be selected' }, { status: 400 });
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

    // Check if poll is closed
    if (poll.is_closed) {
      return NextResponse.json({ error: 'This poll is closed' }, { status: 400 });
    }

    // Check if poll has ended
    if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
      return NextResponse.json({ error: 'This poll has ended' }, { status: 400 });
    }

    // Validate option IDs
    const validOptionIds = (poll.options || []).map((o: any) => o.id);
    const invalidOptions = option_ids.filter(id => !validOptionIds.includes(id));
    if (invalidOptions.length > 0) {
      return NextResponse.json({ error: 'Invalid option selected' }, { status: 400 });
    }

    // Check multiple choice
    if (!poll.is_multiple_choice && option_ids.length > 1) {
      return NextResponse.json({ error: 'This poll only allows one selection' }, { status: 400 });
    }

    // Remove existing votes
    await adminClient
      .from('group_poll_votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('user_id', user.id);

    // Add new votes
    const votes = option_ids.map(option_id => ({
      poll_id: pollId,
      option_id,
      user_id: user.id
    }));

    const { error: voteError } = await adminClient
      .from('group_poll_votes')
      .insert(votes);

    if (voteError) {
      console.error('Error voting:', voteError);
      return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
    }

    // Get updated results
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
        user_votes: option_ids
      }
    });

  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
