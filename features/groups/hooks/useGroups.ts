// useGroups Hook - Updated for Next.js API Routes
import { useState, useCallback } from 'react';
import { 
  Group, 
  GroupSummary, 
  CreateGroupInput, 
  UpdateGroupInput,
  GroupsResponse,
  GroupResponse 
} from '../types';
import { groupsApi } from '../api-config';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[useGroups]', ...args);

export function useGroups() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all groups for current user
  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    log('Fetching groups...');
    
    try {
      const url = groupsApi('/api/groups');
      log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        credentials: 'include', // Include cookies for auth
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      log('Response status:', response.status);
      const data: GroupsResponse = await response.json();
      log('Fetch groups response:', data);
      
      if (response.ok && data.success) {
        setGroups(data.groups || []);
        return data.groups || [];
      } else {
        setError(data.error || 'Failed to fetch groups');
        return [];
      }
    } catch (err) {
      log('Fetch groups error:', err);
      setError('Failed to fetch groups');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch single group details
  const fetchGroup = useCallback(async (groupId: string) => {
    setIsLoading(true);
    setError(null);
    log('Fetching group:', groupId);
    
    try {
      const response = await fetch(groupsApi(`/api/groups/${groupId}`), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data: GroupResponse = await response.json();
      log('Fetch group response:', data);
      
      if (response.ok && data.success) {
        setCurrentGroup(data.group || null);
        return data.group;
      } else {
        setError(data.error || 'Failed to fetch group');
        return null;
      }
    } catch (err) {
      log('Fetch group error:', err);
      setError('Failed to fetch group');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new group
  const createGroup = useCallback(async (input: CreateGroupInput) => {
    setIsLoading(true);
    setError(null);
    log('Creating group:', input);
    
    try {
      const response = await fetch(groupsApi('/api/groups'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      });
      
      const data = await response.json();
      log('Create group response:', data);
      
      if (response.ok && data.success) {
        // Add new group to list
        if (data.group) {
          setGroups(prev => [{
            id: data.group.id,
            name: data.group.name,
            description: data.group.description,
            avatar_url: data.group.avatar_url,
            group_type: data.group.group_type,
            member_count: 1,
            unread_count: 0
          }, ...prev]);
        }
        return data.group;
      } else {
        setError(data.error || 'Failed to create group');
        return null;
      }
    } catch (err) {
      log('Create group error:', err);
      setError('Failed to create group');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update group settings
  const updateGroup = useCallback(async (groupId: string, input: UpdateGroupInput) => {
    setIsLoading(true);
    setError(null);
    log('Updating group:', groupId, input);
    
    try {
      const response = await fetch(groupsApi(`/api/groups/${groupId}`), {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      });
      
      const data = await response.json();
      log('Update group response:', data);
      
      if (response.ok && data.success) {
        // Update in list
        setGroups(prev => prev.map(g => 
          g.id === groupId ? { ...g, ...data.group } : g
        ));
        if (currentGroup?.id === groupId) {
          setCurrentGroup(prev => prev ? { ...prev, ...data.group } : null);
        }
        return data.group;
      } else {
        setError(data.error || 'Failed to update group');
        return null;
      }
    } catch (err) {
      log('Update group error:', err);
      setError('Failed to update group');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentGroup]);

  // Delete group
  const deleteGroup = useCallback(async (groupId: string) => {
    setIsLoading(true);
    setError(null);
    log('Deleting group:', groupId);
    
    try {
      const response = await fetch(groupsApi(`/api/groups/${groupId}`), {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      log('Delete group response:', data);
      
      if (response.ok && data.success) {
        setGroups(prev => prev.filter(g => g.id !== groupId));
        if (currentGroup?.id === groupId) {
          setCurrentGroup(null);
        }
        return true;
      } else {
        setError(data.error || 'Failed to delete group');
        return false;
      }
    } catch (err) {
      log('Delete group error:', err);
      setError('Failed to delete group');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentGroup]);

  // Leave group
  const leaveGroup = useCallback(async (groupId: string, userId: string) => {
    setIsLoading(true);
    setError(null);
    log('Leaving group:', groupId);
    
    try {
      // API expects target_user_id in URL path
      const response = await fetch(groupsApi(`/api/groups/${groupId}/members/${userId}`), {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      log('Leave group response:', data);
      
      if (response.ok && data.success) {
        setGroups(prev => prev.filter(g => g.id !== groupId));
        if (currentGroup?.id === groupId) {
          setCurrentGroup(null);
        }
        return true;
      } else {
        setError(data.error || 'Failed to leave group');
        return false;
      }
    } catch (err) {
      log('Leave group error:', err);
      setError('Failed to leave group');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentGroup]);

  // Get invite link
  const getInviteLink = useCallback(async (groupId: string) => {
    log('Getting invite link:', groupId);
    try {
      const response = await fetch(groupsApi(`/api/groups/${groupId}/invite`), {
        credentials: 'include'
      });
      const data = await response.json();
      log('Get invite link response:', data);
      
      if (response.ok && data.success) {
        return data.invite_link;
      }
      return null;
    } catch (err) {
      log('Get invite link error:', err);
      return null;
    }
  }, []);

  // Regenerate invite link
  const regenerateInviteLink = useCallback(async (groupId: string) => {
    log('Regenerating invite link:', groupId);
    try {
      const response = await fetch(groupsApi(`/api/groups/${groupId}/invite`), {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      log('Regenerate invite link response:', data);
      
      if (response.ok && data.success) {
        return data.invite_link;
      }
      return null;
    } catch (err) {
      log('Regenerate invite link error:', err);
      return null;
    }
  }, []);

  // Join group via invite code
  const joinGroup = useCallback(async (inviteCode: string) => {
    setIsLoading(true);
    setError(null);
    log('Joining group with code:', inviteCode);
    
    try {
      const response = await fetch(groupsApi(`/api/groups/join/${inviteCode}`), {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      log('Join group response:', data);
      
      if (response.ok && data.success) {
        if (!data.already_member) {
          // Refresh groups list
          await fetchGroups();
        }
        return data.group;
      } else {
        setError(data.error || 'Failed to join group');
        return null;
      }
    } catch (err) {
      log('Join group error:', err);
      setError('Failed to join group');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchGroups]);

  // Get group info from invite code
  const getGroupFromInvite = useCallback(async (inviteCode: string) => {
    log('Getting group from invite:', inviteCode);
    try {
      const response = await fetch(groupsApi(`/api/groups/join/${inviteCode}`), {
        credentials: 'include'
      });
      const data = await response.json();
      log('Get group from invite response:', data);
      
      if (response.ok && data.success) {
        return data;
      }
      return null;
    } catch (err) {
      log('Get group from invite error:', err);
      return null;
    }
  }, []);

  return {
    groups,
    currentGroup,
    isLoading,
    error,
    fetchGroups,
    fetchGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    leaveGroup,
    getInviteLink,
    regenerateInviteLink,
    joinGroup,
    getGroupFromInvite,
    setCurrentGroup,
    clearError: () => setError(null)
  };
}
