// Online Status Component - Shows user online/offline status
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export type OnlineStatus = 'online' | 'away' | 'busy' | 'offline';

interface UserPresence {
  userId: string;
  status: OnlineStatus;
  lastSeen?: string;
  customStatus?: string;
}

interface OnlineStatusIndicatorProps {
  status: OnlineStatus;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  className?: string;
}

const statusColors: Record<OnlineStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400'
};

const statusLabels: Record<OnlineStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Do not disturb',
  offline: 'Offline'
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3'
};

export function OnlineStatusIndicator({
  status,
  size = 'sm',
  showPulse = true,
  className
}: OnlineStatusIndicatorProps) {
  return (
    <span
      className={cn(
        "relative inline-block rounded-full",
        statusColors[status],
        sizeClasses[size],
        className
      )}
      title={statusLabels[status]}
    >
      {showPulse && status === 'online' && (
        <span
          className={cn(
            "absolute inset-0 rounded-full animate-ping opacity-75",
            statusColors[status]
          )}
        />
      )}
    </span>
  );
}

// Badge with status indicator (for avatars)
interface OnlineStatusBadgeProps {
  status: OnlineStatus;
  className?: string;
}

export function OnlineStatusBadge({
  status,
  className
}: OnlineStatusBadgeProps) {
  return (
    <div
      className={cn(
        "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background",
        statusColors[status],
        "w-3 h-3",
        className
      )}
    />
  );
}

// Text indicator with last seen
interface OnlineStatusTextProps {
  status: OnlineStatus;
  lastSeen?: string;
  customStatus?: string;
  className?: string;
}

export function OnlineStatusText({
  status,
  lastSeen,
  customStatus,
  className
}: OnlineStatusTextProps) {
  if (customStatus) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {customStatus}
      </span>
    );
  }

  if (status === 'online') {
    return (
      <span className={cn("text-xs text-green-600 flex items-center gap-1", className)}>
        <OnlineStatusIndicator status="online" size="sm" showPulse={false} />
        Online
      </span>
    );
  }

  if (status === 'away') {
    return (
      <span className={cn("text-xs text-yellow-600 flex items-center gap-1", className)}>
        <OnlineStatusIndicator status="away" size="sm" />
        Away
      </span>
    );
  }

  if (status === 'busy') {
    return (
      <span className={cn("text-xs text-red-600 flex items-center gap-1", className)}>
        <OnlineStatusIndicator status="busy" size="sm" />
        Do not disturb
      </span>
    );
  }

  // Offline - show last seen
  if (lastSeen) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Last seen {formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}
      </span>
    );
  }

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      Offline
    </span>
  );
}

// Hook for managing presence
interface UsePresenceOptions {
  groupId?: string;
  updateInterval?: number;
}

interface PresenceState {
  presences: Record<string, UserPresence>;
  isConnected: boolean;
}

export function usePresence(options: UsePresenceOptions = {}) {
  const { groupId, updateInterval = 30000 } = options;
  const [state, setState] = useState<PresenceState>({
    presences: {},
    isConnected: false
  });

  // Update own presence
  const updatePresence = useCallback(async (status: OnlineStatus, customStatus?: string) => {
    if (!groupId) return;
    
    try {
      await fetch(`/api/groups/${groupId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, custom_status: customStatus })
      });
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }, [groupId]);

  // Fetch presences
  const fetchPresences = useCallback(async () => {
    if (!groupId) return;
    
    try {
      const response = await fetch(`/api/groups/${groupId}/presence`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.presences) {
          const presenceMap: Record<string, UserPresence> = {};
          for (const p of data.presences) {
            presenceMap[p.user_id] = {
              userId: p.user_id,
              status: p.status || 'offline',
              lastSeen: p.last_seen,
              customStatus: p.custom_status
            };
          }
          setState(prev => ({
            ...prev,
            presences: presenceMap,
            isConnected: true
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch presences:', error);
    }
  }, [groupId]);

  // Set up polling and heartbeat
  useEffect(() => {
    if (!groupId) return;

    // Initial fetch
    fetchPresences();
    
    // Update own presence to online
    updatePresence('online');

    // Poll for updates
    const pollInterval = setInterval(fetchPresences, updateInterval);
    
    // Heartbeat to keep presence alive
    const heartbeatInterval = setInterval(() => {
      updatePresence('online');
    }, updateInterval);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence('online');
      } else {
        updatePresence('away');
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      // Try to update status to offline
      navigator.sendBeacon?.(
        `/api/groups/${groupId}/presence`,
        JSON.stringify({ status: 'offline' })
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Update to offline on cleanup
      updatePresence('offline');
    };
  }, [groupId, updateInterval, fetchPresences, updatePresence]);

  // Get presence for a specific user
  const getPresence = useCallback((userId: string): UserPresence => {
    return state.presences[userId] || {
      userId,
      status: 'offline'
    };
  }, [state.presences]);

  // Check if user is online
  const isOnline = useCallback((userId: string): boolean => {
    const presence = state.presences[userId];
    return presence?.status === 'online';
  }, [state.presences]);

  // Get all online users
  const getOnlineUsers = useCallback((): string[] => {
    return Object.entries(state.presences)
      .filter(([_, p]) => p.status === 'online')
      .map(([userId]) => userId);
  }, [state.presences]);

  return {
    presences: state.presences,
    isConnected: state.isConnected,
    getPresence,
    isOnline,
    getOnlineUsers,
    updatePresence,
    fetchPresences
  };
}

// Member list item with online status
interface MemberStatusItemProps {
  userId: string;
  name: string;
  avatarUrl?: string;
  status: OnlineStatus;
  lastSeen?: string;
  customStatus?: string;
  className?: string;
}

export function MemberStatusItem({
  userId,
  name,
  avatarUrl,
  status,
  lastSeen,
  customStatus,
  className
}: MemberStatusItemProps) {
  return (
    <div className={cn("flex items-center gap-3 p-2", className)}>
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <OnlineStatusBadge status={status} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{name}</p>
        <OnlineStatusText
          status={status}
          lastSeen={lastSeen}
          customStatus={customStatus}
        />
      </div>
    </div>
  );
}
