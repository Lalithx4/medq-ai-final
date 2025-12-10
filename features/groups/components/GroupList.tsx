// Group List Component
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GroupCard } from './GroupCard';
import { CreateGroupModal } from './CreateGroupModal';
import { useGroups } from '../hooks';
import { GroupSummary } from '../types';
import { cn } from '@/lib/utils';

interface GroupListProps {
  selectedGroupId?: string | null;
  onGroupSelect?: (group: GroupSummary) => void;
  className?: string;
}

export function GroupList({ selectedGroupId, onGroupSelect, className }: GroupListProps) {
  const { groups, isLoading, fetchGroups } = useGroups();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Groups
          </h2>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            New
          </Button>
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
      </div>

      {/* Groups List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              {searchQuery ? (
                <>
                  <p className="font-medium">No groups found</p>
                  <p className="text-sm text-muted-foreground">
                    Try a different search term
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">No groups yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first group to get started
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Create Group
                  </Button>
                </>
              )}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isSelected={selectedGroupId === group.id}
                  onClick={() => onGroupSelect?.(group)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={(group) => {
          onGroupSelect?.(group);
        }}
      />
    </div>
  );
}
