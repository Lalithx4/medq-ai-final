// useReactions Hook - Message reactions management
import { useState, useCallback } from 'react';
import { groupsApi } from '../api-config';
import { ReactionCount, ReactionsResponse } from '../types';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[useReactions]', ...args);

interface UseReactionsReturn {
  // State
  reactions: Record<string, ReactionCount[]>; // messageId -> reactions
  isLoading: boolean;
  error: string | null;
  
  // Actions
  getReactions: (groupId: string, messageId: string) => Promise<ReactionCount[]>;
  toggleReaction: (groupId: string, messageId: string, emoji: string) => Promise<{ action: string; reactions: ReactionCount[] } | null>;
  clearReactions: (messageId?: string) => void;
}

export function useReactions(): UseReactionsReturn {
  const [reactions, setReactions] = useState<Record<string, ReactionCount[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get reactions for a specific message
  const getReactions = useCallback(async (groupId: string, messageId: string): Promise<ReactionCount[]> => {
    setIsLoading(true);
    setError(null);
    log('Getting reactions for message:', messageId);
    
    try {
      const response = await fetch(
        groupsApi(`/api/groups/${groupId}/messages/${messageId}/reactions`),
        { credentials: 'include' }
      );
      
      const data: ReactionsResponse = await response.json();
      log('Get reactions response:', data);
      
      if (response.ok && data.success) {
        setReactions(prev => ({
          ...prev,
          [messageId]: data.reactions
        }));
        return data.reactions;
      } else {
        setError(data.error || 'Failed to get reactions');
        return [];
      }
    } catch (err) {
      log('Get reactions error:', err);
      setError('Failed to get reactions');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle a reaction on a message
  const toggleReaction = useCallback(async (
    groupId: string, 
    messageId: string, 
    emoji: string
  ): Promise<{ action: string; reactions: ReactionCount[] } | null> => {
    setError(null);
    log('Toggling reaction:', emoji, 'on message:', messageId);
    
    // Optimistic update
    setReactions(prev => {
      const messageReactions = [...(prev[messageId] || [])];
      const existingIndex = messageReactions.findIndex(r => r.emoji === emoji);
      
      if (existingIndex >= 0 && messageReactions[existingIndex]) {
        const existing = messageReactions[existingIndex];
        if (existing.hasReacted) {
          // Remove user's reaction
          if (existing.count === 1) {
            messageReactions.splice(existingIndex, 1);
          } else {
            messageReactions[existingIndex] = {
              emoji: existing.emoji,
              count: existing.count - 1,
              users: existing.users,
              hasReacted: false
            };
          }
        } else {
          // Add user's reaction
          messageReactions[existingIndex] = {
            emoji: existing.emoji,
            count: existing.count + 1,
            users: existing.users,
            hasReacted: true
          };
        }
      } else {
        // New reaction
        messageReactions.push({
          emoji,
          count: 1,
          users: [],
          hasReacted: true
        });
      }
      
      return {
        ...prev,
        [messageId]: messageReactions
      };
    });
    
    try {
      const response = await fetch(
        groupsApi(`/api/groups/${groupId}/messages/${messageId}/reactions`),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji })
        }
      );
      
      const data = await response.json();
      log('Toggle reaction response:', data);
      
      if (response.ok && data.success) {
        // Update with server response
        setReactions(prev => ({
          ...prev,
          [messageId]: data.reactions
        }));
        return { action: data.action, reactions: data.reactions };
      } else {
        // Revert optimistic update by fetching fresh data
        setError(data.error || 'Failed to toggle reaction');
        await getReactions(groupId, messageId);
        return null;
      }
    } catch (err) {
      log('Toggle reaction error:', err);
      setError('Failed to toggle reaction');
      // Revert optimistic update
      await getReactions(groupId, messageId);
      return null;
    }
  }, [getReactions]);

  // Clear reactions (for cleanup or specific message)
  const clearReactions = useCallback((messageId?: string) => {
    if (messageId) {
      setReactions(prev => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
    } else {
      setReactions({});
    }
    setError(null);
  }, []);

  return {
    reactions,
    isLoading,
    error,
    getReactions,
    toggleReaction,
    clearReactions
  };
}
