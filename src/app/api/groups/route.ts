// Groups API - List and Create Groups
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getServiceRoleSupabase } from '@/lib/supabase/server';
import { CreateGroupInput } from '@/features/groups/types';

// GET /api/groups - List all groups for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS recursion issue
    const adminClient = getServiceRoleSupabase();

    // Get all groups where user is a member
    const { data: memberships, error: memberError } = await adminClient
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    if (memberError) {
      console.error('Error fetching memberships:', memberError);
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }

    const groupIds = memberships?.map(m => m.group_id) || [];

    if (groupIds.length === 0) {
      return NextResponse.json({
        success: true,
        groups: [],
        total: 0
      });
    }

    // Fetch groups with member count and last message
    const { data: groups, error: groupsError } = await adminClient
      .from('groups')
      .select(`
        *,
        group_members(count),
        group_messages(
          id,
          content,
          message_type,
          created_at,
          sender_id
        )
      `)
      .in('id', groupIds)
      .order('updated_at', { ascending: false });

    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }

    // Process groups to add computed fields
    const processedGroups = await Promise.all(groups.map(async (group) => {
      // Get last message
      const { data: lastMessages } = await adminClient
        .from('group_messages')
        .select('id, content, message_type, created_at, sender_id')
        .eq('group_id', group.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1);

      // Get unread count
      const membership = memberships.find(m => m.group_id === group.id);
      let unreadCount = 0;
      
      if (membership) {
        const memberData = await adminClient
          .from('group_members')
          .select('last_read_at')
          .eq('group_id', group.id)
          .eq('user_id', user.id)
          .single();

        if (memberData.data) {
          const { count } = await adminClient
            .from('group_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .gt('created_at', memberData.data.last_read_at || '1970-01-01')
            .neq('sender_id', user.id)
            .eq('is_deleted', false);
          
          unreadCount = count || 0;
        }
      }

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        avatar_url: group.avatar_url,
        group_type: group.group_type,
        member_count: group.group_members?.[0]?.count || 0,
        last_message: lastMessages?.[0] || null,
        unread_count: unreadCount,
        created_at: group.created_at,
        updated_at: group.updated_at
      };
    }));

    return NextResponse.json({
      success: true,
      groups: processedGroups,
      total: processedGroups.length
    });

  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS
    const adminClient = getServiceRoleSupabase();

    const body: CreateGroupInput = await request.json();
    const { 
      name, 
      description, 
      avatar_url, 
      group_type = 'private',
      max_members = 256,
      only_admins_can_message = false,
      only_admins_can_add_members = false
    } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Group name must be less than 100 characters' }, { status: 400 });
    }

    // Create the group
    const { data: group, error: createError } = await adminClient
      .from('groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        avatar_url: avatar_url || null,
        created_by: user.id,
        group_type,
        max_members,
        only_admins_can_message,
        only_admins_can_add_members
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating group:', createError);
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    // Add creator as admin
    const { error: memberError } = await adminClient
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
        added_by: user.id
      });

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
      // Rollback group creation
      await adminClient.from('groups').delete().eq('id', group.id);
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    // Add system message for group creation
    await adminClient
      .from('group_messages')
      .insert({
        group_id: group.id,
        sender_id: user.id,
        content: 'created this group',
        message_type: 'system'
      });

    return NextResponse.json({
      success: true,
      group: {
        ...group,
        member_count: 1,
        unread_count: 0
      }
    });

  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
