// Message Input Component
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Smile, 
  X, 
  FileText,
  Mic,
  Video,
  Loader2,
  BarChart3,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GroupMessage, GroupMember } from '../types';
import { cn } from '@/lib/utils';
import { MentionSuggestions, useMentions, textToMentions } from './SmartMentions';

interface MessageInputProps {
  disabled?: boolean;
  isSending?: boolean;
  replyTo?: GroupMessage | null;
  members?: GroupMember[];
  onSend: (content: string, replyToId?: string) => Promise<void>;
  onUpload: (file: File, caption?: string, replyToId?: string) => Promise<void>;
  onTyping?: () => void;
  onCancelReply?: () => void;
  onOpenPoll?: () => void;
  onOpenEvent?: () => void;
  className?: string;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥'];

export function MessageInput({
  disabled = false,
  isSending = false,
  replyTo,
  members = [],
  onSend,
  onUpload,
  onTyping,
  onCancelReply,
  onOpenPoll,
  onOpenEvent,
  className
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Mentions hook
  const {
    suggestions,
    isOpen: isMentionsOpen,
    selectedIndex,
    setSelectedIndex,
    checkForMention,
    handleKeyDown: handleMentionKeyDown,
    getSelectedSuggestion,
    closeSuggestions
  } = useMentions({ members });

  const handleSend = async () => {
    const content = message.trim();
    if (!content || disabled || isSending) return;

    // Process mentions in the message
    const processedContent = textToMentions(content, members);
    
    setMessage('');
    closeSuggestions();
    await onSend(processedContent, replyTo?.id);
    onCancelReply?.();
  };

  // Handle mention selection
  const handleMentionSelect = (suggestion: any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = message.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex === -1) return;
    
    const textAfterAt = message.slice(cursorPos);
    const newText = `${message.slice(0, atIndex)}@${suggestion.name} ${textAfterAt}`;
    
    setMessage(newText);
    closeSuggestions();
    
    // Focus back on textarea
    setTimeout(() => {
      textarea.focus();
      const newPos = atIndex + suggestion.name.length + 2;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle mention keyboard navigation
    if (isMentionsOpen) {
      const handled = handleMentionKeyDown(e.nativeEvent);
      if (handled) {
        if (e.key === 'Enter' || e.key === 'Tab') {
          const suggestion = getSelectedSuggestion();
          if (suggestion) {
            handleMentionSelect(suggestion);
          }
        }
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    onTyping?.();
    
    // Check for mentions
    const textarea = e.target;
    checkForMention(newValue, textarea.selectionStart, textarea);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await onUpload(file, undefined, replyTo?.id);
      onCancelReply?.();
    } finally {
      setIsUploading(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleQuickEmoji = async (emoji: string) => {
    if (disabled || isSending) return;
    await onSend(emoji, replyTo?.id);
    onCancelReply?.();
  };

  return (
    <div className={cn("border-t bg-background", className)}>
      {/* Reply Preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/50">
              <div className="w-1 h-8 bg-primary rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary">
                  Replying to {replyTo.sender?.full_name || 'message'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {replyTo.content?.slice(0, 60) || 
                    (replyTo.message_type === 'image' ? '📷 Photo' :
                     replyTo.message_type === 'file' ? '📎 File' : 'Message')}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={onCancelReply}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3 flex items-end gap-2">
        {/* Attachment Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              disabled={disabled || isUploading}
              className="h-9 w-9 flex-shrink-0"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
              <ImageIcon className="w-4 h-4 mr-2 text-green-500" />
              Photo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <FileText className="w-4 h-4 mr-2 text-blue-500" />
              Document
            </DropdownMenuItem>
            {onOpenPoll && (
              <DropdownMenuItem onClick={onOpenPoll}>
                <BarChart3 className="w-4 h-4 mr-2 text-purple-500" />
                Create Poll
              </DropdownMenuItem>
            )}
            {onOpenEvent && (
              <DropdownMenuItem onClick={onOpenEvent}>
                <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                Schedule Event
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Message Input */}
        <div className="flex-1 relative">
          {/* Mention Suggestions */}
          <MentionSuggestions
            suggestions={suggestions}
            selectedIndex={selectedIndex}
            onSelect={handleMentionSelect}
            onHover={setSelectedIndex}
            isOpen={isMentionsOpen}
          />
          
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (@ to mention)"
            disabled={disabled}
            className="min-h-[40px] max-h-[120px] resize-none pr-10"
            rows={1}
          />
          
          {/* Emoji Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 bottom-1 h-7 w-7"
                disabled={disabled}
              >
                <Smile className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="end">
              <div className="grid grid-cols-8 gap-1">
                {QUICK_EMOJIS.map(emoji => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    className="h-8 w-8 text-lg p-0"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
              <div className="border-t mt-2 pt-2">
                <p className="text-xs text-muted-foreground mb-2">Quick react:</p>
                <div className="grid grid-cols-8 gap-1">
                  {['👏', '💯', '🙌', '💪', '✨', '🎊', '💖', '😊'].map(emoji => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      className="h-8 w-8 text-lg p-0"
                      onClick={() => handleQuickEmoji(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Send Button */}
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || isSending || !message.trim()}
          className="h-9 w-9 flex-shrink-0"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
