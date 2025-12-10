// usePolls Hook - Poll management for groups
import { useState, useCallback } from 'react';
import { groupsApi } from '../api-config';
import { GroupPoll, CreatePollInput, PollResponse, PollVoteResponse } from '../types';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[usePolls]', ...args);

interface UsePollsReturn {
  // State
  polls: Record<string, GroupPoll>; // pollId -> poll
  isLoading: boolean;
  isCreating: boolean;
  isVoting: boolean;
  error: string | null;
  
  // Actions
  createPoll: (groupId: string, input: CreatePollInput) => Promise<GroupPoll | null>;
  getPoll: (groupId: string, pollId: string) => Promise<GroupPoll | null>;
  votePoll: (groupId: string, pollId: string, optionIds: string[]) => Promise<GroupPoll | null>;
  closePoll: (groupId: string, pollId: string) => Promise<boolean>;
  clearPolls: () => void;
}

export function usePolls(): UsePollsReturn {
  const [polls, setPolls] = useState<Record<string, GroupPoll>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new poll
  const createPoll = useCallback(async (groupId: string, input: CreatePollInput): Promise<GroupPoll | null> => {
    setIsCreating(true);
    setError(null);
    log('Creating poll:', input);
    
    try {
      const response = await fetch(
        groupsApi(`/api/groups/${groupId}/polls`),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        }
      );
      
      const data: PollResponse = await response.json();
      log('Create poll response:', data);
      
      if (response.ok && data.success && data.poll) {
        setPolls(prev => ({
          ...prev,
          [data.poll.id]: data.poll
        }));
        return data.poll;
      } else {
        setError(data.error || 'Failed to create poll');
        return null;
      }
    } catch (err) {
      log('Create poll error:', err);
      setError('Failed to create poll');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Get a specific poll
  const getPoll = useCallback(async (groupId: string, pollId: string): Promise<GroupPoll | null> => {
    setIsLoading(true);
    setError(null);
    log('Getting poll:', pollId);
    
    try {
      const response = await fetch(
        groupsApi(`/api/groups/${groupId}/polls/${pollId}`),
        { credentials: 'include' }
      );
      
      const data: PollResponse = await response.json();
      log('Get poll response:', data);
      
      if (response.ok && data.success && data.poll) {
        setPolls(prev => ({
          ...prev,
          [data.poll.id]: data.poll
        }));
        return data.poll;
      } else {
        setError(data.error || 'Failed to get poll');
        return null;
      }
    } catch (err) {
      log('Get poll error:', err);
      setError('Failed to get poll');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Vote on a poll
  const votePoll = useCallback(async (
    groupId: string, 
    pollId: string, 
    optionIds: string[]
  ): Promise<GroupPoll | null> => {
    setIsVoting(true);
    setError(null);
    log('Voting on poll:', pollId, 'options:', optionIds);
    
    try {
      const response = await fetch(
        groupsApi(`/api/groups/${groupId}/polls/${pollId}/vote`),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ option_ids: optionIds })
        }
      );
      
      const data: PollVoteResponse = await response.json();
      log('Vote poll response:', data);
      
      if (response.ok && data.success && data.poll) {
        setPolls(prev => ({
          ...prev,
          [data.poll.id]: data.poll
        }));
        return data.poll;
      } else {
        setError(data.error || 'Failed to vote');
        return null;
      }
    } catch (err) {
      log('Vote poll error:', err);
      setError('Failed to vote');
      return null;
    } finally {
      setIsVoting(false);
    }
  }, []);

  // Close a poll
  const closePoll = useCallback(async (groupId: string, pollId: string): Promise<boolean> => {
    setError(null);
    log('Closing poll:', pollId);
    
    try {
      const response = await fetch(
        groupsApi(`/api/groups/${groupId}/polls/${pollId}/close`),
        {
          method: 'POST',
          credentials: 'include'
        }
      );
      
      const data = await response.json();
      log('Close poll response:', data);
      
      if (response.ok && data.success) {
        // Update poll in state
        if (data.poll) {
          setPolls(prev => ({
            ...prev,
            [pollId]: data.poll
          }));
        }
        return true;
      } else {
        setError(data.error || 'Failed to close poll');
        return false;
      }
    } catch (err) {
      log('Close poll error:', err);
      setError('Failed to close poll');
      return false;
    }
  }, []);

  // Clear all polls
  const clearPolls = useCallback(() => {
    setPolls({});
    setError(null);
  }, []);

  return {
    polls,
    isLoading,
    isCreating,
    isVoting,
    error,
    createPoll,
    getPoll,
    votePoll,
    closePoll,
    clearPolls
  };
}
