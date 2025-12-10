// Stream Chat Hook
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage } from '../types';
import { getBrowserSupabase } from '@/lib/supabase/client';

interface UseStreamChatProps {
  roomCode: string;
  roomId?: string;
  enabled?: boolean;
}

export function useStreamChat({ roomCode, roomId, enabled = true }: UseStreamChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch existing messages
  const fetchMessages = useCallback(async () => {
    if (!enabled || !roomCode) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/video-streaming/${roomCode}/chat`);
      const data = await response.json();

      if (response.ok) {
        setMessages(data.messages || []);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [roomCode, enabled]);

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isSending) return null;

    try {
      setIsSending(true);
      const response = await fetch(`/api/video-streaming/${roomCode}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add message immediately (optimistic update)
        const newMessage = data.message;
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        return newMessage;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [roomCode, isSending]);

  // Setup realtime subscription with fallback polling
  useEffect(() => {
    if (!enabled || !roomId) return;

    console.log('💬 Setting up chat for room:', roomId);
    
    const supabase = getBrowserSupabase();
    let subscriptionActive = false;

    // Try to setup realtime subscription
    const setupRealtime = () => {
      try {
        const channel = supabase
          .channel(`chat-${roomId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'stream_chat_messages',
              filter: `room_id=eq.${roomId}`,
            },
            async (payload) => {
              console.log('📨 New message received:', payload);
              const newMessage = payload.new as any;
              
              // Fetch user profile
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', newMessage.user_id)
                .single();

              const messageWithUser: ChatMessage = {
                ...newMessage,
                user: profile || { full_name: 'Unknown' },
              };

              setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === newMessage.id)) return prev;
                return [...prev, messageWithUser];
              });
            }
          )
          .subscribe((status) => {
            console.log('📡 Chat subscription status:', status);
            if (status === 'SUBSCRIBED') {
              subscriptionActive = true;
              setIsConnected(true);
              // Stop polling if subscription is active
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              subscriptionActive = false;
              setIsConnected(false);
              // Start polling as fallback
              startPolling();
            }
          });

        channelRef.current = channel;
      } catch (err) {
        console.error('Error setting up realtime:', err);
        startPolling();
      }
    };

    // Fallback polling for messages
    const startPolling = () => {
      if (pollingRef.current) return;
      console.log('🔄 Starting chat polling fallback');
      pollingRef.current = setInterval(() => {
        fetchMessages();
      }, 3000); // Poll every 3 seconds
    };

    setupRealtime();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up chat subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [enabled, roomId, fetchMessages]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    isSending,
    error,
    isConnected,
    sendMessage,
    fetchMessages,
    clearMessages,
  };
}
