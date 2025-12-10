// Invite Link Modal Component
'use client';

import { useState, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  RefreshCw, 
  Link as LinkIcon,
  QrCode,
  Loader2,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface InviteLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  inviteCode?: string | null;
  onGenerateInvite: () => Promise<string | null>;
  onRevokeInvite: () => Promise<void>;
}

export function InviteLinkModal({
  open,
  onOpenChange,
  groupId,
  groupName,
  inviteCode: initialInviteCode,
  onGenerateInvite,
  onRevokeInvite
}: InviteLinkModalProps) {
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const { toast } = useToast();

  // Update local state when prop changes
  useEffect(() => {
    setInviteCode(initialInviteCode);
  }, [initialInviteCode]);

  // Generate invite link URL
  const inviteUrl = inviteCode 
    ? `${window.location.origin}/groups/join/${inviteCode}`
    : null;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied!',
        description: 'Invite link copied to clipboard'
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive'
      });
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const code = await onGenerateInvite();
      if (code) {
        setInviteCode(code);
        toast({
          title: 'Invite link generated',
          description: 'Share this link to invite new members'
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await onRevokeInvite();
      setInviteCode(null);
      toast({
        title: 'Invite link revoked',
        description: 'Previous invite links will no longer work'
      });
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Link</DialogTitle>
          <DialogDescription>
            Share this link to invite people to {groupName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {inviteUrl ? (
            <>
              {/* Invite Link Input */}
              <div className="flex gap-2">
                <Input
                  value={inviteUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* QR Code placeholder - can be implemented with a QR library */}
              <div className="flex items-center justify-center py-6 border rounded-lg bg-muted/30">
                <div className="text-center">
                  <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    QR Code coming soon
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isGenerating || isRevoking}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Reset Link
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRevoke}
                  disabled={isGenerating || isRevoking}
                  className="flex-1"
                >
                  {isRevoking ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Revoke
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Anyone with this link can join the group. 
                Revoke it if you want to prevent new joins.
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <LinkIcon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-medium mb-2">No active invite link</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate a link to invite people to this group
              </p>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Generate Invite Link
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
