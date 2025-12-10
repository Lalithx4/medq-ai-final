// Smart Mentions Component - @mention autocomplete
'use client';

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { GroupMember, UserProfile } from '../types';

// Mention types
export interface Mention {
  id: string;
  type: 'user' | 'everyone' | 'admins';
  display: string;
  userId?: string;
}

interface MentionSuggestion {
  id: string;
  type: 'user' | 'everyone' | 'admins';
  name: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}

interface SmartMentionsProps {
  members: GroupMember[];
  inputRef: React.RefObject<HTMLTextAreaElement>;
  onMentionSelect: (mention: Mention) => void;
  className?: string;
}

// Parse mentions from text
export function parseMentions(text: string): Mention[] {
  const mentions: Mention[] = [];
  const mentionRegex = /@\[(.*?)\]\((.*?)\)/g;
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const [_, display, id] = match;
    mentions.push({
      id,
      type: id === 'everyone' ? 'everyone' : id === 'admins' ? 'admins' : 'user',
      display,
      userId: id !== 'everyone' && id !== 'admins' ? id : undefined
    });
  }
  
  return mentions;
}

// Convert mentions to display text
export function mentionsToText(text: string): string {
  return text.replace(/@\[(.*?)\]\((.*?)\)/g, '@$1');
}

// Convert display text to mention format for storage
export function textToMentions(text: string, members: GroupMember[]): string {
  let result = text;
  
  // Replace @everyone
  result = result.replace(/@everyone\b/g, '@[everyone](everyone)');
  
  // Replace @admins
  result = result.replace(/@admins\b/g, '@[admins](admins)');
  
  // Replace @username mentions
  for (const member of members) {
    const name = member.user?.full_name || member.user?.name || member.user?.email?.split('@')[0];
    if (name) {
      const regex = new RegExp(`@${escapeRegex(name)}\\b`, 'gi');
      result = result.replace(regex, `@[${name}](${member.user_id})`);
    }
  }
  
  return result;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Hook for mentions
export interface UseMentionsOptions {
  members: GroupMember[];
}

export function useMentions({ members }: UseMentionsOptions) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Generate suggestions based on query
  const generateSuggestions = useCallback((searchQuery: string): MentionSuggestion[] => {
    const q = searchQuery.toLowerCase();
    const results: MentionSuggestion[] = [];
    
    // Special mentions first
    if ('everyone'.includes(q)) {
      results.push({
        id: 'everyone',
        type: 'everyone',
        name: 'everyone',
        role: 'Notify all members'
      });
    }
    
    if ('admins'.includes(q)) {
      results.push({
        id: 'admins',
        type: 'admins',
        name: 'admins',
        role: 'Notify all admins'
      });
    }
    
    // Filter members
    for (const member of members) {
      const user = member.user;
      if (!user) continue;
      
      const name = user.full_name || user.name || user.email?.split('@')[0] || '';
      const email = user.email || '';
      
      if (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q)
      ) {
        results.push({
          id: member.user_id,
          type: 'user',
          name,
          email,
          avatarUrl: user.avatar_url || user.image,
          role: member.role
        });
      }
    }
    
    return results.slice(0, 8);
  }, [members]);

  // Check for @ trigger in text
  const checkForMention = useCallback((
    text: string,
    cursorPosition: number,
    inputElement: HTMLTextAreaElement
  ) => {
    // Find @ before cursor
    const textBeforeCursor = text.slice(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex === -1) {
      setIsOpen(false);
      return;
    }
    
    // Check if @ is at start or after whitespace
    const charBefore = atIndex > 0 ? text[atIndex - 1] || ' ' : ' ';
    if (!/\s/.test(charBefore) && atIndex !== 0) {
      setIsOpen(false);
      return;
    }
    
    // Get query after @
    const queryText = textBeforeCursor.slice(atIndex + 1);
    
    // Check if query contains space (mention complete)
    if (queryText.includes(' ')) {
      setIsOpen(false);
      return;
    }
    
    // Generate suggestions
    const newSuggestions = generateSuggestions(queryText);
    
    if (newSuggestions.length > 0) {
      setQuery(queryText);
      setSuggestions(newSuggestions);
      setSelectedIndex(0);
      setIsOpen(true);
      
      // Calculate position
      // This is a simplified version - you may want to use a library like
      // textarea-caret-position for accurate positioning
      const rect = inputElement.getBoundingClientRect();
      setPosition({
        top: rect.top - 10,
        left: rect.left + 10
      });
    } else {
      setIsOpen(false);
    }
  }, [generateSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return false;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return true;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return true;
        
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        return true; // Signal to select current suggestion
        
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        return true;
        
      default:
        return false;
    }
  }, [isOpen, suggestions.length]);

  // Get selected suggestion
  const getSelectedSuggestion = useCallback((): MentionSuggestion | null => {
    return suggestions[selectedIndex] || null;
  }, [suggestions, selectedIndex]);

  // Close suggestions
  const closeSuggestions = useCallback(() => {
    setIsOpen(false);
    setSuggestions([]);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  return {
    suggestions,
    isOpen,
    query,
    position,
    selectedIndex,
    setSelectedIndex,
    checkForMention,
    handleKeyDown,
    getSelectedSuggestion,
    closeSuggestions
  };
}

// Mention suggestions dropdown
interface MentionSuggestionsProps {
  suggestions: MentionSuggestion[];
  selectedIndex: number;
  onSelect: (suggestion: MentionSuggestion) => void;
  onHover: (index: number) => void;
  isOpen: boolean;
  className?: string;
}

export function MentionSuggestions({
  suggestions,
  selectedIndex,
  onSelect,
  onHover,
  isOpen,
  className
}: MentionSuggestionsProps) {
  if (!isOpen || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn(
          "absolute bottom-full left-0 mb-2 w-64 max-h-60 overflow-y-auto",
          "bg-popover border rounded-lg shadow-lg z-50",
          className
        )}
      >
        <div className="p-1">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => onHover(index)}
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-md text-left",
                "transition-colors",
                index === selectedIndex
                  ? "bg-accent"
                  : "hover:bg-muted"
              )}
            >
              {suggestion.type === 'user' ? (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={suggestion.avatarUrl} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {suggestion.name
                      .split(' ')
                      .map(w => w[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ) : suggestion.type === 'everyone' ? (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <AtSign className="w-4 h-4 text-purple-600" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  @{suggestion.name}
                </p>
                {suggestion.role && (
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.role}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Render mentions in message content
interface MentionRendererProps {
  text: string;
  currentUserId?: string;
  className?: string;
}

export function MentionRenderer({
  text,
  currentUserId,
  className
}: MentionRendererProps) {
  // Parse and render mentions
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const mentionRegex = /@\[(.*?)\]\((.*?)\)/g;
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    const [_, display, id] = match;
    const isSelf = id === currentUserId;
    
    parts.push(
      <span
        key={match.index}
        className={cn(
          "inline-flex items-center gap-0.5 px-1 rounded font-medium",
          isSelf
            ? "bg-primary/20 text-primary"
            : "bg-muted text-foreground"
        )}
      >
        @{display}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return <span className={className}>{parts}</span>;
}
