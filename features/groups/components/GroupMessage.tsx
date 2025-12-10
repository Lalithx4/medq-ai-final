// Group Message Component
'use client';

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  MoreVertical, 
  Reply, 
  Trash2, 
  Edit2, 
  Copy, 
  Download,
  Play,
  FileText,
  Image as ImageIcon,
  Video,
  Radio,
  Pin,
  PinOff,
  Smile
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { GroupMessage as GroupMessageType, GroupMedia, GroupMessageExtended } from '../types';
import { useReactions, usePinnedMessages } from '../hooks';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { LinkPreview, extractUrls } from './LinkPreview';
import { ReadIndicator } from './ReadReceipts';
import { MentionRenderer } from './SmartMentions';
import { PollDisplay } from './PollDisplay';
import { usePolls } from '../hooks';

interface GroupMessageProps {
  message: GroupMessageExtended;
  isOwnMessage: boolean;
  groupId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  readStatus?: 'sent' | 'delivered' | 'read';
  onReply?: (message: GroupMessageExtended) => void;
  onEdit?: (message: GroupMessageExtended) => void;
  onDelete?: (messageId: string, forEveryone: boolean) => void;
  showSender?: boolean;
}

export function GroupMessage({
  message,
  isOwnMessage,
  groupId,
  currentUserId,
  isAdmin = false,
  readStatus,
  onReply,
  onEdit,
  onDelete,
  showSender = true
}: GroupMessageProps) {
  const { reactions, toggleReaction, getReactions } = useReactions();
  const { pinMessage, unpinMessage } = usePinnedMessages();
  const { polls, getPoll, votePoll, closePoll, isVoting } = usePolls();

  const messageReactions = reactions[message.id] || [];
  const isPollMessage = message.metadata?.is_poll === true;
  const pollId = message.metadata?.poll_id;
  const pollData = pollId ? polls[pollId] : undefined;

  // Quick emoji reactions
  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Load reactions on mount
  useEffect(() => {
    getReactions(groupId, message.id);
  }, [message.id, groupId, getReactions]);

  // Load poll data if this is a poll message
  useEffect(() => {
    if (isPollMessage && pollId && !pollData) {
      getPoll(groupId, pollId);
    }
  }, [isPollMessage, pollId, pollData, groupId, getPoll]);

  const handlePollVote = async (optionIds: string[]) => {
    if (!pollId) return;
    await votePoll(groupId, pollId, optionIds);
  };

  const handlePollClose = async () => {
    if (!pollId) return;
    await closePoll(groupId, pollId);
  };

  const handleReaction = async (emoji: string) => {
    await toggleReaction(groupId, message.id, emoji);
  };

  const handlePin = async () => {
    if (message.is_pinned) {
      await unpinMessage(groupId, message.id);
    } else {
      await pinMessage(groupId, message.id);
    }
  };

  // Get sender name with better fallbacks
  const senderName = 
    message.sender?.full_name || 
    message.sender?.name || 
    message.sender?.email?.split('@')[0] || 
    'User';
  const senderInitials = senderName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'HH:mm');
    } catch {
      return '';
    }
  };

  // Check if message is emoji only
  const isEmojiOnly = (text: string) => {
    const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+$/u;
    return emojiRegex.test(text) && text.length <= 8;
  };

  const renderContent = () => {
    // System message
    if (message.message_type === 'system') {
      return (
        <div className="text-center py-2">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {senderName} {message.content}
          </span>
        </div>
      );
    }

    // Deleted message
    if (message.is_deleted) {
      return (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground italic text-sm",
          isOwnMessage ? "bg-primary/10" : "bg-muted"
        )}>
          <Trash2 className="w-3.5 h-3.5" />
          {message.deleted_for_everyone ? 'This message was deleted' : 'You deleted this message'}
        </div>
      );
    }

    // Poll message - show poll display or loading state
    if (isPollMessage) {
      if (pollData && currentUserId) {
        return (
          <div className="max-w-md">
            <PollDisplay 
              poll={pollData} 
              currentUserId={currentUserId}
              onVote={handlePollVote}
              onClose={handlePollClose}
              isAdmin={isAdmin}
              isVoting={isVoting}
            />
          </div>
        );
      }
      // Show loading/placeholder for poll when data isn't available
      return (
        <div className={cn(
          "rounded-xl border bg-card overflow-hidden max-w-md p-4",
          isOwnMessage ? "bg-primary/5 border-primary/20" : ""
        )}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Radio className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Poll</span>
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {message.content || 'Loading poll...'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Stream share
    if (message.message_type === 'stream_share') {
      const metadata = message.metadata;
      return (
        <div className={cn(
          "rounded-xl overflow-hidden",
          isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          {message.content && (
            <p className="px-3 pt-3 text-sm">{message.content}</p>
          )}
          <div className={cn(
            "m-2 p-3 rounded-lg",
            isOwnMessage ? "bg-black/20" : "bg-background"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Radio className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">{metadata?.stream_title || 'Live Stream'}</p>
                <p className="text-xs opacity-70">Tap to join</p>
              </div>
            </div>
            <Link href={`/video-streaming/${metadata?.room_code}`}>
              <Button size="sm" variant={isOwnMessage ? "secondary" : "default"} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Join Stream
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    // Image
    if (message.message_type === 'image') {
      const media = message.media?.[0];
      return (
        <div className="space-y-1">
          {media && (
            <div className="rounded-xl overflow-hidden max-w-[200px] sm:max-w-[280px]">
              <img 
                src={media.file_url} 
                alt={media.file_name}
                loading="lazy"
                decoding="async"
                className="w-full h-auto max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(media.file_url, '_blank')}
              />
            </div>
          )}
          {message.content && (
            <p className={cn(
              "text-sm px-1",
              isOwnMessage ? "text-primary-foreground" : ""
            )}>
              {message.content}
            </p>
          )}
        </div>
      );
    }

    // File/Document
    if (message.message_type === 'file') {
      const media = message.media?.[0];
      const metadata = message.metadata;
      const fileName = media?.file_name || metadata?.file_name || 'File';
      const fileSize = media?.file_size || metadata?.file_size;
      
      return (
        <div className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-xl",
          isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <div className={cn(
            "p-2 rounded-lg",
            isOwnMessage ? "bg-white/20" : "bg-background"
          )}>
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{fileName}</p>
            {fileSize && (
              <p className="text-xs opacity-70">
                {(fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
          {media && (
            <a href={media.file_url} download={fileName} target="_blank" rel="noopener noreferrer">
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Download className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>
      );
    }

    // Text message
    const emojiOnly = message.content && isEmojiOnly(message.content);
    const urls = message.content ? extractUrls(message.content) : [];
    
    return (
      <div className="space-y-2">
        <div className={cn(
          "rounded-xl",
          emojiOnly ? "text-4xl py-1" : cn(
            "px-3 py-2 text-sm",
            isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
          )
        )}>
          {/* Reply preview */}
          {message.reply_to && (
            <div className={cn(
              "text-xs mb-2 pb-2 border-b",
              isOwnMessage ? "border-white/20" : "border-border"
            )}>
              <p className="font-medium opacity-70">
                {message.reply_to.sender?.full_name || 'Reply'}
              </p>
              <p className="truncate opacity-60">
                {message.reply_to.content?.slice(0, 50)}
              </p>
            </div>
          )}
          
          {/* Message content with mentions */}
          <MentionRenderer 
            text={message.content || ''} 
            currentUserId={currentUserId}
            className="whitespace-pre-wrap break-words"
          />
          
          {message.is_edited && (
            <span className={cn(
              "text-xs",
              isOwnMessage ? "text-primary-foreground/60" : "text-muted-foreground"
            )}>
              {' '}(edited)
            </span>
          )}
        </div>
        
        {/* Link previews */}
        {urls.length > 0 && (
          <div className="space-y-2 max-w-sm">
            {urls.slice(0, 2).map((url, index) => (
              <LinkPreview key={index} url={url} compact={urls.length > 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Don't render sender info for system messages
  if (message.message_type === 'system') {
    return renderContent();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex gap-2 px-2 py-1 relative",
        isOwnMessage && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      {showSender && !isOwnMessage && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.sender?.avatar_url || message.sender?.image} />
          <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {senderInitials}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message */}
      <div className={cn("max-w-[70%]", isOwnMessage && "items-end")}>
        {/* Sender name */}
        {showSender && !isOwnMessage && (
          <p className="text-xs font-medium text-muted-foreground mb-1 ml-1">
            {senderName}
          </p>
        )}

        <div className="relative">
          {/* Pin indicator */}
          {message.is_pinned && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Pin className="w-3 h-3" />
              <span>Pinned</span>
            </div>
          )}
          
          {renderContent()}
          
          {/* Reactions */}
          {messageReactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {messageReactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => handleReaction(reaction.emoji)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                    "border transition-all hover:scale-105",
                    reaction.hasReacted
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-muted border-border"
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span className="font-medium">{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
          
          {/* Time and Read Status */}
          <div className={cn(
            "flex items-center gap-1 mt-0.5",
            isOwnMessage ? "justify-end" : ""
          )}>
            <span className="text-[10px] opacity-60">
              {formatTime(message.created_at)}
            </span>
            {isOwnMessage && readStatus && (
              <ReadIndicator status={readStatus} />
            )}
          </div>
        </div>
      </div>

      {/* Quick Reactions & Actions - Always visible on the side */}
      {!message.is_deleted && (
        <div className={cn(
          "flex items-center gap-0.5 self-center",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "md:opacity-100", // Always visible on larger screens
          isOwnMessage && "flex-row-reverse"
        )}>
          {/* Reaction Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-muted/80"
              >
                <Smile className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 z-50" align="start" side="top">
              <div className="flex gap-1">
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="text-xl hover:scale-125 transition-transform p-1 rounded hover:bg-muted"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-muted/80"
            onClick={() => onReply?.(message)}
          >
            <Reply className="w-4 h-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 hover:bg-muted/80"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align={isOwnMessage ? "end" : "start"} 
              className="z-50 min-w-[160px]"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={() => {
                navigator.clipboard.writeText(message.content || '');
              }}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </DropdownMenuItem>
              
              {isAdmin && (
                <DropdownMenuItem onClick={handlePin}>
                  {message.is_pinned ? (
                    <>
                      <PinOff className="w-4 h-4 mr-2" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="w-4 h-4 mr-2" />
                      Pin
                    </>
                  )}
                </DropdownMenuItem>
              )}
              
              {isOwnMessage && message.message_type === 'text' && (
                <DropdownMenuItem onClick={() => onEdit?.(message)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              
              {(isAdmin || isOwnMessage) && <DropdownMenuSeparator />}
              
              {isOwnMessage && (
                <>
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(message.id, false)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete for me
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(message.id, true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete for everyone
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </motion.div>
  );
}
