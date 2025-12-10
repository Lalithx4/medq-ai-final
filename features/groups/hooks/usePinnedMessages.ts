// usePinnedMessages Hook - Pinned messages management
import { useState, useCallback } from 'react';
import { groupsApi } from '../api-config';
import { GroupMessageExtended, PinnedMessagesResponse } from '../types';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[usePinnedMessages]', ...args);

interface UsePinnedMessagesReturn {
  // State
  pinnedMessages: GroupMessageExtended[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchPinnedMessages: (groupId: string) => Promise<GroupMessageExtended[]>;
  pinMessage: (groupId: string, messageId: string) => Promise<boolean>;
  unpinMessage: (groupId: string, messageId: string) => Promise<boolean>;
  clearPinnedMessages: () => void;
}

export function usePinnedMessages(): UsePinnedMessagesReturn {
  const [pinnedMessages, setPinnedMessages] = useState<GroupMessageExtended[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all pinned messages for a group
  const fetchPinnedMessages = useCallback(async (groupId: string): Promise<GroupMessageExtended[]> => {
    setIsLoading(true);
    setError(null);
    log('Fetching pinned messages for group:', groupId);
    
    try {
      const response = await fetch(
        groupsApi(`/api/groups/${groupId}/pinned`),
        { credentials: 'include' }
      );
      
      const data: PinnedMessagesResponse = await response.json();
      log('Fetch pinned messages response:', data);
      
      if (response.ok && data.success) {
        setPinnedMessages(data.messages);
        return data.messages;
      } else {
        setError(data.error || 'Failed to fetch pinned messages');
        return [];
      }
    } catch (err) {
      log('Fetch pinned messages error:', err);
      setError('Failed to fetch pinned messages');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pin a message
  const pinMessage = useCallback(async (groupId: string, messageId: string): Promise<boolean> => {
    setError(null);
    log('Pinning message:', messageId);
    
    try {
      const response = await fetch(
        groupsApi(`/api/groups/${groupId}/messages/${messageId}/pin`),
        {
          method: 'POST',
          credentials: 'include'
        }
      );
      
      const data = await response.json();
      log('Pin message response:', data);
      
      if (response.ok && data.success) {
        // Refresh pinned messages
        await fetchPinnedMessages(groupId);
        return true;
      } else {
        setError(data.error || 'Failed to pin message');
        return false;
      }
    } catch (err) {
      log('Pin message error:', err);
      setError('Failed to pin message');
      return false;
    }
  }, [fetchPinnedMessages]);

  // Unpin a message
  const unpinMessage = useCallback(async (groupId: string, messageId: string): Promise<boolean> => {
    setError(null);
    log('Unpinning message:', messageId);
    
    // Optimistic update
    setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
    
    try {
      const response = await fetch(
        groupsApi(`/api/groups/${groupId}/messages/${messageId}/pin`),
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );
      
      const data = await response.json();
      log('Unpin message response:', data);
      
      if (response.ok && data.success) {
        return true;
      } else {
        // Revert optimistic update
        await fetchPinnedMessages(groupId);
        setError(data.error || 'Failed to unpin message');
        return false;
      }
    } catch (err) {
      log('Unpin message error:', err);
      // Revert optimistic update
      await fetchPinnedMessages(groupId);
      setError('Failed to unpin message');
      return false;
    }
  }, [fetchPinnedMessages]);

  // Clear pinned messages
  const clearPinnedMessages = useCallback(() => {
    setPinnedMessages([]);
    setError(null);
  }, []);

  return {
    pinnedMessages,
    isLoading,
    error,
    fetchPinnedMessages,
    pinMessage,
    unpinMessage,
    clearPinnedMessages
  };
}
