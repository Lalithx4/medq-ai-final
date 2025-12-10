// Share to Group Modal Component
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Check, 
  Loader2, 
  Video,
  Users,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Group } from '../types';
import { cn } from '@/lib/utils';

interface ShareToGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomCode: string;
  roomName: string;
}

export function ShareToGroupModal({
  open,
  onOpenChange,
  roomCode,
  roomName
}: ShareToGroupModalProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  // Fetch user's groups
  useEffect(() => {
    if (!open) return;

    const fetchGroups = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/groups');
        if (response.ok) {
          const data = await response.json();
          setGroups(data.groups || []);
        }
      } catch (error) {
        console.error('Failed to fetch groups:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedGroups([]);
      setSearchQuery('');
    }
  }, [open]);

  // Filter groups by search
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleShare = async () => {
    if (selectedGroups.length === 0) return;

    setIsSharing(true);
    try {
      // Share to each selected group
      const results = await Promise.allSettled(
        selectedGroups.map(groupId =>
          fetch(`/api/groups/${groupId}/stream-share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_code: roomCode })
          })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      if (successCount > 0) {
        toast({
          title: 'Stream shared!',
          description: `Shared to ${successCount} group${successCount > 1 ? 's' : ''}`
        });
      }

      if (failCount > 0) {
        toast({
          title: 'Some shares failed',
          description: `Failed to share to ${failCount} group${failCount > 1 ? 's' : ''}`,
          variant: 'destructive'
        });
      }

      onOpenChange(false);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Stream to Groups</DialogTitle>
          <DialogDescription>
            Select groups to share your stream with
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stream Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{roomName}</p>
              <p className="text-xs text-muted-foreground">Room: {roomCode}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Groups List */}
          <ScrollArea className="h-[250px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGroups.length > 0 ? (
              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {filteredGroups.map((group, index) => (
                    <motion.button
                      key={group.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleToggleGroup(group.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                        selectedGroups.includes(group.id)
                          ? "bg-primary/10"
                          : "hover:bg-muted"
                      )}
                    >
                      <Checkbox
                        checked={selectedGroups.includes(group.id)}
                        className="pointer-events-none"
                      />
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={group.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {group.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {group.member_count || 0} members
                        </p>
                      </div>
                      {selectedGroups.includes(group.id) && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Users className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No groups found' : 'No groups yet'}
                </p>
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={selectedGroups.length === 0 || isSharing}
          >
            {isSharing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Share {selectedGroups.length > 0 ? `(${selectedGroups.length})` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
