// useGroupMembers Hook - Member management with FastAPI backend
import { useState, useCallback, useEffect } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { 
  GroupMember, 
  AddMemberInput, 
  MembersResponse,
  UserProfile,
  MemberRole
} from '../types';
import { groupsApi } from '../api-config';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[useGroupMembers]', ...args);

export function useGroupMembers(groupId: string | null) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getBrowserSupabase();

  // Get auth token
  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Fetch all members
  const fetchMembers = useCallback(async () => {
    if (!groupId) return [];
    
    setIsLoading(true);
    setError(null);
    log('Fetching members for group:', groupId);
    
    try {
      const token = await getToken();
      if (!token) {
        setError('Not authenticated');
        return [];
      }

      const response = await fetch(groupsApi(`/api/groups/${groupId}/members`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data: MembersResponse = await response.json();
      log('Fetch members response:', data);
      
      if (response.ok && data.success) {
        setMembers(data.members);
        return data.members;
      } else {
        setError(data.error || 'Failed to fetch members');
        return [];
      }
    } catch (err) {
      log('Fetch members error:', err);
      setError('Failed to fetch members');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  // Add members
  const addMembers = useCallback(async (membersToAdd: AddMemberInput[]) => {
    if (!groupId) return false;
    
    setIsLoading(true);
    setError(null);
    log('Adding members:', membersToAdd);
    
    try {
      const token = await getToken();
      if (!token) {
        setError('Not authenticated');
        return false;
      }

      const response = await fetch(groupsApi(`/api/groups/${groupId}/members`), {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(membersToAdd)
      });
      
      const data = await response.json();
      log('Add members response:', data);
      
      if (response.ok && data.success) {
        // Refresh members list
        await fetchMembers();
        return true;
      } else {
        setError(data.error || 'Failed to add members');
        return false;
      }
    } catch (err) {
      log('Add members error:', err);
      setError('Failed to add members');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [groupId, fetchMembers]);

  // Update member (role, mute, etc.)
  const updateMember = useCallback(async (
    userId: string, 
    updates: { role?: MemberRole; is_muted?: boolean; notifications_enabled?: boolean }
  ) => {
    if (!groupId) return false;
    log('Updating member:', userId, updates);
    
    try {
      const token = await getToken();
      if (!token) return false;

      // API expects target_user_id in URL path
      const response = await fetch(groupsApi(`/api/groups/${groupId}/members/${userId}`), {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(updates)
      });
      
      const data = await response.json();
      log('Update member response:', data);
      
      if (response.ok && data.success) {
        // Update local state
        setMembers(prev => prev.map(m => 
          m.user_id === userId ? { ...m, ...updates } as GroupMember : m
        ));
        return true;
      } else {
        log('Update member failed:', data.error);
      }
      return false;
    } catch (err) {
      log('Update member error:', err);
      return false;
    }
  }, [groupId]);

  // Remove member
  const removeMember = useCallback(async (userId: string) => {
    if (!groupId) return false;
    log('Removing member:', userId);
    
    try {
      const token = await getToken();
      if (!token) return false;

      // API expects target_user_id in URL path
      const response = await fetch(groupsApi(`/api/groups/${groupId}/members/${userId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      log('Remove member response:', data);
      
      if (response.ok && data.success) {
        setMembers(prev => prev.filter(m => m.user_id !== userId));
        return true;
      } else {
        log('Remove member failed:', data.error);
      }
      return false;
    } catch (err) {
      log('Remove member error:', err);
      return false;
    }
  }, [groupId]);

  // Make admin
  const makeAdmin = useCallback(async (userId: string) => {
    log('Making admin:', userId);
    return updateMember(userId, { role: 'admin' });
  }, [updateMember]);

  // Remove admin
  const removeAdmin = useCallback(async (userId: string) => {
    log('Removing admin:', userId);
    return updateMember(userId, { role: 'member' });
  }, [updateMember]);

  // Toggle mute
  const toggleMute = useCallback(async (userId: string, isMuted: boolean) => {
    log('Toggling mute:', userId, isMuted);
    return updateMember(userId, { is_muted: isMuted });
  }, [updateMember]);

  // Search users to add
  const searchUsers = useCallback(async (query: string) => {
    if (!groupId || query.length < 2) return [];
    log('Searching users:', query);
    
    try {
      const token = await getToken();
      if (!token) return [];

      const params = new URLSearchParams();
      params.append('q', query);
      params.append('exclude_group', groupId);
      
      const response = await fetch(groupsApi(`/api/groups/search-users?${params}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      log('Search users response:', data);
      
      if (response.ok && data.success) {
        return data.users as UserProfile[];
      }
      return [];
    } catch (err) {
      log('Search users error:', err);
      return [];
    }
  }, [groupId]);

  // Get admins
  const admins = members.filter(m => m.role === 'admin');
  
  // Get regular members
  const regularMembers = members.filter(m => m.role === 'member');

  // Check if user is admin
  const isAdmin = useCallback((userId: string) => {
    return members.some(m => m.user_id === userId && m.role === 'admin');
  }, [members]);

  // Check if user is owner
  const isOwner = useCallback((userId: string) => {
    return members.some(m => m.user_id === userId && m.role === 'owner');
  }, [members]);

  // Reset state when group changes
  useEffect(() => {
    setMembers([]);
    setError(null);
  }, [groupId]);

  // Subscribe to Supabase Realtime for member changes
  useEffect(() => {
    if (!groupId) return;

    log('Setting up Supabase Realtime subscription for members:', groupId);
    
    const channel = supabase
      .channel(`group-members-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          log('Supabase Realtime: Member change:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Refetch to get user profile
            fetchMembers();
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setMembers(prev => prev.map(m => 
              m.user_id === updated.user_id ? { ...m, ...updated } : m
            ));
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as any;
            setMembers(prev => prev.filter(m => m.user_id !== deleted.user_id));
          }
        }
      )
      .subscribe((status) => {
        log('Supabase Realtime members subscription status:', status);
      });

    return () => {
      log('Removing Supabase Realtime members subscription');
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase, fetchMembers]);

  return {
    members,
    admins,
    regularMembers,
    isLoading,
    error,
    fetchMembers,
    addMembers,
    updateMember,
    removeMember,
    makeAdmin,
    removeAdmin,
    toggleMute,
    searchUsers,
    isAdmin,
    isOwner,
    clearError: () => setError(null)
  };
}
