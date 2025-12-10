// Join Group Page - Join via Invite Link
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, Loader2, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/home/AppLayout';
import { groupsApi } from '@/features/groups/api-config';
import { getBrowserSupabase } from '@/lib/supabase/client';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log('[JoinGroupPage]', ...args);

interface GroupInfo {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  member_count: number;
  is_member: boolean;
}

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.inviteCode as string;
  const supabase = getBrowserSupabase();

  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, [supabase.auth]);

  // Fetch group info
  useEffect(() => {
    const fetchGroupInfo = async () => {
      setIsLoading(true);
      setError(null);
      log('Fetching group info for invite:', inviteCode);
      
      try {
        const response = await fetch(groupsApi(`/api/groups/join/${inviteCode}`));
        log('Response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Invalid or expired invite link');
          } else {
            setError('Failed to load group information');
          }
          return;
        }
        const data = await response.json();
        log('Group info:', data);
        
        if (data.success && data.group) {
          setGroupInfo(data.group);
          if (data.group.is_member) {
            setJoined(true);
          }
        } else {
          setError(data.error || 'Failed to load group information');
        }
      } catch (err) {
        log('Fetch error:', err);
        setError('Failed to load group information');
      } finally {
        setIsLoading(false);
      }
    };

    if (inviteCode) {
      fetchGroupInfo();
    }
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/login?returnTo=/groups/join/${inviteCode}`);
      return;
    }

    setIsJoining(true);
    log('Joining group with invite:', inviteCode);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(groupsApi(`/api/groups/join/${inviteCode}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      log('Join response status:', response.status);
      const data = await response.json();
      log('Join response:', data);
      
      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to join group');
        return;
      }
      
      setJoined(true);
      
      // Redirect to group after short delay
      setTimeout(() => {
        router.push(`/groups/${data.group?.id || groupInfo?.id}`);
      }, 1500);
    } catch (err) {
      setError('Failed to join group');
    } finally {
      setIsJoining(false);
    }
  };

  const handleGoToGroup = () => {
    if (groupInfo) {
      router.push(`/groups/${groupInfo.id}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="max-w-md">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="font-semibold text-lg mb-2">Unable to Join</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => router.push('/groups')}>
                  Go to Groups
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // Success/Join state
  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={groupInfo?.avatar_url || ''} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {groupInfo?.name?.charAt(0).toUpperCase() || 'G'}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-xl">{groupInfo?.name}</CardTitle>
            {groupInfo?.description && (
              <CardDescription className="mt-2">
                {groupInfo.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Member Count */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>
                {groupInfo?.member_count} {groupInfo?.member_count === 1 ? 'member' : 'members'}
              </span>
            </div>

            {/* Join Status */}
            {joined ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <p className="font-medium text-green-600 mb-4">
                  {groupInfo?.is_member ? "You're already a member!" : "Successfully joined!"}
                </p>
                <Button onClick={handleGoToGroup} className="w-full">
                  Go to Group
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  You've been invited to join this group
                </p>
                <Button 
                  onClick={handleJoin} 
                  className="w-full" 
                  disabled={isJoining}
                >
                  {isJoining ? (
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
                {!isAuthenticated && (
                  <p className="text-xs text-center text-muted-foreground">
                    You'll need to sign in to join this group
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      </div>
    </AppLayout>
  );
}
