// Streaming Room Hook
'use client';

import { useState, useEffect, useCallback } from 'react';
import { StreamingRoom, StreamingParticipant, ParticipantRole } from '../types';

interface UseStreamingProps {
  roomCode: string;
  onRoomUpdate?: (room: StreamingRoom) => void;
}

interface StreamingState {
  room: StreamingRoom | null;
  participants: StreamingParticipant[];
  myRole: ParticipantRole;
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useStreaming({ roomCode, onRoomUpdate }: UseStreamingProps) {
  const [state, setState] = useState<StreamingState>({
    room: null,
    participants: [],
    myRole: 'viewer',
    isHost: false,
    isLoading: true,
    error: null,
  });

  // Fetch room details
  const fetchRoom = useCallback(async () => {
    try {
      const response = await fetch(`/api/video-streaming/${roomCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch room');
      }

      setState(prev => ({
        ...prev,
        room: data.room,
        isHost: data.isHost,
        isLoading: false,
        error: null,
      }));

      onRoomUpdate?.(data.room);
    } catch (error) {
      console.error('Error fetching room:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: (error as Error).message,
      }));
    }
  }, [roomCode, onRoomUpdate]);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    try {
      const response = await fetch(`/api/video-streaming/${roomCode}/participants`);
      const data = await response.json();

      if (response.ok) {
        setState(prev => ({
          ...prev,
          participants: data.participants || [],
        }));
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }, [roomCode]);

  // Join room
  const joinRoom = useCallback(async () => {
    try {
      const response = await fetch('/api/video-streaming/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      setState(prev => ({
        ...prev,
        room: data.room,
        myRole: data.role,
        isHost: data.role === 'host',
      }));

      return data;
    } catch (error) {
      console.error('Error joining room:', error);
      setState(prev => ({
        ...prev,
        error: (error as Error).message,
      }));
      throw error;
    }
  }, [roomCode]);

  // Get token
  const getToken = useCallback(async () => {
    try {
      const response = await fetch('/api/video-streaming/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, role: state.myRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get token');
      }

      return data;
    } catch (error) {
      console.error('Error getting token:', error);
      throw error;
    }
  }, [roomCode, state.myRole]);

  // Start stream (host only)
  const startStream = useCallback(async () => {
    try {
      const response = await fetch(`/api/video-streaming/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start stream');
      }

      setState(prev => ({ ...prev, room: data.room }));
      return data.room;
    } catch (error) {
      console.error('Error starting stream:', error);
      throw error;
    }
  }, [roomCode]);

  // End stream (host only)
  const endStream = useCallback(async () => {
    try {
      const response = await fetch(`/api/video-streaming/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to end stream');
      }

      setState(prev => ({ ...prev, room: data.room }));
      return data.room;
    } catch (error) {
      console.error('Error ending stream:', error);
      throw error;
    }
  }, [roomCode]);

  // Toggle recording (host only)
  const toggleRecording = useCallback(async () => {
    try {
      const response = await fetch(`/api/video-streaming/${roomCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_recording' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle recording');
      }

      setState(prev => ({ ...prev, room: data.room }));
      return data.room;
    } catch (error) {
      console.error('Error toggling recording:', error);
      throw error;
    }
  }, [roomCode]);

  // Update participant
  const updateParticipant = useCallback(async (
    participantId: string,
    action: string,
    value?: boolean
  ) => {
    try {
      const response = await fetch(`/api/video-streaming/${roomCode}/participants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, action, value }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update participant');
      }

      // Refresh participants
      await fetchParticipants();

      return data.participant;
    } catch (error) {
      console.error('Error updating participant:', error);
      throw error;
    }
  }, [roomCode, fetchParticipants]);

  // Raise/lower hand (for viewers)
  const toggleHandRaise = useCallback(async () => {
    try {
      const response = await fetch(`/api/video-streaming/${roomCode}/hand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle hand');
      }

      // Refresh participants to get updated state
      await fetchParticipants();

      return data.handRaised;
    } catch (error) {
      console.error('Error toggling hand:', error);
      throw error;
    }
  }, [roomCode, fetchParticipants]);

  // Initial fetch
  useEffect(() => {
    fetchRoom();
    fetchParticipants();
  }, [fetchRoom, fetchParticipants]);

  // Poll participants frequently (every 2 seconds) for real-time waiting room & status updates
  useEffect(() => {
    const interval = setInterval(fetchParticipants, 2000);
    return () => clearInterval(interval);
  }, [fetchParticipants]);

  return {
    ...state,
    joinRoom,
    getToken,
    startStream,
    endStream,
    toggleRecording,
    updateParticipant,
    toggleHandRaise,
    refreshRoom: fetchRoom,
    refreshParticipants: fetchParticipants,
  };
}
