// Groups Dashboard Page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Users, Search, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/home/AppLayout';
import { 
  GroupList, 
  CreateGroupModal, 
  JoinGroupModal,
  GroupCard 
} from '@/features/groups/components';
import { useGroups } from '@/features/groups/hooks';
import { Group, GroupSummary } from '@/features/groups/types';

export default function GroupsPage() {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    groups, 
    isLoading, 
    error, 
    createGroup,
    joinGroup,
    fetchGroups 
  } = useGroups();

  // Fetch groups on mount
  useEffect(() => {
    console.log('[GroupsPage] Mounting, calling fetchGroups...');
    fetchGroups().then(result => {
      console.log('[GroupsPage] fetchGroups completed, result:', result);
    }).catch(err => {
      console.error('[GroupsPage] fetchGroups error:', err);
    });
  }, [fetchGroups]);

  // Debug state
  useEffect(() => {
    console.log('[GroupsPage] State:', { groups: groups.length, isLoading, error });
  }, [groups, isLoading, error]);

  // Filter groups by search
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectGroup = (group: GroupSummary) => {
    router.push(`/groups/${group.id}`);
  };

  const handleJoinGroup = async (inviteCode: string) => {
    try {
      const group = await joinGroup(inviteCode);
      if (group) {
        fetchGroups(); // Refresh the list
        router.push(`/groups/${group.id}`);
        return { success: true, group };
      }
      return { success: false, error: 'Failed to join group' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to join group' };
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Groups</h1>
                  <p className="text-sm text-muted-foreground">
                    {groups.length} {groups.length === 1 ? 'group' : 'groups'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsJoinModalOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Group
                </Button>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Group
                </Button>
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
          </div>
        </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading groups...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="font-semibold mb-2">Failed to load groups</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchGroups}>Try Again</Button>
          </div>
        ) : filteredGroups.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {searchQuery ? 'No groups found' : 'No groups yet'}
            </h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              {searchQuery 
                ? `No groups matching "${searchQuery}"`
                : 'Create a group to start collaborating, or join an existing group with an invite code'}
            </p>
            {!searchQuery && (
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setIsJoinModalOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Group
                </Button>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredGroups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GroupCard
                  group={group}
                  onClick={() => handleSelectGroup(group)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={(newGroup) => {
          setIsCreateModalOpen(false);
          router.push(`/groups/${newGroup.id}`);
        }}
      />

      {/* Join Group Modal */}
      <JoinGroupModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoin={handleJoinGroup}
      />
      </div>
    </AppLayout>
  );
}
