// Polls API - Create polls and list polls
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';
import crypto from 'crypto';

// GET /api/groups/[groupId]/polls - List all polls in a group
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

    // Get polls
    const { data: polls, error: pollsError } = await adminClient
      .from('group_polls')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (pollsError) {
      console.error('Error fetching polls:', pollsError);
      return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 });
    }

    // Get user's votes for each poll
    const pollIds = polls?.map(p => p.id) || [];
    const { data: userVotes } = await adminClient
      .from('group_poll_votes')
      .select('poll_id, option_id')
      .eq('user_id', user.id)
      .in('poll_id', pollIds);

    // Get vote counts for each poll
    const { data: voteCounts } = await adminClient
      .from('group_poll_votes')
      .select('poll_id, option_id')
      .in('poll_id', pollIds);

    // Enrich polls with vote data
    const enrichedPolls = (polls || []).map(poll => {
      const pollVotes = voteCounts?.filter(v => v.poll_id === poll.id) || [];
      const userPollVotes = userVotes?.filter(v => v.poll_id === poll.id) || [];
      
      // Calculate results
      const results = (poll.options || []).map((opt: any) => {
        const optionVotes = pollVotes.filter(v => v.option_id === opt.id);
        return {
          option_id: opt.id,
          vote_count: optionVotes.length,
          percentage: pollVotes.length > 0 
            ? Math.round((optionVotes.length / pollVotes.length) * 100) 
            : 0
        };
      });

      return {
        ...poll,
        total_votes: pollVotes.length,
        results,
        user_votes: userPollVotes.map(v => v.option_id)
      };
    });

    return NextResponse.json({
      success: true,
      polls: enrichedPolls
    });

  } catch (error) {
    console.error('Get polls error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/groups/[groupId]/polls - Create a new poll
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

    const body = await request.json();
    const { question, options, is_multiple_choice, is_anonymous, allow_add_options, ends_at } = body;

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: 'At least 2 options are required' }, { status: 400 });
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

    // Create poll options with IDs
    const pollOptions = options.map((opt: string) => ({
      id: crypto.randomUUID(),
      text: opt.trim()
    }));

    // Create a message first (type: poll)
    const { data: message, error: messageError } = await adminClient
      .from('group_messages')
      .insert({
        group_id: groupId,
        sender_id: user.id,
        content: `📊 Poll: ${question}`,
        message_type: 'text',
        metadata: { is_poll: true }
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating poll message:', messageError);
      return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 });
    }

    // Create the poll
    const { data: poll, error: pollError } = await adminClient
      .from('group_polls')
      .insert({
        group_id: groupId,
        message_id: message.id,
        created_by: user.id,
        question: question.trim(),
        options: pollOptions,
        is_multiple_choice: is_multiple_choice || false,
        is_anonymous: is_anonymous || false,
        allow_add_options: allow_add_options || false,
        ends_at: ends_at || null
      })
      .select()
      .single();

    if (pollError) {
      console.error('Error creating poll:', pollError);
      // Cleanup the message
      await adminClient.from('group_messages').delete().eq('id', message.id);
      return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 });
    }

    // Update the message with the poll_id
    await adminClient
      .from('group_messages')
      .update({ 
        metadata: { is_poll: true, poll_id: poll.id }
      })
      .eq('id', message.id);

    return NextResponse.json({
      success: true,
      poll: {
        ...poll,
        total_votes: 0,
        results: pollOptions.map((opt: any) => ({
          option_id: opt.id,
          vote_count: 0,
          percentage: 0
        })),
        user_votes: []
      },
      message
    });

  } catch (error) {
    console.error('Create poll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
