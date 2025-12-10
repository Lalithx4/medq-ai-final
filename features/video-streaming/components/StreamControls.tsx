// Stream Controls Component - Modern UI
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  Phone,
  PhoneOff,
  Settings,
  Users,
  MessageSquare,
  Hand,
  Circle,
  MoreHorizontal,
  Copy,
  Share2,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ShareToGroupModal } from '@/features/groups/components';

interface StreamControlsProps {
  // State
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isRecording?: boolean;
  isHost?: boolean;
  isLive?: boolean;
  roomCode?: string;
  roomName?: string;
  handRaised?: boolean;
  participantCount?: number;
  chatUnread?: number;
  // Actions
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording?: () => void;
  onLeave: () => void;
  onEndStream?: () => void;
  onStartStream?: () => void;
  onToggleChat?: () => void;
  onToggleParticipants?: () => void;
  onRaiseHand?: () => void;
  onSettings?: () => void;
  // Styling
  className?: string;
}

export function StreamControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isRecording = false,
  isHost = false,
  isLive = false,
  roomCode,
  roomName,
  handRaised = false,
  participantCount = 0,
  chatUnread = 0,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onLeave,
  onEndStream,
  onStartStream,
  onToggleChat,
  onToggleParticipants,
  onRaiseHand,
  onSettings,
  className,
}: StreamControlsProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showShareToGroup, setShowShareToGroup] = useState(false);

  const copyRoomLink = () => {
    const link = `${window.location.origin}/video-streaming/${roomCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Room link copied to clipboard!');
    setShowShareMenu(false);
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      toast.success('Room code copied!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center justify-center gap-2 p-3 bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50',
        className
      )}
    >
      {/* Start/End Stream (Host only) */}
      {isHost && !isLive && onStartStream && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={onStartStream}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 shadow-lg shadow-green-500/30"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Go Live
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>Start streaming</TooltipContent>
        </Tooltip>
      )}

      {/* Audio Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleAudio}
            className={cn(
              'p-3.5 rounded-xl transition-all',
              isAudioEnabled
                ? 'bg-gray-700/80 hover:bg-gray-600 text-white'
                : 'bg-red-500/90 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
            )}
          >
            {isAudioEnabled ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent>
          {isAudioEnabled ? 'Mute' : 'Unmute'}
        </TooltipContent>
      </Tooltip>

      {/* Video Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleVideo}
            className={cn(
              'p-3.5 rounded-xl transition-all',
              isVideoEnabled
                ? 'bg-gray-700/80 hover:bg-gray-600 text-white'
                : 'bg-red-500/90 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
            )}
          >
            {isVideoEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent>
          {isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        </TooltipContent>
      </Tooltip>

      {/* Screen Share (Host/Co-host) */}
      {isHost && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleScreenShare}
              className={cn(
                'p-3.5 rounded-xl transition-all',
                isScreenSharing
                  ? 'bg-green-500/90 hover:bg-green-600 text-white shadow-lg shadow-green-500/30'
                  : 'bg-gray-700/80 hover:bg-gray-600 text-white'
              )}
            >
              {isScreenSharing ? (
                <ScreenShareOff className="w-5 h-5" />
              ) : (
                <ScreenShare className="w-5 h-5" />
              )}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            {isScreenSharing ? 'Stop sharing' : 'Share screen'}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Recording (Host only) */}
      {isHost && onToggleRecording && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleRecording}
              className={cn(
                'p-3.5 rounded-xl transition-all',
                isRecording
                  ? 'bg-red-500/90 hover:bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/30'
                  : 'bg-gray-700/80 hover:bg-gray-600 text-white'
              )}
            >
              <Circle className={cn('w-5 h-5', isRecording && 'fill-current')} />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            {isRecording ? 'Stop recording' : 'Start recording'}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Divider */}
      <div className="w-px h-8 bg-gray-600/50 mx-1" />

      {/* Raise Hand (Viewers) */}
      {!isHost && onRaiseHand && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onRaiseHand}
              className={cn(
                'p-3.5 rounded-xl transition-all',
                handRaised
                  ? 'bg-yellow-500/90 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-500/30'
                  : 'bg-gray-700/80 hover:bg-gray-600 text-white'
              )}
            >
              <Hand className="w-5 h-5" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            {handRaised ? 'Lower hand' : 'Raise hand'}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Participants */}
      {onToggleParticipants && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleParticipants}
              className="p-3.5 rounded-xl bg-gray-700/80 hover:bg-gray-600 text-white relative"
            >
              <Users className="w-5 h-5" />
              {participantCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {participantCount > 99 ? '99+' : participantCount}
                </span>
              )}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>Participants</TooltipContent>
        </Tooltip>
      )}

      {/* Chat */}
      {onToggleChat && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleChat}
              className="p-3.5 rounded-xl bg-gray-700/80 hover:bg-gray-600 text-white relative"
            >
              <MessageSquare className="w-5 h-5" />
              {chatUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {chatUnread > 99 ? '99+' : chatUnread}
                </span>
              )}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>Chat</TooltipContent>
        </Tooltip>
      )}

      {/* Share */}
      <DropdownMenu open={showShareMenu} onOpenChange={setShowShareMenu}>
        <DropdownMenuTrigger asChild>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-3.5 rounded-xl bg-gray-700/80 hover:bg-gray-600 text-white"
          >
            <Share2 className="w-5 h-5" />
          </motion.button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48 bg-gray-800 border-gray-700">
          <DropdownMenuItem onClick={copyRoomLink} className="text-gray-200 hover:bg-gray-700">
            <Copy className="w-4 h-4 mr-2" />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyRoomCode} className="text-gray-200 hover:bg-gray-700">
            <Copy className="w-4 h-4 mr-2" />
            Copy room code
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem 
            onClick={() => {
              setShowShareMenu(false);
              setShowShareToGroup(true);
            }} 
            className="text-gray-200 hover:bg-gray-700"
          >
            <UsersRound className="w-4 h-4 mr-2" />
            Share to Group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share to Group Modal */}
      {roomCode && (
        <ShareToGroupModal
          open={showShareToGroup}
          onOpenChange={setShowShareToGroup}
          roomCode={roomCode}
          roomName={roomName || 'Video Stream'}
        />
      )}

      {/* Settings */}
      {onSettings && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onSettings}
              className="p-3.5 rounded-xl bg-gray-700/80 hover:bg-gray-600 text-white"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      )}

      {/* More Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-3.5 rounded-xl bg-gray-700/80 hover:bg-gray-600 text-white"
          >
            <MoreHorizontal className="w-5 h-5" />
          </motion.button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
          {roomCode && (
            <>
              <div className="px-2 py-1.5 text-xs text-gray-400">
                Room: {roomCode}
              </div>
              <DropdownMenuSeparator className="bg-gray-700" />
            </>
          )}
          <DropdownMenuItem onClick={copyRoomLink} className="text-gray-200 hover:bg-gray-700">
            <Share2 className="w-4 h-4 mr-2" />
            Share room link
          </DropdownMenuItem>
          {isHost && onEndStream && isLive && (
            <>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem
                onClick={onEndStream}
                className="text-red-400 hover:bg-red-900/20"
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                End stream for all
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-600/50 mx-1" />

      {/* Leave/End */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={isHost && isLive ? onEndStream : onLeave}
            className="p-3.5 rounded-xl bg-red-500/90 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
          >
            {isHost && isLive ? (
              <PhoneOff className="w-5 h-5" />
            ) : (
              <Phone className="w-5 h-5 rotate-[135deg]" />
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent>
          {isHost && isLive ? 'End stream' : 'Leave'}
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}
