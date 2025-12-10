// Members List Component
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Crown, 
  MoreVertical, 
  UserMinus,
  ShieldPlus,
  ShieldMinus,
  User
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GroupMember, MemberRole } from '../types';
import { cn } from '@/lib/utils';

interface MembersListProps {
  members: GroupMember[];
  currentUserId: string;
  currentUserRole: MemberRole;
  onUpdateRole: (memberId: string, role: MemberRole) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
  className?: string;
}

const roleIcons: Record<MemberRole, React.ReactNode> = {
  owner: <Crown className="w-4 h-4 text-yellow-500" />,
  admin: <Shield className="w-4 h-4 text-blue-500" />,
  member: null
};

const roleBadgeVariants: Record<MemberRole, string> = {
  owner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  member: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
};

export function MembersList({
  members,
  currentUserId,
  currentUserRole,
  onUpdateRole,
  onRemoveMember,
  className
}: MembersListProps) {
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'role';
    memberId: string;
    memberName: string;
    newRole?: MemberRole;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  // Sort members: owner first, then admins, then members
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    setIsLoading(true);
    try {
      if (confirmAction.type === 'remove') {
        await onRemoveMember(confirmAction.memberId);
      } else if (confirmAction.newRole) {
        await onUpdateRole(confirmAction.memberId, confirmAction.newRole);
      }
    } finally {
      setIsLoading(false);
      setConfirmAction(null);
    }
  };

  const canManageMember = (member: GroupMember): boolean => {
    if (!canManageMembers) return false;
    if (member.user_id === currentUserId) return false;
    if (member.role === 'owner') return false;
    if (currentUserRole === 'admin' && member.role === 'admin') return false;
    return true;
  };

  return (
    <>
      <ScrollArea className={cn("h-full", className)}>
        <div className="p-4 space-y-1">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>

          <AnimatePresence mode="popLayout">
            {sortedMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group"
              >
                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.user?.avatar_url || ''} />
                  <AvatarFallback>
                    {member.user?.full_name?.charAt(0) || 
                     member.user?.email?.charAt(0) || 
                     <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>

                {/* Member Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {member.user?.full_name || member.user?.email || 'Unknown'}
                    </p>
                    {roleIcons[member.role]}
                    {member.user_id === currentUserId && (
                      <span className="text-xs text-muted-foreground">(You)</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.user?.email}
                  </p>
                </div>

                {/* Role Badge */}
                <Badge 
                  variant="secondary" 
                  className={cn("capitalize text-xs", roleBadgeVariants[member.role])}
                >
                  {member.role}
                </Badge>

                {/* Actions Menu */}
                {canManageMember(member) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Role Management (Owner only) */}
                      {isOwner && (
                        <>
                          {member.role === 'member' ? (
                            <DropdownMenuItem 
                              onClick={() => setConfirmAction({
                                type: 'role',
                                memberId: member.user_id,
                                memberName: member.user?.full_name || 'this member',
                                newRole: 'admin'
                              })}
                            >
                              <ShieldPlus className="w-4 h-4 mr-2" />
                              Make Admin
                            </DropdownMenuItem>
                          ) : member.role === 'admin' && (
                            <DropdownMenuItem 
                              onClick={() => setConfirmAction({
                                type: 'role',
                                memberId: member.user_id,
                                memberName: member.user?.full_name || 'this member',
                                newRole: 'member'
                              })}
                            >
                              <ShieldMinus className="w-4 h-4 mr-2" />
                              Remove Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                        </>
                      )}
                      
                      {/* Remove Member */}
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmAction({
                          type: 'remove',
                          memberId: member.user_id,
                          memberName: member.user?.full_name || 'this member'
                        })}
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Remove from Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'remove' 
                ? 'Remove Member' 
                : confirmAction?.newRole === 'admin'
                ? 'Make Admin'
                : 'Remove Admin'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'remove' 
                ? `Are you sure you want to remove ${confirmAction?.memberName} from the group? They will need to be invited again to rejoin.`
                : confirmAction?.newRole === 'admin'
                ? `Are you sure you want to make ${confirmAction?.memberName} an admin? They will be able to manage members and group settings.`
                : `Are you sure you want to remove ${confirmAction?.memberName}'s admin privileges? They will become a regular member.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              disabled={isLoading}
              className={confirmAction?.type === 'remove' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
