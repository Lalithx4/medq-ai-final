// Group Chat Component - Main Chat View
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowDown, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GroupMessage } from './GroupMessage';
import { MessageInput } from './MessageInput';
import { CreatePollModal } from './CreatePollModal';
import { CreateEventModal } from './GroupEvents';
import { useGroupChat, usePolls, useEvents } from '../hooks';
import { Group, GroupMessage as GroupMessageType, CreatePollInput } from '../types';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { toast } from 'sonner';

interface GroupChatProps {
  group: Group;
  currentUserId: string;
  className?: string;
}

function formatDateDivider(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

function shouldShowDateDivider(
  currentMessage: GroupMessageType,
  previousMessage: GroupMessageType | null
): boolean {
  if (!previousMessage) return true;
  const currentDate = new Date(currentMessage.created_at);
  const previousDate = new Date(previousMessage.created_at);
  return !isSameDay(currentDate, previousDate);
}

function shouldShowAvatar(
  currentMessage: GroupMessageType,
  previousMessage: GroupMessageType | null
): boolean {
  if (!previousMessage) return true;
  if (currentMessage.sender_id !== previousMessage.sender_id) return true;
  
  // Show avatar if more than 5 minutes apart
  const currentTime = new Date(currentMessage.created_at).getTime();
  const previousTime = new Date(previousMessage.created_at).getTime();
  return currentTime - previousTime > 5 * 60 * 1000;
}

export function GroupChat({
  group,
  currentUserId,
  className
}: GroupChatProps) {
  const [replyTo, setReplyTo] = useState<GroupMessageType | null>(null);
  const [editingMessage, setEditingMessage] = useState<GroupMessageType | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ message: GroupMessageType; forEveryone: boolean } | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  const {
    messages,
    isLoading,
    isSending,
    hasMore,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    uploadMedia,
    fetchMessages,
    setTyping
  } = useGroupChat(group.id);

  const { createPoll: createPollAction } = usePolls();
  const { createEvent: createEventAction, isCreating: isCreatingEvent } = useEvents();

  // Load initial messages and scroll to bottom
  useEffect(() => {
    const loadAndScroll = async () => {
      await fetchMessages(true);
      // Scroll to bottom after messages load
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    };
    loadAndScroll();
  }, [fetchMessages]);

  const handleCreatePoll = async (poll: CreatePollInput) => {
    const created = await createPollAction(group.id, poll);
    if (created) {
      toast.success('Poll created successfully!');
      setShowPollModal(false);
      // Refresh messages to show the poll
      await fetchMessages(true);
    } else {
      toast.error('Failed to create poll');
    }
  };

  const handleCreateEvent = async (eventInput: any) => {
    const created = await createEventAction(group.id, eventInput);
    if (created) {
      toast.success('Event scheduled successfully!');
      setShowEventModal(false);
    } else {
      toast.error('Failed to create event');
    }
  };

  // Auto-scroll to bottom on new messages (only for new messages, not initial load)
  const prevMessagesLength = useRef(0);
  useEffect(() => {
    if (messages.length > 0 && messages.length > prevMessagesLength.current) {
      const lastMessage = messages[messages.length - 1];
      // Only auto-scroll if this is a new message (not initial load)
      if (prevMessagesLength.current > 0) {
        if (lastMessage && lastMessage.sender_id === currentUserId) {
          // Always scroll for own messages
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else if (!showScrollButton) {
          // Scroll for others' messages only if already at bottom
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, currentUserId, showScrollButton]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    // Show scroll button if not near bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
    
    // Load more when scrolling up near top
    if (scrollTop < 100 && lastScrollTop.current > scrollTop && hasMore && !isLoading) {
      fetchMessages(false);
    }
    
    lastScrollTop.current = scrollTop;
  }, [hasMore, isLoading, fetchMessages]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (content: string, replyToId?: string) => {
    await sendMessage({ content, reply_to_id: replyToId });
  };

  const handleUpload = async (file: File, caption?: string, replyToId?: string) => {
    await uploadMedia(file, caption, replyToId);
  };

  const handleReply = (message: GroupMessageType) => {
    setReplyTo(message);
  };

  const handleEdit = (message: GroupMessageType) => {
    setEditingMessage(message);
    setEditContent(message.content || '');
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return;
    
    const success = await editMessage(editingMessage.id, editContent.trim());
    if (success) {
      toast.success('Message edited');
      setEditingMessage(null);
      setEditContent('');
    } else {
      toast.error('Failed to edit message');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    
    const success = await deleteMessage(deleteConfirm.message.id);
    if (success) {
      toast.success(deleteConfirm.forEveryone ? 'Message deleted for everyone' : 'Message deleted');
    } else {
      toast.error('Failed to delete message');
    }
    setDeleteConfirm(null);
  };

  const handleDeleteRequest = (messageId: string, forEveryone: boolean) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setDeleteConfirm({ message, forEveryone });
    }
  };

  // Group consecutive messages for cleaner display
  const renderMessages = () => {
    return messages.map((message, index) => {
      const previousMessage = index > 0 ? messages[index - 1] ?? null : null;
      const showDate = shouldShowDateDivider(message, previousMessage);
      const showAvatar = shouldShowAvatar(message, previousMessage);
      const isOwn = message.sender_id === currentUserId;

      return (
        <div key={message.id}>
          {/* Date Divider */}
          {showDate && (
            <div className="flex items-center justify-center my-4">
              <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                {formatDateDivider(new Date(message.created_at))}
              </div>
            </div>
          )}
          
          {/* Message */}
          <GroupMessage
            message={message}
            isOwnMessage={isOwn}
            groupId={group.id}
            currentUserId={currentUserId}
            isAdmin={group.members?.find(m => m.user_id === currentUserId)?.role === 'admin' || group.members?.find(m => m.user_id === currentUserId)?.role === 'owner'}
            readStatus={isOwn ? 'delivered' : undefined}
            showSender={showAvatar}
            onReply={handleReply}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />
        </div>
      );
    });
  };

  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      {/* Messages Area */}
      <div 
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto px-4 scroll-smooth"
        onScroll={handleScroll}
        style={{ scrollBehavior: 'smooth', overscrollBehavior: 'contain' }}
      >
        {/* Loading indicator for older messages */}
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* No more messages indicator */}
        {!hasMore && messages.length > 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="font-medium">{group.name}</p>
            <p className="text-sm text-muted-foreground">
              Created on {format(new Date(group.created_at), 'MMMM d, yyyy')}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Welcome to {group.name}!</h3>
            <p className="text-muted-foreground max-w-sm">
              This is the beginning of your conversation. 
              Send a message to get started.
            </p>
          </div>
        )}

        {/* Messages */}
        {renderMessages()}

        {/* Typing indicators */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 py-2 text-sm text-muted-foreground"
            >
              <div className="flex space-x-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0]?.user?.full_name || typingUsers[0]?.full_name || 'Someone'} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0]?.user?.full_name || 'Someone'} and ${typingUsers[1]?.user?.full_name || 'Someone'} are typing...`
                  : `${typingUsers.length} people are typing...`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-24 right-6 z-50"
          >
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
              onClick={scrollToBottom}
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input */}
      <MessageInput
        disabled={isLoading}
        isSending={isSending}
        replyTo={replyTo}
        members={group.members || []}
        onSend={handleSend}
        onUpload={handleUpload}
        onCancelReply={() => setReplyTo(null)}
        onOpenPoll={() => setShowPollModal(true)}
        onOpenEvent={() => setShowEventModal(true)}
      />

      {/* Poll Creation Modal */}
      <CreatePollModal
        open={showPollModal}
        onOpenChange={setShowPollModal}
        onCreate={handleCreatePoll}
      />

      {/* Event Creation Modal */}
      <CreateEventModal
        open={showEventModal}
        onOpenChange={setShowEventModal}
        onCreate={handleCreateEvent}
        isCreating={isCreatingEvent}
      />

      {/* Edit Message Modal */}
      <Dialog open={!!editingMessage} onOpenChange={() => setEditingMessage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
            <DialogDescription>
              Make changes to your message below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[100px]"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editContent.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              {deleteConfirm?.forEveryone 
                ? 'This will delete the message for everyone in this group. This action cannot be undone.'
                : 'This will delete the message only for you. Others will still see it.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 px-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground line-clamp-3">
              {deleteConfirm?.message.content || 'Media message'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
