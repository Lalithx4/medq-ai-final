// Group Page - Individual Group View with Tab System
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Loader2, 
  AlertCircle, 
  MessageSquare, 
  Video, 
  Monitor, 
  FolderOpen, 
  Users, 
  UserPlus,
  ArrowLeft,
  Settings,
  MoreVertical,
  Link as LinkIcon,
  LogOut,
  Trash2,
  Copy,
  RefreshCw,
  Search,
  Pin,
  BarChart3,
  Bell,
  BellOff,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppLayout } from '@/components/home/AppLayout';
import { 
  GroupChat, 
  AddMembersModal,
  InviteLinkModal,
  GroupResources
} from '@/features/groups/components';
import { useGroups, useGroupMembers, usePinnedMessages, usePolls } from '@/features/groups/hooks';
import { Group, MemberRole } from '@/features/groups/types';
import { groupsApi } from '@/features/groups/api-config';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[GroupPage]', ...args);

// Tab definitions
type GroupTab = 'chat' | 'live-streams' | 'device-streams' | 'resources' | 'members' | 'invitations';

const tabs: { id: GroupTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { id: 'chat', label: 'Chat', shortLabel: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'live-streams', label: 'Live Streams', shortLabel: 'Live', icon: <Video className="w-4 h-4" /> },
  { id: 'device-streams', label: 'Device Streams', shortLabel: 'Devices', icon: <Monitor className="w-4 h-4" /> },
  { id: 'resources', label: 'Resources', shortLabel: 'Files', icon: <FolderOpen className="w-4 h-4" /> },
  { id: 'members', label: 'Members', shortLabel: 'Members', icon: <Users className="w-4 h-4" /> },
  { id: 'invitations', label: 'Invitations', shortLabel: 'Invite', icon: <UserPlus className="w-4 h-4" /> },
];

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const supabase = getBrowserSupabase();

  // State
  const [group, setGroup] = useState<Group | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole>('member');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GroupTab>('chat');
  
  // UI State
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Hooks
  const { leaveGroup, deleteGroup, regenerateInviteLink, updateGroup } = useGroups();
  const { members, addMembers, updateMember, removeMember, fetchMembers } = useGroupMembers(groupId);

  // Fetch members when group loads
  useEffect(() => {
    if (groupId) {
      fetchMembers();
    }
  }, [groupId, fetchMembers]);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUser();
  }, [supabase.auth]);

  // Fetch group data
  useEffect(() => {
    const fetchGroup = async () => {
      setIsLoading(true);
      setError(null);
      log('Fetching group:', groupId);
      
      try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch(groupsApi(`/api/groups/${groupId}`), {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        log('Group response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Group not found');
          } else if (response.status === 403) {
            setError('You do not have access to this group');
          } else {
            setError('Failed to load group');
          }
          return;
        }
        const data = await response.json();
        log('Group data:', data);
        
        if (data.success && data.group) {
          setGroup(data.group);
        } else {
          setError(data.error || 'Failed to load group');
        }
      } catch (err) {
        log('Fetch group error:', err);
        setError('Failed to load group');
      } finally {
        setIsLoading(false);
      }
    };

    if (groupId) {
      fetchGroup();
    }
  }, [groupId, supabase.auth]);

  // Determine current user's role
  useEffect(() => {
    if (members.length > 0 && currentUserId) {
      const currentMember = members.find(m => m.user_id === currentUserId);
      if (currentMember) {
        setCurrentUserRole(currentMember.role);
      }
    }
  }, [members, currentUserId]);

  // Handlers
  const handleLeaveGroup = async () => {
    const success = await leaveGroup(groupId, currentUserId);
    if (success) {
      toast.success('You left the group');
      router.push('/groups');
    } else {
      toast.error('Failed to leave group');
    }
  };

  const handleDeleteGroup = async () => {
    const success = await deleteGroup(groupId);
    if (success) {
      toast.success('Group deleted');
      router.push('/groups');
    } else {
      toast.error('Failed to delete group');
    }
  };

  const handleGenerateInvite = async () => {
    const result = await regenerateInviteLink(groupId);
    if (result) {
      toast.success('New invite link generated');
      // Refresh group data to get new invite code
      const response = await fetch(groupsApi(`/api/groups/${groupId}`), {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success && data.group) {
        setGroup(data.group);
      }
    }
    return result;
  };

  const handleRegenerateInvite = async () => {
    const success = await handleGenerateInvite();
    if (success) {
      copyInviteLink();
    } else {
      toast.error('Failed to regenerate invite link');
    }
  };

  const handleAddMembers = async (userIds: string[]) => {
    const success = await addMembers(userIds.map(id => ({ user_id: id, role: 'member' as const })));
    if (success) {
      toast.success(`Added ${userIds.length} member(s)`);
    } else {
      toast.error('Failed to add members');
    }
  };

  const handleUpdateMember = async (userId: string, updates: { role?: MemberRole }) => {
    const success = await updateMember(userId, updates);
    if (success) {
      toast.success(updates.role === 'admin' ? 'Made admin' : 'Removed admin');
    } else {
      toast.error('Failed to update member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const success = await removeMember(userId);
    if (success) {
      toast.success('Member removed');
    } else {
      toast.error('Failed to remove member');
    }
  };

  const copyInviteLink = () => {
    if (group?.invite_code) {
      const link = `${window.location.origin}/groups/join/${group.invite_code}`;
      navigator.clipboard.writeText(link);
      toast.success('Invite link copied to clipboard');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading group...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error || !group) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-semibold text-lg mb-2">{error || 'Group not found'}</h2>
            <p className="text-muted-foreground mb-4">
              The group you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => router.push('/groups')}>
              Back to Groups
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isAdmin = currentUserRole === 'admin';

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-background">
        {/* Header with Group Info and Tabs */}
        <div className="border-b bg-background sticky top-0 z-10">
          {/* Group Header */}
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0"
                onClick={() => router.push('/groups')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="font-semibold text-base sm:text-lg truncate">{group.name}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">{members.length} members</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex"
                onClick={() => setShowInviteLink(true)}
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Invite
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="sm:hidden"
                onClick={() => setShowInviteLink(true)}
              >
                <LinkIcon className="w-4 h-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Quick Actions */}
                  <DropdownMenuItem onClick={copyInviteLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Invite Link
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setShowInviteLink(true)}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Group
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* View Options */}
                  <DropdownMenuItem onClick={() => setActiveTab('members')}>
                    <Pin className="w-4 h-4 mr-2" />
                    View Pinned Messages
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setActiveTab('resources')}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Shared Files & Media
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Group Analytics
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Notifications */}
                  <DropdownMenuItem>
                    {group.mute_notifications ? (
                      <>
                        <Bell className="w-4 h-4 mr-2" />
                        Unmute Notifications
                      </>
                    ) : (
                      <>
                        <BellOff className="w-4 h-4 mr-2" />
                        Mute Notifications
                      </>
                    )}
                  </DropdownMenuItem>
                  
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowAddMembers(true)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Members
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRegenerateInvite()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate Invite Link
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleLeaveGroup} className="text-orange-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave Group
                  </DropdownMenuItem>
                  
                  {isAdmin && (
                    <DropdownMenuItem onClick={handleDeleteGroup} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Group
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Horizontal Tabs */}
          <div className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-4 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-w-0",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <GroupChat
              group={group}
              currentUserId={currentUserId}
              className="h-full"
            />
          )}

          {activeTab === 'live-streams' && (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <Video className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/50 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">Live Streams</h3>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md mb-4 px-4">
                  Start or join live streams with your group members.
                </p>
                <Button size="sm" className="sm:size-default">
                  <Video className="w-4 h-4 mr-2" />
                  Start Live Stream
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'device-streams' && (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <Monitor className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/50 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">Device Streams</h3>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md mb-4 px-4">
                  Stream from connected devices like microscopes or cameras.
                </p>
                <Button size="sm" className="sm:size-default">
                  <Monitor className="w-4 h-4 mr-2" />
                  Connect Device
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <GroupResources
              groupId={groupId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              className="h-full"
            />
          )}

          {activeTab === 'members' && (
            <div className="h-full overflow-y-auto">
              <div className="max-w-2xl mx-auto p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold">Members ({members.length})</h2>
                  {isAdmin && (
                    <Button size="sm" className="sm:size-default" onClick={() => setShowAddMembers(true)}>
                      <UserPlus className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Add Members</span>
                    </Button>
                  )}
                </div>
                
                {/* Search Members */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Members grouped by role */}
                {(() => {
                  const filteredMembers = members.filter(m => {
                    const name = m.user?.full_name || m.user?.email || '';
                    return name.toLowerCase().includes(memberSearch.toLowerCase());
                  });
                  const admins = filteredMembers.filter(m => m.role === 'admin');
                  const regularMembers = filteredMembers.filter(m => m.role === 'member');
                  
                  return (
                    <div className="space-y-4">
                      {admins.length > 0 && (
                        <div>
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                            Admins ({admins.length})
                          </h3>
                          <div className="space-y-2">
                            {admins.map((member) => (
                              <div 
                                key={member.id} 
                                className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card"
                              >
                                <Avatar className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                                  <AvatarImage src={member.user?.avatar_url || ''} />
                                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                    {(member.user?.full_name || member.user?.email || 'U').charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm sm:text-base truncate">
                                    {member.user?.full_name || member.user?.email?.split('@')[0] || 'User'}
                                    {member.user_id === currentUserId && (
                                      <span className="text-muted-foreground ml-1">(You)</span>
                                    )}
                                  </p>
                                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{member.user?.email}</p>
                                </div>
                                <Badge variant="default" className="text-xs shrink-0">ADMIN</Badge>
                                {isAdmin && member.user_id !== currentUserId && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleUpdateMember(member.user_id, { role: 'member' })}>
                                        Remove Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleRemoveMember(member.user_id)} className="text-destructive">
                                        Remove from Group
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {regularMembers.length > 0 && (
                        <div>
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                            Members ({regularMembers.length})
                          </h3>
                          <div className="space-y-2">
                            {regularMembers.map((member) => (
                              <div 
                                key={member.id} 
                                className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card"
                              >
                                <Avatar className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
                                  <AvatarImage src={member.user?.avatar_url || ''} />
                                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                    {(member.user?.full_name || member.user?.email || 'U').charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm sm:text-base truncate">
                                    {member.user?.full_name || member.user?.email?.split('@')[0] || 'User'}
                                    {member.user_id === currentUserId && (
                                      <span className="text-muted-foreground ml-1">(You)</span>
                                    )}
                                  </p>
                                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{member.user?.email}</p>
                                </div>
                                <Badge variant="secondary" className="text-xs shrink-0">MEMBER</Badge>
                                {isAdmin && member.user_id !== currentUserId && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleUpdateMember(member.user_id, { role: 'admin' })}>
                                        Make Admin
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleRemoveMember(member.user_id)} className="text-destructive">
                                        Remove from Group
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {filteredMembers.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No members found matching "{memberSearch}"
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'invitations' && (
            <div className="h-full overflow-y-auto">
              <div className="max-w-2xl mx-auto p-3 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Invitations</h2>
                
                {/* Invite Link Section */}
                <div className="p-4 sm:p-6 rounded-lg border bg-card mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                    <h3 className="font-medium text-sm sm:text-base">Invite Link</h3>
                    {group.invite_link_enabled !== false && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    Anyone with this link can join the group. Share it carefully.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 px-3 sm:px-4 py-2 bg-muted rounded-lg text-xs sm:text-sm truncate font-mono">
                      {group.invite_code 
                        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/groups/join/${group.invite_code}`
                        : 'No invite link generated'
                      }
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-initial" onClick={copyInviteLink}>
                        <Copy className="w-4 h-4 mr-2 sm:mr-0" />
                        <span className="sm:hidden">Copy</span>
                      </Button>
                      {isAdmin && (
                        <Button size="sm" className="flex-1 sm:flex-initial" onClick={handleGenerateInvite}>
                          <RefreshCw className="w-4 h-4 mr-2 sm:mr-0" />
                          <span className="sm:hidden">Regenerate</span>
                        </Button>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground mt-3">
                      💡 Tip: Regenerating the link will invalidate the old link. Use this if the link was shared with unintended recipients.
                    </p>
                  )}
                </div>

                {/* How to Invite */}
                <div className="p-4 sm:p-6 rounded-lg border bg-card mb-4 sm:mb-6">
                  <h3 className="font-medium text-sm sm:text-base mb-3 sm:mb-4">How to Invite Members</h3>
                  <div className="space-y-3 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">1</span>
                      <p>Copy the invite link above and share it with people you want to invite.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">2</span>
                      <p>When they open the link, they'll see the group info and can click "Join Group".</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">3</span>
                      <p>Once they join, they'll appear in the Members tab.</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="mt-4 pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => setShowAddMembers(true)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Members Directly
                      </Button>
                    </div>
                  )}
                </div>

                {/* Recent Joins via Invite */}
                <div className="p-4 sm:p-6 rounded-lg border bg-card">
                  <h3 className="font-medium text-sm sm:text-base mb-3 sm:mb-4">Recent Joins</h3>
                  {(() => {
                    // Show members who joined recently (last 7 days)
                    const recentJoins = members
                      .filter(m => {
                        const joinedDate = new Date(m.joined_at);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return joinedDate > weekAgo;
                      })
                      .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
                      .slice(0, 5);
                    
                    if (recentJoins.length === 0) {
                      return (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          No new members in the last 7 days.
                        </p>
                      );
                    }
                    
                    return (
                      <div className="space-y-2">
                        {recentJoins.map((member) => (
                          <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.user?.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {(member.user?.full_name || member.user?.email || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {member.user?.full_name || member.user?.email?.split('@')[0] || 'User'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Joined {new Date(member.joined_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Members Modal */}
        <AddMembersModal
          open={showAddMembers}
          onOpenChange={setShowAddMembers}
          groupId={groupId}
          existingMemberIds={members.map(m => m.user_id)}
          onAddMembers={handleAddMembers}
        />

        {/* Invite Link Modal */}
        <InviteLinkModal
          open={showInviteLink}
          onOpenChange={setShowInviteLink}
          groupId={groupId}
          groupName={group.name}
          inviteCode={group.invite_code}
          onGenerateInvite={handleGenerateInvite}
          onRevokeInvite={async () => { await regenerateInviteLink(groupId); }}
        />
      </div>
    </AppLayout>
  );
}
