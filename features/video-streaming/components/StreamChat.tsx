// Stream Chat Component - Modern UI
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatMessage } from '../types';
import { Send, Smile, MoreVertical, Pin, Trash2, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface StreamChatProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  isSending?: boolean;
  disabled?: boolean;
  currentUserId?: string;
  onSendMessage: (message: string) => Promise<void>;
  onPinMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  className?: string;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '👏', '🔥', '💯', '🎉', '😮'];

export function StreamChat({
  messages,
  isLoading = false,
  isSending = false,
  disabled = false,
  currentUserId,
  onSendMessage,
  onPinMessage,
  onDeleteMessage,
  className,
}: StreamChatProps) {
  const [input, setInput] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending || disabled) return;

    const message = input.trim();
    setInput('');
    await onSendMessage(message);
    inputRef.current?.focus();
  };

  const handleQuickReaction = async (emoji: string) => {
    if (isSending || disabled) return;
    await onSendMessage(emoji);
    setShowReactions(false);
  };

  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'HH:mm');
    } catch {
      return '';
    }
  };

  // Check if message is just emoji
  const isEmojiOnly = (text: string) => {
    const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+$/u;
    return emojiRegex.test(text) && text.length <= 8;
  };

  return (
    <div className={cn('flex flex-col h-full bg-gray-900/50 backdrop-blur-sm', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg">
            <MessageCircle className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Live Chat</h3>
            <p className="text-xs text-gray-400">{messages.length} messages</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs text-gray-500">Be the first to say something!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => {
                const isOwn = message.user_id === currentUserId;
                const name = message.user?.full_name || 'Unknown';
                const initials = name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                const emojiOnly = isEmojiOnly(message.message);

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'group flex gap-2.5 rounded-xl px-2 py-1.5 transition-colors',
                      message.is_pinned && 'bg-yellow-500/10 border border-yellow-500/20',
                      !message.is_pinned && 'hover:bg-gray-800/50'
                    )}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-gray-700/50">
                      <AvatarImage src={message.user?.avatar_url} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          'text-sm font-medium',
                          isOwn ? 'text-blue-400' : 'text-gray-200'
                        )}>
                          {name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.created_at)}
                        </span>
                        {message.is_pinned && (
                          <Pin className="w-3 h-3 text-yellow-400" />
                        )}
                      </div>
                      <p className={cn(
                        'break-words mt-0.5',
                        emojiOnly ? 'text-2xl' : 'text-sm text-gray-300'
                      )}>
                        {message.message}
                      </p>
                    </div>

                    {/* Message actions */}
                    {(onPinMessage || onDeleteMessage) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-700 transition-all">
                            <MoreVertical className="w-3 h-3 text-gray-400" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                          {onPinMessage && (
                            <DropdownMenuItem 
                              onClick={() => onPinMessage(message.id)}
                              className="text-gray-200 hover:bg-gray-700"
                            >
                              <Pin className="w-4 h-4 mr-2" />
                              {message.is_pinned ? 'Unpin' : 'Pin'}
                            </DropdownMenuItem>
                          )}
                          {onDeleteMessage && isOwn && (
                            <DropdownMenuItem
                              onClick={() => onDeleteMessage(message.id)}
                              className="text-red-400 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* Quick reactions */}
      <AnimatePresence>
        {showReactions && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 border-t border-gray-700/50 bg-gray-800/50"
          >
            <div className="flex items-center gap-1.5 justify-center">
              {QUICK_REACTIONS.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleQuickReaction(emoji)}
                  className="p-2 hover:bg-gray-700 rounded-full text-xl transition-colors"
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700/50">
        <div className="flex items-center gap-2 bg-gray-800/80 rounded-xl p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "flex-shrink-0 hover:bg-gray-700 rounded-lg h-9 w-9",
              showReactions && "bg-gray-700 text-yellow-400"
            )}
            onClick={() => setShowReactions(!showReactions)}
          >
            <Smile className="w-5 h-5" />
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={disabled ? 'Chat is disabled' : 'Send a message...'}
            disabled={disabled || isSending}
            className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-gray-500"
            maxLength={500}
          />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isSending || disabled}
              className="flex-shrink-0 bg-blue-500 hover:bg-blue-600 rounded-lg h-9 w-9"
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </form>
    </div>
  );
}
