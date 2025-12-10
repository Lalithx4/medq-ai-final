// Join Group Modal - Enter invite code to join a group
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Link2, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (inviteCode: string) => Promise<{ success: boolean; group?: any; error?: string; status?: string }>;
}

export function JoinGroupModal({ isOpen, onClose, onJoin }: JoinGroupModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    if (!isLoading) {
      setInviteCode('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const extractInviteCode = (input: string): string => {
    // Handle full URL like: http://localhost:3000/groups/join/abc123
    // Or just the code itself: abc123
    const trimmed = input.trim();
    
    // Check if it's a URL
    if (trimmed.includes('/groups/join/')) {
      const parts = trimmed.split('/groups/join/');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        return lastPart.split('?')[0]?.split('#')[0] || trimmed;
      }
    }
    
    // Check if it's a URL with invite code parameter
    if (trimmed.includes('invite=')) {
      const match = trimmed.match(/invite=([^&]+)/);
      return match?.[1] || trimmed;
    }
    
    // Otherwise assume it's just the code
    return trimmed;
  };

  const handleJoin = async () => {
    const code = extractInviteCode(inviteCode);
    
    if (!code) {
      setError('Please enter an invite code or link');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await onJoin(code);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else if (result.status === 'already_member') {
        setError('You are already a member of this group');
      } else {
        setError(result.error || 'Failed to join group');
      }
    } catch (err) {
      setError('Failed to join group. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInviteCode(text);
      setError(null);
    } catch (err) {
      // Clipboard access denied
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-background rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Join a Group</h2>
                <p className="text-sm text-muted-foreground">Enter an invite code or link</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} disabled={isLoading}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-semibold text-lg">Joined Successfully!</h3>
                <p className="text-sm text-muted-foreground">You're now a member of the group</p>
              </motion.div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Invite Code or Link</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="invite-code"
                        placeholder="Enter code or paste invite link..."
                        value={inviteCode}
                        onChange={(e) => {
                          setInviteCode(e.target.value);
                          setError(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                        className="pl-9"
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>
                    <Button variant="outline" onClick={handlePaste} disabled={isLoading}>
                      Paste
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can paste a full invite link or just the invite code
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div className="flex items-center justify-end gap-2 p-4 border-t bg-muted/30">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleJoin} disabled={isLoading || !inviteCode.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Join Group
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
