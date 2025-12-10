// useGroupChat Hook - Group messaging with FastAPI WebSocket support
import { useState, useCallback, useEffect, useRef } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { 
  GroupMessage, 
  SendMessageInput, 
  MessagesResponse,
  TypingIndicator
} from '../types';
import { groupsApi, groupsWsUrl } from '../api-config';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[useGroupChat]', ...args);

// WebSocket message types from FastAPI backend
interface WebSocketMessage {
  type: 'message' | 'new_message' | 'typing' | 'typing_start' | 'typing_stop' | 
        'read' | 'delete' | 'message_deleted' | 'edit' | 'message_edited' | 
        'user_joined' | 'user_left' | 'member_joined' | 'member_left' | 
        'user_online' | 'user_offline' | 'pong';
  data?: any;
  message?: any;
  message_id?: string;
  user_id?: string;
  content?: string;
  timestamp?: string;
}

export function useGroupChat(groupId: string | null) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = getBrowserSupabase();

  // Get auth token
  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Connect to WebSocket
  const connectWebSocket = useCallback(async () => {
    if (!groupId) return;
    
    const token = await getToken();
    if (!token) {
      log('No token for WebSocket');
      return;
    }
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    const wsUrl = groupsWsUrl(groupId, token);
    log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      log('WebSocket connected');
      setIsConnected(true);
    };
    
    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        log('WebSocket message:', data);
        
        switch (data.type) {
          case 'message':
          case 'new_message':
            // Handle both formats - FastAPI sends 'new_message' with nested 'message'
            const messageData = data.type === 'new_message' ? data.data?.message || data.data : data.data;
            if (messageData) {
              setMessages(prev => [...prev, messageData]);
            }
            break;
          case 'typing':
          case 'typing_start':
            handleTypingIndicator(data.data || data);
            break;
          case 'typing_stop':
            // Remove user from typing list
            if (data.user_id) {
              setTypingUsers(prev => prev.filter(t => t.user_id !== data.user_id));
            }
            break;
          case 'delete':
          case 'message_deleted':
            const deleteId = data.data?.message_id || data.message_id;
            if (deleteId) {
              setMessages(prev => prev.filter(m => m.id !== deleteId));
            }
            break;
          case 'edit':
          case 'message_edited':
            const editId = data.data?.message_id || data.message_id;
            const editContent = data.data?.content || data.content;
            if (editId) {
              setMessages(prev => prev.map(m => 
                m.id === editId ? { ...m, content: editContent, is_edited: true } : m
              ));
            }
            break;
          case 'user_joined':
          case 'member_joined':
          case 'user_left':
          case 'member_left':
          case 'user_online':
          case 'user_offline':
            // Could trigger member refresh
            break;
          case 'pong':
            // Response to ping
            break;
        }
      } catch (err) {
        log('WebSocket message parse error:', err);
      }
    };
    
    ws.onclose = () => {
      log('WebSocket closed');
      setIsConnected(false);
      // Attempt reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (groupId) connectWebSocket();
      }, 5000);
    };
    
    ws.onerror = (err) => {
      log('WebSocket error:', err);
      setIsConnected(false);
    };
    
    wsRef.current = ws;
  }, [groupId]);

  // Handle typing indicator from WebSocket
  const handleTypingIndicator = (data: any) => {
    setTypingUsers(prev => {
      const filtered = prev.filter(t => t.user_id !== data.user_id);
      return [...filtered, data];
    });
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      setTypingUsers(prev => prev.filter(t => t.user_id !== data.user_id));
    }, 10000);
  };

  // Fetch a user's profile
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      // Try to get from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .eq('id', userId)
        .single();
      
      if (profile) return profile;
      
      // Fallback to current user session if it's the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        const metadata = user.user_metadata || {};
        return {
          id: userId,
          full_name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'User',
          avatar_url: metadata.avatar_url || metadata.picture || null,
          email: user.email
        };
      }
      
      return { id: userId, full_name: 'User' };
    } catch (e) {
      return { id: userId, full_name: 'User' };
    }
  }, [supabase]);

  // Subscribe to Supabase Realtime for new messages (fallback when WebSocket fails)
  useEffect(() => {
    if (!groupId) return;

    log('Setting up Supabase Realtime subscription for group:', groupId);
    
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          log('Supabase Realtime: New message received:', payload);
          const newMessage = payload.new as any;
          
          // Check if we already have this message (avoid duplicates)
          const alreadyExists = await new Promise<boolean>(resolve => {
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMessage.id);
              resolve(exists);
              return prev;
            });
          });
          
          if (alreadyExists) {
            log('Message already exists, skipping');
            return;
          }
          
          // Fetch sender profile for the new message
          const senderProfile = await fetchUserProfile(newMessage.sender_id);
          
          setMessages(prev => {
            // Double-check to avoid race conditions
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, {
              ...newMessage,
              sender: senderProfile
            }];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          log('Supabase Realtime: Message updated:', payload);
          const updatedMessage = payload.new as any;
          setMessages(prev => prev.map(m => 
            m.id === updatedMessage.id 
              ? { ...m, content: updatedMessage.content, is_edited: updatedMessage.is_edited }
              : m
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          log('Supabase Realtime: Message deleted:', payload);
          const deletedMessage = payload.old as any;
          if (deletedMessage?.id) {
            setMessages(prev => prev.filter(m => m.id !== deletedMessage.id));
          }
        }
      )
      .subscribe((status) => {
        log('Supabase Realtime subscription status:', status);
      });

    return () => {
      log('Removing Supabase Realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [groupId, supabase, fetchUserProfile]);

  // Connect WebSocket on group change
  useEffect(() => {
    if (groupId) {
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [groupId, connectWebSocket]);

  // Polling fallback for new messages (when WebSocket/Realtime don't work)
  const pollForNewMessages = useCallback(async () => {
    if (!groupId || isLoading) return;
    
    try {
      const response = await fetch(groupsApi(`/api/groups/${groupId}/messages?limit=10`), {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (response.ok && data.success && data.messages) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = data.messages.filter((m: GroupMessage) => !existingIds.has(m.id));
          
          if (newMessages.length > 0) {
            log('Polling found new messages:', newMessages.length);
            return [...prev, ...newMessages].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }
          return prev;
        });
      }
    } catch (err) {
      // Silent fail for polling
    }
  }, [groupId, isLoading]);

  // Start polling when WebSocket is not connected
  useEffect(() => {
    if (!groupId) return;
    
    // Poll every 3 seconds when WebSocket is not connected
    if (!isConnected) {
      log('Starting polling fallback (WebSocket not connected)');
      pollingIntervalRef.current = setInterval(pollForNewMessages, 3000);
    } else {
      // Clear polling when WebSocket is connected
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [groupId, isConnected, pollForNewMessages]);

  // Fetch messages
  const fetchMessages = useCallback(async (reset = false) => {
    if (!groupId) return [];
    
    setIsLoading(true);
    setError(null);
    log('Fetching messages, reset:', reset);
    
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (!reset && cursor) {
        params.append('before', cursor);
      }
      
      const response = await fetch(groupsApi(`/api/groups/${groupId}/messages?${params}`), {
        credentials: 'include'  // Use cookie-based auth
      });
      const data: MessagesResponse = await response.json();
      log('Fetch messages response:', data);
      
      if (response.ok && data.success) {
        if (reset) {
          setMessages(data.messages);
        } else {
          setMessages(prev => [...data.messages, ...prev]);
        }
        setHasMore(data.hasMore);
        setCursor(data.cursor || null);
        return data.messages;
      } else {
        setError(data.error || 'Failed to fetch messages');
        return [];
      }
    } catch (err) {
      log('Fetch messages error:', err);
      setError('Failed to fetch messages');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [groupId, cursor]);

  // Send message via WebSocket or HTTP fallback
  const sendMessage = useCallback(async (input: SendMessageInput) => {
    if (!groupId) return null;
    
    setIsSending(true);
    setError(null);
    log('Sending message:', input);
    
    try {
      // Try WebSocket first if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'message',
          data: input
        }));
        // Message will come back via WebSocket
        setIsSending(false);
        return { pending: true };
      }

      // HTTP fallback (uses cookie auth)
      const response = await fetch(groupsApi(`/api/groups/${groupId}/messages`), {
        method: 'POST',
        credentials: 'include',  // Use cookie-based auth
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(input)
      });
      
      const data = await response.json();
      log('Send message response:', data);
      
      if (response.ok && data.success) {
        // Add message locally if not using WebSocket
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }
        return data.message;
      } else {
        setError(data.error || 'Failed to send message');
        return null;
      }
    } catch (err) {
      log('Send message error:', err);
      setError('Failed to send message');
      return null;
    } finally {
      setIsSending(false);
    }
  }, [groupId]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (!groupId) return false;
    log('Editing message:', messageId);
    
    try {
      const response = await fetch(groupsApi(`/api/groups/${groupId}/messages/${messageId}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ content })
      });
      
      const data = await response.json();
      log('Edit message response:', data);
      
      if (response.ok && data.success) {
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, content, is_edited: true } : m
        ));
        return true;
      }
      return false;
    } catch (err) {
      log('Edit message error:', err);
      return false;
    }
  }, [groupId]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string, forEveryone = false) => {
    if (!groupId) return false;
    log('Deleting message:', messageId, 'forEveryone:', forEveryone);
    
    try {
      const url = groupsApi(`/api/groups/${groupId}/messages/${messageId}${forEveryone ? '?for_everyone=true' : ''}`);
      const response = await fetch(url, { 
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      log('Delete message response:', data);
      
      if (response.ok && data.success) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        return true;
      }
      return false;
    } catch (err) {
      log('Delete message error:', err);
      return false;
    }
  }, [groupId]);

  // Upload media
  const uploadMedia = useCallback(async (file: File, caption?: string, replyToId?: string) => {
    if (!groupId) return null;
    
    setIsSending(true);
    setError(null);
    log('Uploading media:', file.name);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (caption) formData.append('caption', caption);
      if (replyToId) formData.append('reply_to_id', replyToId);
      
      const response = await fetch(groupsApi(`/api/groups/${groupId}/media`), {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      const data = await response.json();
      log('Upload media response:', data);
      
      if (response.ok && data.success) {
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }
        return data.message;
      } else {
        setError(data.error || 'Failed to upload media');
        return null;
      }
    } catch (err) {
      log('Upload media error:', err);
      setError('Failed to upload media');
      return null;
    } finally {
      setIsSending(false);
    }
  }, [groupId]);

  // Share stream
  const shareStream = useCallback(async (streamRoomId: string, message?: string) => {
    if (!groupId) return null;
    log('Sharing stream:', streamRoomId);
    
    setIsSending(true);
    
    try {
      const response = await fetch(groupsApi(`/api/groups/${groupId}/stream-share`), {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ stream_room_id: streamRoomId, message })
      });
      
      const data = await response.json();
      log('Share stream response:', data);
      
      if (response.ok && data.success) {
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }
        return data.message;
      }
      return null;
    } catch (err) {
      log('Share stream error:', err);
      return null;
    } finally {
      setIsSending(false);
    }
  }, [groupId]);

  // Set typing indicator via WebSocket
  const setTyping = useCallback(async () => {
    if (!groupId) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        data: { is_typing: true }
      }));
    }
    
    // Auto-clear after 5 seconds
    typingTimeoutRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'typing',
          data: { is_typing: false }
        }));
      }
    }, 5000);
  }, [groupId]);

  // Stop typing
  const stopTyping = useCallback(async () => {
    if (!groupId) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        data: { is_typing: false }
      }));
    }
  }, [groupId]);

  // Reset state when group changes
  useEffect(() => {
    setMessages([]);
    setHasMore(true);
    setCursor(null);
    setError(null);
    setTypingUsers([]);
  }, [groupId]);

  return {
    messages,
    isLoading,
    isSending,
    hasMore,
    error,
    typingUsers,
    isConnected,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    uploadMedia,
    shareStream,
    setTyping,
    stopTyping,
    clearError: () => setError(null)
  };
}
