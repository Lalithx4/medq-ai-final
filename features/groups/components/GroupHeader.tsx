// Group Header Component
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Phone, 
  Video, 
  MoreVertical, 
  UserPlus,
  Link as LinkIcon,
  Settings,
  LogOut,
  Users,
  Bell,
  BellOff,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Group, MemberRole } from '../types';
import { cn } from '@/lib/utils';

interface GroupHeaderProps {
  group: Group;
  memberCount: number;
  currentUserRole: MemberRole;
  isMuted?: boolean;
  onBack?: () => void;
  onShowMembers?: () => void;
  onShowInfo?: () => void;
  onAddMembers?: () => void;
  onInviteLink?: () => void;
  onToggleMute?: () => void;
  onLeaveGroup?: () => Promise<void>;
  onDeleteGroup?: () => Promise<void>;
  className?: string;
}

export function GroupHeader({
  group,
  memberCount,
  currentUserRole,
  isMuted = false,
  onBack,
  onShowMembers,
  onShowInfo,
  onAddMembers,
  onInviteLink,
  onToggleMute,
  onLeaveGroup,
  onDeleteGroup,
  className
}: GroupHeaderProps) {
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<'leave' | 'delete' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin' || isOwner;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/groups');
    }
  };

  const handleConfirmAction = async () => {
    setIsProcessing(true);
    try {
      if (confirmAction === 'leave' && onLeaveGroup) {
        await onLeaveGroup();
      } else if (confirmAction === 'delete' && onDeleteGroup) {
        await onDeleteGroup();
      }
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 border-b bg-background",
        className
      )}>
        {/* Back Button */}
        <Button
          size="icon"
          variant="ghost"
          onClick={handleBack}
          className="md:hidden"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Group Info */}
        <button
          onClick={onShowInfo}
          className="flex items-center gap-3 flex-1 min-w-0 hover:bg-muted/50 rounded-lg p-1 -m-1 transition-colors"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={group.avatar_url || ''} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {group.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <h2 className="font-semibold truncate">{group.name}</h2>
            <p className="text-xs text-muted-foreground">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </p>
          </div>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Video Call Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push(`/video-streaming?groupId=${group.id}`)}
            title="Start Video Call"
          >
            <Video className="w-5 h-5" />
          </Button>

          {/* Members Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onShowMembers}
            title="View Members"
          >
            <Users className="w-5 h-5" />
          </Button>

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Add Members (Admin+) */}
              {isAdmin && (
                <DropdownMenuItem onClick={onAddMembers}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Members
                </DropdownMenuItem>
              )}

              {/* Invite Link (Admin+) */}
              {isAdmin && (
                <DropdownMenuItem onClick={onInviteLink}>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Invite Link
                </DropdownMenuItem>
              )}

              {/* Group Settings (Admin+) */}
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={onShowInfo}>
                    <Settings className="w-4 h-4 mr-2" />
                    Group Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Mute/Unmute */}
              <DropdownMenuItem onClick={onToggleMute}>
                {isMuted ? (
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

              <DropdownMenuSeparator />

              {/* Leave Group (non-owner) */}
              {!isOwner && (
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => setConfirmAction('leave')}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave Group
                </DropdownMenuItem>
              )}

              {/* Delete Group (owner only) */}
              {isOwner && (
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => setConfirmAction('delete')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Group
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'leave' ? 'Leave Group' : 'Delete Group'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'leave' 
                ? `Are you sure you want to leave "${group.name}"? You'll need to be invited again to rejoin.`
                : `Are you sure you want to delete "${group.name}"? This action cannot be undone and all messages will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? 'Processing...' : confirmAction === 'leave' ? 'Leave' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
