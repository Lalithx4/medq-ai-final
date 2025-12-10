// useEvents Hook - Event management for groups
import { useState, useCallback } from 'react';
import { groupsApi } from '../api-config';
import { GroupEvent } from '../components/GroupEvents';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[useEvents]', ...args);

interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  location_type?: 'physical' | 'virtual' | 'hybrid';
  meeting_link?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    end_date?: string;
    count?: number;
    days_of_week?: number[];
  };
  reminder_minutes?: number;
  color?: string;
}

interface UseEventsReturn {
  // State
  events: GroupEvent[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  
  // Actions
  createEvent: (groupId: string, input: CreateEventInput) => Promise<GroupEvent | null>;
  getEvents: (groupId: string, start?: string, end?: string) => Promise<GroupEvent[]>;
  updateRSVP: (groupId: string, eventId: string, status: 'yes' | 'no' | 'maybe') => Promise<boolean>;
  deleteEvent: (groupId: string, eventId: string) => Promise<boolean>;
  clearEvents: () => void;
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new event
  const createEvent = useCallback(async (groupId: string, input: CreateEventInput): Promise<GroupEvent | null> => {
    setIsCreating(true);
    setError(null);
    log('Creating event:', input);
    
    try {
      const response = await fetch(
        groupsApi(`/api/groups/${groupId}/events`),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        }
      );
      
      const data = await response.json();
      log('Create event response:', data);
      
      if (response.ok && data.success && data.event) {
        setEvents(prev => [data.event, ...prev]);
        return data.event;
      } else {
        setError(data.error || 'Failed to create event');
        return null;
      }
    } catch (err) {
      log('Create event error:', err);
      setError('Failed to create event');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Get events for a group
  const getEvents = useCallback(async (
    groupId: string, 
    start?: string, 
    end?: string
  ): Promise<GroupEvent[]> => {
    setIsLoading(true);
    setError(null);
    log('Getting events for group:', groupId);
    
    try {
      let url = groupsApi(`/api/groups/${groupId}/events`);
      const params = new URLSearchParams();
      if (start) params.append('start', start);
      if (end) params.append('end', end);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      log('Get events response:', data);
      
      if (response.ok && data.success) {
        setEvents(data.events || []);
        return data.events || [];
      } else {
        setError(data.error || 'Failed to get events');
        return [];
      }
    } catch (err) {
      log('Get events error:', err);
      setError('Failed to get events');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update RSVP status
  const updateRSVP = useCallback(async (
    groupId: string, 
    eventId: string, 
    status: 'yes' | 'no' | 'maybe'
  ): Promise<boolean> => {
    log('Updating RSVP:', eventId, status);
    
    try {
      const response = await fetch(
        groupsApi(`/api/groups/${groupId}/events/${eventId}/rsvp`),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        }
      );
      
      const data = await response.json();
      log('RSVP response:', data);
      
      if (response.ok && data.success) {
        // Update local state
        setEvents(prev => prev.map(e => 
          e.id === eventId 
            ? { ...e, user_rsvp: status }
            : e
        ));
        return true;
      }
      return false;
    } catch (err) {
      log('RSVP error:', err);
      return false;
    }
  }, []);

  // Delete an event
  const deleteEvent = useCallback(async (groupId: string, eventId: string): Promise<boolean> => {
    log('Deleting event:', eventId);
    
    try {
      const response = await fetch(
        groupsApi(`/api/groups/${groupId}/events/${eventId}`),
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );
      
      const data = await response.json();
      log('Delete event response:', data);
      
      if (response.ok && data.success) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
        return true;
      }
      return false;
    } catch (err) {
      log('Delete event error:', err);
      return false;
    }
  }, []);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setError(null);
  }, []);

  return {
    events,
    isLoading,
    isCreating,
    error,
    createEvent,
    getEvents,
    updateRSVP,
    deleteEvent,
    clearEvents
  };
}
