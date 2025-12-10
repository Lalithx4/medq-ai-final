// Participants List Component - Modern UI
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StreamingParticipant } from '../types';
import {
  User,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  Crown,
  Shield,
  MoreVertical,
  UserMinus,
  UserPlus,
  Check,
  X,
  Search,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParticipantsListProps {
  participants: StreamingParticipant[];
  isHost: boolean;
  waitingRoom?: StreamingParticipant[];
  onMute?: (participantId: string) => void;
  onKick?: (participantId: string) => void;
  onPromote?: (participantId: string) => void;
  onDemote?: (participantId: string) => void;
  onAdmit?: (participantId: string) => void;
  onLowerHand?: (participantId: string) => void;
  className?: string;
}

export function ParticipantsList({
  participants,
  isHost,
  waitingRoom = [],
  onMute,
  onKick,
  onPromote,
  onDemote,
  onAdmit,
  onLowerHand,
  className,
}: ParticipantsListProps) {
  const [search, setSearch] = useState('');

  const filteredParticipants = participants.filter(p =>
    p.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const hosts = filteredParticipants.filter(p => p.role === 'host' || p.role === 'co-host');
  const viewers = filteredParticipants.filter(p => p.role === 'viewer');
  const raisedHands = filteredParticipants.filter(p => p.hand_raised);

  const ParticipantItem = ({ participant, index = 0 }: { participant: StreamingParticipant; index?: number }) => {
    const name = participant.user?.full_name || participant.user?.email || 'Unknown';
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-700/50 group transition-colors"
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 ring-2 ring-gray-600/50">
            <AvatarImage src={participant.user?.avatar_url} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-200">{name}</span>
              {participant.role === 'host' && (
                <Crown className="w-3.5 h-3.5 text-yellow-400" />
              )}
              {participant.role === 'co-host' && (
                <Shield className="w-3.5 h-3.5 text-blue-400" />
              )}
              {participant.hand_raised && (
                <motion.span
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  <Hand className="w-3.5 h-3.5 text-yellow-400" />
                </motion.span>
              )}
            </div>
            <span className="text-xs text-gray-500 capitalize">{participant.role}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Status indicators */}
          <span className={cn(
            "p-1 rounded-md",
            participant.is_muted ? "bg-red-500/20" : "bg-green-500/20"
          )}>
            {participant.is_muted ? (
              <MicOff className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-green-400" />
            )}
          </span>
          <span className={cn(
            "p-1 rounded-md",
            !participant.is_video_on ? "bg-red-500/20" : "bg-green-500/20"
          )}>
            {participant.is_video_on ? (
              <Video className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <VideoOff className="w-3.5 h-3.5 text-red-400" />
            )}
          </span>

          {/* Actions (host only) */}
          {isHost && participant.role !== 'host' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-600 transition-all">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                {!participant.is_muted && onMute && (
                  <DropdownMenuItem onClick={() => onMute(participant.id)} className="text-gray-200 hover:bg-gray-700">
                    <MicOff className="w-4 h-4 mr-2" />
                    Mute
                  </DropdownMenuItem>
                )}
                {participant.hand_raised && onLowerHand && (
                  <DropdownMenuItem onClick={() => onLowerHand(participant.id)} className="text-gray-200 hover:bg-gray-700">
                    <Hand className="w-4 h-4 mr-2" />
                    Lower hand
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-gray-700" />
                {participant.role === 'viewer' && onPromote && (
                  <DropdownMenuItem onClick={() => onPromote(participant.id)} className="text-gray-200 hover:bg-gray-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Make co-host
                  </DropdownMenuItem>
                )}
                {participant.role === 'co-host' && onDemote && (
                  <DropdownMenuItem onClick={() => onDemote(participant.id)} className="text-gray-200 hover:bg-gray-700">
                    <UserMinus className="w-4 h-4 mr-2" />
                    Remove co-host
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-gray-700" />
                {onKick && (
                  <DropdownMenuItem
                    onClick={() => onKick(participant.id)}
                    className="text-red-400 hover:bg-red-900/20"
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Remove from room
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full bg-gray-900/50 backdrop-blur-sm', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-purple-500/20 rounded-lg">
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="font-semibold text-white text-sm">
            Participants ({participants.length})
          </h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search participants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Waiting Room */}
        {isHost && waitingRoom.length > 0 && (
          <div className="p-4 border-b border-gray-700/50">
            <h4 className="text-sm font-medium text-orange-400 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Waiting Room ({waitingRoom.length})
            </h4>
            <AnimatePresence>
              {waitingRoom.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-2"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 ring-2 ring-orange-500/30">
                      <AvatarFallback className="text-xs bg-orange-500/30 text-orange-200">
                        {(p.user?.full_name || 'U')[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-200">{p.user?.full_name || p.user?.email}</span>
                  </div>
                  {onAdmit && (
                    <div className="flex gap-1">
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                          onClick={() => onAdmit(p.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </motion.div>
                      {onKick && (
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            onClick={() => onKick(p.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Raised Hands */}
        <AnimatePresence>
          {raisedHands.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-b border-gray-700/50"
            >
              <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
                <motion.span
                  animate={{ y: [0, -2, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                >
                  <Hand className="w-4 h-4" />
                </motion.span>
                Raised Hands ({raisedHands.length})
              </h4>
              {raisedHands.map((p, i) => (
                <ParticipantItem key={`hand-${p.id}`} participant={p} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hosts & Co-hosts */}
        {hosts.length > 0 && (
          <div className="p-4 border-b border-gray-700/50">
            <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              Hosts ({hosts.length})
            </h4>
            {hosts.map((p, i) => (
              <ParticipantItem key={p.id} participant={p} index={i} />
            ))}
          </div>
        )}

        {/* Viewers */}
        {viewers.length > 0 && (
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-2">
              Viewers ({viewers.length})
            </h4>
            {viewers.map((p, i) => (
              <ParticipantItem key={p.id} participant={p} index={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {filteredParticipants.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
              <User className="w-6 h-6" />
            </div>
            <p className="text-sm">No participants found</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
