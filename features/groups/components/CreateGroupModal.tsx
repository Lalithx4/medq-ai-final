// Create Group Modal Component
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Lock, Globe, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGroups } from '../hooks';
import { CreateGroupInput, GroupType } from '../types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated?: (group: any) => void;
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const { createGroup, isLoading } = useGroups();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState<GroupType>('private');
  const [onlyAdminsCanMessage, setOnlyAdminsCanMessage] = useState(false);
  const [onlyAdminsCanAddMembers, setOnlyAdminsCanAddMembers] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    const input: CreateGroupInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      group_type: groupType,
      only_admins_can_message: onlyAdminsCanMessage,
      only_admins_can_add_members: onlyAdminsCanAddMembers
    };

    const group = await createGroup(input);
    
    if (group) {
      toast.success('Group created successfully!');
      onGroupCreated?.(group);
      handleClose();
    } else {
      toast.error('Failed to create group');
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setGroupType('private');
    setOnlyAdminsCanMessage(false);
    setOnlyAdminsCanAddMembers(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            Create New Group
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              placeholder="Enter group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={isLoading}
            />
          </div>

          {/* Group Type */}
          <div className="space-y-3">
            <Label>Group Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGroupType('private')}
                className={cn(
                  "flex flex-col items-center p-4 rounded-lg border-2 transition-all",
                  groupType === 'private' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <Lock className={cn(
                  "w-6 h-6 mb-2",
                  groupType === 'private' ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="font-medium text-sm">Private</span>
                <span className="text-xs text-muted-foreground">Invite only</span>
              </button>
              <button
                type="button"
                onClick={() => setGroupType('public')}
                className={cn(
                  "flex flex-col items-center p-4 rounded-lg border-2 transition-all",
                  groupType === 'public' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <Globe className={cn(
                  "w-6 h-6 mb-2",
                  groupType === 'public' ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="font-medium text-sm">Public</span>
                <span className="text-xs text-muted-foreground">Anyone can find</span>
              </button>
            </div>
          </div>

          {/* Group Settings */}
          <div className="space-y-4 pt-2 border-t">
            <Label className="text-muted-foreground text-sm">Group Settings</Label>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Only admins can message</p>
                <p className="text-xs text-muted-foreground">
                  Only admins can send messages
                </p>
              </div>
              <Switch
                checked={onlyAdminsCanMessage}
                onCheckedChange={setOnlyAdminsCanMessage}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Only admins can add members</p>
                <p className="text-xs text-muted-foreground">
                  Restrict member additions to admins
                </p>
              </div>
              <Switch
                checked={onlyAdminsCanAddMembers}
                onCheckedChange={setOnlyAdminsCanAddMembers}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
