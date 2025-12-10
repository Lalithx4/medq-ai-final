// Read Receipts Component - Shows message read status
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { MessageReadReceipt, UserProfile } from '../types';
import { format, formatDistanceToNow } from 'date-fns';

interface ReadReceiptsProps {
  messageId: string;
  readReceipts: MessageReadReceipt[];
  totalMembers?: number;
  isOwnMessage?: boolean;
  className?: string;
}

export function ReadReceipts({
  messageId,
  readReceipts,
  totalMembers = 0,
  isOwnMessage = false,
  className
}: ReadReceiptsProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const readCount = readReceipts.length;
  const allRead = totalMembers > 0 && readCount >= totalMembers - 1; // Exclude sender
  const someRead = readCount > 0;

  // Only show read receipts for own messages
  if (!isOwnMessage) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-0.5 text-xs transition-colors",
            allRead 
              ? "text-blue-500" 
              : someRead 
                ? "text-muted-foreground/70" 
                : "text-muted-foreground/50",
            "hover:opacity-80",
            className
          )}
        >
          {allRead ? (
            <CheckCheck className="w-3.5 h-3.5" />
          ) : someRead ? (
            <CheckCheck className="w-3.5 h-3.5" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0" 
        align="end"
        side="top"
      >
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">Read by</span>
            {readCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({readCount})
              </span>
            )}
          </div>
        </div>
        
        <div className="max-h-[200px] overflow-y-auto">
          {readReceipts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Check className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p>Not yet read</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {readReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={receipt.user?.avatar_url || receipt.user?.image} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {(receipt.user?.full_name || receipt.user?.email || 'U')
                        .split(' ')
                        .map(w => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {receipt.user?.full_name || receipt.user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(receipt.read_at), { addSuffix: true })}
                    </p>
                  </div>
                  <CheckCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Simple inline read indicator
interface ReadIndicatorProps {
  status: 'sent' | 'delivered' | 'read';
  className?: string;
}

export function ReadIndicator({ status, className }: ReadIndicatorProps) {
  return (
    <span className={cn(
      "inline-flex items-center",
      status === 'read' ? "text-blue-500" : "text-muted-foreground/50",
      className
    )}>
      {status === 'sent' ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <CheckCheck className="w-3.5 h-3.5" />
      )}
    </span>
  );
}
