"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OnlineUser {
  userId: string;
  email?: string;
  name?: string;
  avatar?: string;
  lastSeen: string;
}

interface CollectionPresenceProps {
  collectionId: string | null;
  maxAvatars?: number;
  className?: string;
}

export function CollectionPresence({
  collectionId,
  maxAvatars = 4,
  className = "",
}: CollectionPresenceProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isActive, setIsActive] = useState(false);

  // Heartbeat - update presence every 30 seconds
  const updatePresence = useCallback(async () => {
    if (!collectionId) return;
    
    try {
      await fetch("/api/file-manager/collections/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, isActive: true }),
      });
    } catch (error) {
      console.error("Failed to update presence:", error);
    }
  }, [collectionId]);

  // Fetch online users
  const fetchPresence = useCallback(async () => {
    if (!collectionId) return;
    
    try {
      const res = await fetch(`/api/file-manager/collections/presence?collectionId=${collectionId}`);
      const data = await res.json();
      if (res.ok) {
        setOnlineUsers(data.onlineUsers || []);
      }
    } catch (error) {
      console.error("Failed to fetch presence:", error);
    }
  }, [collectionId]);

  // Leave collection (mark as offline)
  const leavePresence = useCallback(async () => {
    if (!collectionId) return;
    
    try {
      await fetch(`/api/file-manager/collections/presence?collectionId=${collectionId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to leave presence:", error);
    }
  }, [collectionId]);

  useEffect(() => {
    if (!collectionId) {
      setOnlineUsers([]);
      return;
    }

    setIsActive(true);
    
    // Initial update and fetch
    updatePresence();
    fetchPresence();

    // Set up intervals
    const heartbeatInterval = setInterval(updatePresence, 30000); // Every 30 seconds
    const fetchInterval = setInterval(fetchPresence, 15000); // Every 15 seconds

    // Cleanup
    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(fetchInterval);
      leavePresence();
      setIsActive(false);
    };
  }, [collectionId, updatePresence, fetchPresence, leavePresence]);

  if (!collectionId || onlineUsers.length === 0) {
    return null;
  }

  const displayUsers = onlineUsers.slice(0, maxAvatars);
  const extraCount = onlineUsers.length - maxAvatars;

  const getInitials = (email?: string, name?: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "?";
  };

  // Generate a consistent color from email
  const getAvatarColor = (email?: string) => {
    if (!email) return "hsl(var(--primary))";
    const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex items-center -space-x-2">
        <AnimatePresence mode="popLayout">
          {displayUsers.map((user, index) => (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, scale: 0.5, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: -10 }}
              transition={{ delay: index * 0.05 }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar className="h-7 w-7 ring-2 ring-background">
                        <AvatarImage src={user.avatar} alt={user.name || user.email} />
                        <AvatarFallback
                          className="text-[10px] font-medium text-white"
                          style={{ backgroundColor: getAvatarColor(user.email) }}
                        >
                          {getInitials(user.email, user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p className="font-medium">{user.name || user.email?.split("@")[0]}</p>
                    {user.email && <p className="text-muted-foreground">{user.email}</p>}
                    <p className="text-green-500 text-[10px] mt-0.5">● Online now</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {extraCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground ring-2 ring-background"
          >
            +{extraCount}
          </motion.div>
        )}
      </div>
      
      {onlineUsers.length > 0 && (
        <span className="ml-2 text-xs text-muted-foreground">
          {onlineUsers.length} online
        </span>
      )}
    </div>
  );
}

export default CollectionPresence;
