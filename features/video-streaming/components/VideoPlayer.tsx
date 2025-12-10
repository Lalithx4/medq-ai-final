// Video Player Component - Modern UI
'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { IAgoraRTCRemoteUser, ICameraVideoTrack, ILocalVideoTrack } from 'agora-rtc-sdk-ng';
import { cn } from '@/lib/utils';
import { User, Mic, MicOff, Pin, MoreVertical, Crown, Monitor } from 'lucide-react';

interface VideoPlayerProps {
  // For local video
  localVideoTrack?: ICameraVideoTrack | ILocalVideoTrack | null;
  // For remote users
  remoteUser?: IAgoraRTCRemoteUser;
  // Display info
  userName?: string;
  isHost?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  isLocal?: boolean;
  isScreenShare?: boolean;
  // Styling
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
  // Actions
  onPin?: () => void;
  onMoreOptions?: () => void;
}

export function VideoPlayer({
  localVideoTrack,
  remoteUser,
  userName = 'Unknown',
  isHost = false,
  isMuted = false,
  isPinned = false,
  isLocal = false,
  isScreenShare = false,
  className,
  size = 'medium',
  onPin,
  onMoreOptions,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);

  // Play local video track
  useEffect(() => {
    if (!videoRef.current) return;

    if (localVideoTrack) {
      localVideoTrack.play(videoRef.current);
      return () => {
        localVideoTrack.stop();
      };
    }
  }, [localVideoTrack]);

  // Play remote video track
  useEffect(() => {
    if (!videoRef.current || !remoteUser) return;

    if (remoteUser.videoTrack) {
      remoteUser.videoTrack.play(videoRef.current);
    }

    return () => {
      remoteUser.videoTrack?.stop();
    };
  }, [remoteUser, remoteUser?.videoTrack]);

  const hasVideo = localVideoTrack || remoteUser?.videoTrack;

  const sizeClasses = {
    small: 'w-32 h-24 rounded-xl',
    medium: 'w-64 h-48 rounded-2xl',
    large: 'w-96 h-72 rounded-2xl',
    full: 'w-full h-full rounded-none',
  };

  // Get initials
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative bg-gray-900 overflow-hidden group',
        sizeClasses[size],
        isPinned && 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20',
        className
      )}
    >
      {/* Video container */}
      <div
        ref={videoRef}
        className={cn(
          'absolute inset-0',
          isLocal && !isScreenShare && 'scale-x-[-1]' // Mirror local video
        )}
      />

      {/* No video placeholder */}
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
            <span className="text-sm text-gray-400 font-medium">{userName}</span>
          </motion.div>
        </div>
      )}

      {/* Overlay info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Mute indicator */}
            <span className={cn(
              "p-1 rounded-md",
              isMuted ? "bg-red-500/30" : "bg-green-500/30"
            )}>
              {isMuted ? (
                <MicOff className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-green-400" />
              )}
            </span>
            
            {/* Name */}
            <span className="text-white text-sm font-medium truncate max-w-[150px]">
              {userName}
              {isLocal && ' (You)'}
            </span>

            {/* Host badge */}
            {isHost && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white text-xs rounded-full font-medium shadow-lg shadow-yellow-500/30">
                <Crown className="w-3 h-3" />
                Host
              </span>
            )}

            {/* Screen share badge */}
            {isScreenShare && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-green-500/90 to-emerald-500/90 text-white text-xs rounded-full font-medium shadow-lg shadow-green-500/30">
                <Monitor className="w-3 h-3" />
                Screen
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover actions */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {onPin && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onPin}
            className={cn(
              'p-2 rounded-lg bg-gray-900/70 backdrop-blur-sm hover:bg-gray-900/90 transition-colors',
              isPinned && 'text-blue-400 bg-blue-500/20'
            )}
            title={isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin className="w-4 h-4 text-white" />
          </motion.button>
        )}
        {onMoreOptions && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onMoreOptions}
            className="p-2 rounded-lg bg-gray-900/70 backdrop-blur-sm hover:bg-gray-900/90 transition-colors"
            title="More options"
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </motion.button>
        )}
      </motion.div>

      {/* Local indicator */}
      {isLocal && size !== 'full' && (
        <div className="absolute top-3 left-3">
          <span className="px-2 py-0.5 bg-blue-500/90 text-white text-xs rounded-full font-medium">
            You
          </span>
        </div>
      )}
    </motion.div>
  );
}
