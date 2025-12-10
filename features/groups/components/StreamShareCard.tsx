// Stream Share Card Component
'use client';

import { motion } from 'framer-motion';
import { Video, Users, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GroupStreamShare } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface StreamShareCardProps {
  streamShare: GroupStreamShare;
  isOwn: boolean;
  onJoin: (roomCode: string) => void;
  className?: string;
}

export function StreamShareCard({
  streamShare,
  isOwn,
  onJoin,
  className
}: StreamShareCardProps) {
  const isActive = streamShare.is_active;
  const sharedAt = formatDistanceToNow(new Date(streamShare.shared_at), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-lg border overflow-hidden",
        isActive 
          ? "bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20" 
          : "bg-muted/50 border-muted",
        className
      )}
    >
      {/* Header */}
      <div className="p-3 pb-2">
        <div className="flex items-start gap-3">
          {/* Sender Avatar */}
          <Avatar className="h-8 w-8 mt-0.5">
            <AvatarImage src={streamShare.sharer?.avatar_url || ''} />
            <AvatarFallback>
              {streamShare.sharer?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Sender Name & Time */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">
                {isOwn ? 'You' : streamShare.sharer?.full_name || 'Someone'}
              </span>
              <span className="text-xs text-muted-foreground">
                shared a stream {sharedAt}
              </span>
            </div>

            {/* Stream Info */}
            <div className="bg-background rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isActive 
                    ? "bg-primary/10" 
                    : "bg-muted"
                )}>
                  <Video className={cn(
                    "w-5 h-5",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">
                    {streamShare.stream?.room_name || 'Video Stream'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Room: {streamShare.room_code}
                  </p>
                </div>
                {isActive && (
                  <Badge 
                    variant="secondary" 
                    className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                    Live
                  </Badge>
                )}
              </div>

              {/* Stream Description */}
              {streamShare.stream?.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {streamShare.stream.description}
                </p>
              )}

              {/* Stream Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{streamShare.stream?.participant_count || 0} watching</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Started {streamShare.stream?.started_at 
                      ? formatDistanceToNow(new Date(streamShare.stream.started_at), { addSuffix: true })
                      : 'recently'}
                  </span>
                </div>
              </div>

              {/* Join Button */}
              <Button
                onClick={() => streamShare.room_code && onJoin(streamShare.room_code)}
                disabled={!isActive || !streamShare.room_code}
                className="w-full"
                variant={isActive ? 'default' : 'secondary'}
              >
                {isActive ? (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Join Stream
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Stream Ended
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
