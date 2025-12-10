// Group Card Component
'use client';

import { motion } from 'framer-motion';
import { Users, Clock, MessageCircle, Radio } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { GroupSummary } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface GroupCardProps {
  group: GroupSummary;
  onClick?: () => void;
  isSelected?: boolean;
}

export function GroupCard({ group, onClick, isSelected }: GroupCardProps) {
  const initials = group.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formatLastMessage = () => {
    if (!group.last_message) return 'No messages yet';
    
    const { content, message_type } = group.last_message;
    
    switch (message_type) {
      case 'image':
        return '📷 Photo';
      case 'file':
        return '📎 File';
      case 'audio':
        return '🎵 Audio';
      case 'video':
        return '🎬 Video';
      case 'stream_share':
        return '🎥 Stream shared';
      case 'system':
        return content || 'System message';
      default:
        return content?.slice(0, 50) + (content && content.length > 50 ? '...' : '') || '';
    }
  };

  const formatTime = () => {
    if (!group.last_message) return '';
    try {
      return formatDistanceToNow(new Date(group.last_message.created_at), { addSuffix: false });
    } catch {
      return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
        "hover:bg-accent/50",
        isSelected && "bg-accent"
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className="w-12 h-12 ring-2 ring-background">
          <AvatarImage src={group.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {group.member_count > 0 && (
          <div className="absolute -bottom-1 -right-1 bg-muted rounded-full px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-0.5 border-2 border-background">
            <Users className="w-2.5 h-2.5" />
            {group.member_count}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm truncate">{group.name}</h3>
          {group.last_message && (
            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
              {formatTime()}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {formatLastMessage()}
        </p>
      </div>

      {/* Unread Badge */}
      {group.unread_count && group.unread_count > 0 && (
        <Badge className="bg-primary text-primary-foreground h-5 min-w-5 flex items-center justify-center rounded-full text-xs px-1.5">
          {group.unread_count > 99 ? '99+' : group.unread_count}
        </Badge>
      )}
    </motion.div>
  );
}
