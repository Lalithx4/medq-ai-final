// Search Users API - For adding members to groups
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

// GET /api/groups/search-users - Search for users to add to group
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const groupId = searchParams.get('group_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json({ 
        success: true, 
        users: [],
        message: 'Please enter at least 2 characters to search'
      });
    }

    // Search users by name or email
    const { data: users, error: searchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .neq('id', user.id) // Exclude current user
      .limit(limit);

    if (searchError) {
      console.error('Error searching users:', searchError);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    // If groupId provided, filter out existing members
    if (groupId && users && users.length > 0) {
      const { data: existingMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      const memberIds = new Set(existingMembers?.map(m => m.user_id) || []);
      
      const filteredUsers = users
        .filter(u => !memberIds.has(u.id))
        .map(u => ({
          ...u,
          is_member: false
        }));

      return NextResponse.json({
        success: true,
        users: filteredUsers
      });
    }

    return NextResponse.json({
      success: true,
      users: users || []
    });

  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
