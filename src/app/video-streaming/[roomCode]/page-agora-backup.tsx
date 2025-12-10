// Video Streaming Room Page - MiroTalk Integration
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Loader2, 
  AlertCircle, 
  Video,
  ExternalLink,
  Copy,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

export default function StreamingRoomPage({ params }: PageProps) {
  const { roomCode } = use(params);
  const router = useRouter();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const chat = useStreamChat({ 
    roomCode, 
    roomId: streaming.room?.id,
    enabled: streaming.room?.allow_chat 
  });

  // Check if current user is in waiting room and handle admission
  useEffect(() => {
    const myParticipant = streaming.participants.find(p => p.user_id === currentUserId || p.user?.id === currentUserId);
    
    if (myParticipant) {
      const wasInWaiting = isInWaitingRoom;
      const nowInWaiting = myParticipant.is_in_waiting_room;
      
      setIsInWaitingRoom(nowInWaiting);
      
      // User was in waiting room and is now admitted
      if (wasInWaiting && !nowInWaiting && !wasAdmitted) {
        setWasAdmitted(true);
        toast.success('🎉 You have been admitted to the stream!', { duration: 5000 });
        // Reload page to rejoin with proper permissions
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    }
  }, [streaming.participants, currentUserId, isInWaitingRoom, wasAdmitted]);

  // Notify host when new participants enter waiting room
  useEffect(() => {
    const waitingRoom = streaming.participants.filter(p => p.is_in_waiting_room);
    const waitingCount = waitingRoom.length;
    
    if (streaming.isHost && waitingCount > previousWaitingCount && previousWaitingCount >= 0) {
      const newCount = waitingCount - previousWaitingCount;
      toast.info(`🔔 ${newCount} new participant${newCount > 1 ? 's' : ''} waiting to join`, {
        duration: 8000,
        action: {
          label: 'Admit',
          onClick: () => setShowParticipants(true),
        },
      });
      // Auto-open participants panel if waiting room has people
      if (!showParticipants) {
        setShowParticipants(true);
      }
    }
    setPreviousWaitingCount(waitingCount);
  }, [streaming.participants, streaming.isHost, previousWaitingCount, showParticipants]);

  // Stream duration timer
  useEffect(() => {
    const room = streaming.room;
    if (room?.status === 'live' && room?.started_at) {
      const startTime = new Date(room.started_at).getTime();
      
      const interval = setInterval(() => {
        const now = Date.now();
        setStreamDuration(Math.floor((now - startTime) / 1000));
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [streaming.room?.status, streaming.room?.started_at]);

  // Handle stream ended by host - cleanup for all viewers
  useEffect(() => {
    const room = streaming.room;
    if (room?.status === 'ended' && !isInitializing) {
      console.log('🛑 Stream has ended, cleaning up...');
      toast.info('The stream has ended', { duration: 5000 });
      
      // Cleanup resources
      const cleanup = async () => {
        // Unpublish and close tracks
        if (agoraClient) {
          try {
            const tracksToUnpublish = [];
            if (localTracks.audio) tracksToUnpublish.push(localTracks.audio);
            if (localTracks.video) tracksToUnpublish.push(localTracks.video);
            if (screenTrack) tracksToUnpublish.push(screenTrack);
            
            if (tracksToUnpublish.length > 0) {
              await agoraClient.unpublish(tracksToUnpublish);
            }
          } catch (e) { /* ignore */ }
        }
        
        if (localTracks.audio) {
          try { localTracks.audio.stop(); localTracks.audio.close(); } catch (e) { /* ignore */ }
        }
        if (localTracks.video) {
          try { localTracks.video.stop(); localTracks.video.close(); } catch (e) { /* ignore */ }
        }
        if (screenTrack) {
          try { screenTrack.stop(); screenTrack.close(); } catch (e) { /* ignore */ }
        }
        
        setLocalTracks({ audio: null, video: null });
        setScreenTrack(null);
        
        if (agoraClient) {
          try { await agoraClient.leave(); } catch (e) { /* ignore */ }
          setAgoraClient(null);
        }
        
        setRemoteUsers([]);
        
        // Redirect after short delay
        setTimeout(() => {
          router.push('/video-streaming');
        }, 2000);
      };
      
      cleanup();
    }
  }, [streaming.room?.status, isInitializing, agoraClient, localTracks, screenTrack, router]);

  // Format duration to HH:MM:SS
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Handle reaction
  const handleReaction = (emoji: string) => {
    const newReaction: FloatingReaction = {
      id: reactionCounter,
      emoji,
      x: Math.random() * 80 + 10, // 10-90% from left
    };
    
    setFloatingReactions(prev => [...prev, newReaction]);
    setReactionCounter(prev => prev + 1);
    
    // Remove after animation
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 3000);
  };

  // Handle hand raise
  const handleRaiseHand = async () => {
    try {
      const newState = await streaming.toggleHandRaise();
      setHandRaised(newState);
      toast.success(newState ? '✋ Hand raised' : 'Hand lowered');
    } catch (err) {
      toast.error('Failed to toggle hand');
    }
  };

  // Initialize Agora
  useEffect(() => {
    const initializeStream = async () => {
      try {
        console.log('🎬 Starting stream initialization...');
        
        // Join room via API first
        console.log('📡 Joining room...');
        const joinData = await streaming.joinRoom();
        console.log('✅ Joined room:', joinData);
        
        // Set user ID from join response
        if (joinData.userId) {
          setCurrentUserId(joinData.userId);
        }
        
        // Track waiting room status
        if (joinData.isInWaitingRoom) {
          setIsInWaitingRoom(true);
          setIsInitializing(false);
          // Don't initialize Agora yet - wait for admission
          return;
        }
        
        // Get token
        console.log('🔑 Getting Agora token...');
        const tokenData = await streaming.getToken();
        console.log('✅ Token received:', {
          appId: tokenData.appId,
          appIdLength: tokenData.appId?.length,
          channel: tokenData.channel,
          uid: tokenData.uid,
          hasRtcToken: !!tokenData.rtcToken,
          rtcTokenLength: tokenData.rtcToken?.length,
        });
        
        // Also set from token if available
        if (!currentUserId) {
          setCurrentUserId(tokenData.uid.toString());
        }
        
        // Validate token data
        if (!tokenData.appId || tokenData.appId.length !== 32) {
          throw new Error(`Invalid App ID: ${tokenData.appId || 'empty'} (length: ${tokenData.appId?.length || 0})`);
        }
        
        // Import Agora dynamically (client-side only)
        console.log('📦 Loading Agora SDK...');
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        
        // Enable Agora SDK logging for debugging
        AgoraRTC.setLogLevel(0); // 0 = DEBUG, 1 = INFO, 2 = WARNING, 3 = ERROR, 4 = NONE
        
        // Create client - use 'rtc' mode for interactive video (all participants can see each other)
        // 'live' mode is for broadcasting where only hosts can publish
        console.log('🔧 Creating Agora client...');
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        
        // Setup event handlers BEFORE joining
        client.on('user-published', async (user: any, mediaType: string) => {
          console.log(`📥 User published: ${user.uid}, mediaType: ${mediaType}`);
          try {
            await client.subscribe(user, mediaType);
            console.log(`✅ Subscribed to ${user.uid} ${mediaType}`);
            
            if (mediaType === 'video') {
              setRemoteUsers(prev => {
                const filtered = prev.filter(u => u.uid !== user.uid);
                console.log(`📹 Adding remote user ${user.uid} with video track`);
                return [...filtered, user];
              });
            }
            
            if (mediaType === 'audio') {
              user.audioTrack?.play();
            }
          } catch (err) {
            console.error(`❌ Failed to subscribe to ${user.uid}:`, err);
          }
        });

        client.on('user-unpublished', (user: any, mediaType: string) => {
          console.log(`📤 User unpublished: ${user.uid}, mediaType: ${mediaType}`);
          if (mediaType === 'video') {
            setRemoteUsers(prev => prev.map(u => u.uid === user.uid ? { ...user, videoTrack: null } : u));
          }
        });

        client.on('user-left', (user: any) => {
          console.log(`👋 User left: ${user.uid}`);
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        });
        
        client.on('user-joined', (user: any) => {
          console.log(`👤 User joined channel: ${user.uid}`);
        });

        // Determine if this user is a host
        const isHostRole = joinData.role === 'host' || joinData.role === 'co-host';
        console.log('👤 User role:', joinData.role, 'isHost:', isHostRole);

        // Debug: Log Agora connection details
        console.log('Attempting Agora join with:', {
          appId: tokenData.appId,
          appIdLength: tokenData.appId?.length,
          channel: tokenData.channel,
          uid: tokenData.uid,
          tokenLength: tokenData.rtcToken?.length,
        });

        // Join channel
        console.log('🚀 Joining Agora channel...');
        console.log('📋 Join params:', {
          appId: tokenData.appId,
          channel: tokenData.channel,
          isTestMode: tokenData.isTestMode,
          hasToken: !!tokenData.rtcToken,
          uid: tokenData.uid,
        });
        
        try {
          // Use null token for test mode, actual token for production
          const tokenToUse = tokenData.isTestMode ? null : tokenData.rtcToken;
          
          await client.join(
            tokenData.appId,
            tokenData.channel,
            tokenToUse,
            tokenData.uid
          );
          console.log('✅ Successfully joined Agora channel!');
        } catch (joinError: any) {
          console.error('❌ Agora join failed:', {
            code: joinError?.code,
            message: joinError?.message,
            name: joinError?.name,
          });
          throw joinError;
        }

        setAgoraClient(client);

        // If host, create and publish tracks
        if (isHostRole) {
          try {
            const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
              {},
              { encoderConfig: '720p_2' }
            );
            
            await client.publish([audioTrack, videoTrack]);
            setLocalTracks({ audio: audioTrack, video: videoTrack });
            console.log('✅ Tracks created and published successfully');
          } catch (trackError: any) {
            console.error('Error creating tracks:', trackError);
            
            // Handle permission denied specifically
            if (trackError?.message?.includes('PERMISSION_DENIED') || trackError?.message?.includes('NotAllowedError')) {
              toast.error('Camera/microphone access denied. Please allow permissions in your browser.', {
                duration: 5000,
              });
            } else if (trackError?.message?.includes('NotFoundError')) {
              toast.error('No camera or microphone found. Please connect a device.');
            } else {
              toast.error('Could not access camera/microphone. You can still view the stream.');
            }
            
            // Continue without local tracks - user can still view others
          }
        }

        setIsInitializing(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError((err as Error).message);
        setIsInitializing(false);
      }
    };

    initializeStream();

    // Cleanup function - properly leave channel and close tracks
    return () => {
      console.log('🧹 Cleaning up Agora resources...');
      
      if (localTracks.audio) {
        try {
          localTracks.audio.stop();
          localTracks.audio.close();
        } catch (e) { /* ignore */ }
      }
      if (localTracks.video) {
        try {
          localTracks.video.stop();
          localTracks.video.close();
        } catch (e) { /* ignore */ }
      }
      if (screenTrack) {
        try {
          screenTrack.stop();
          screenTrack.close();
        } catch (e) { /* ignore */ }
      }
      if (agoraClient) {
        try {
          agoraClient.leave().then(() => {
            console.log('✅ Left Agora channel');
          }).catch(() => { /* ignore */ });
        } catch (e) { /* ignore */ }
      }
    };
  }, [roomCode]);

  // Handle page unload/close - release media resources
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Synchronously try to cleanup
      if (localTracks.audio) {
        try { localTracks.audio.stop(); localTracks.audio.close(); } catch (e) {}
      }
      if (localTracks.video) {
        try { localTracks.video.stop(); localTracks.video.close(); } catch (e) {}
      }
      if (screenTrack) {
        try { screenTrack.stop(); screenTrack.close(); } catch (e) {}
      }
      if (agoraClient) {
        try { agoraClient.leave(); } catch (e) {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Also cleanup on component unmount
    };
  }, [localTracks, screenTrack, agoraClient]);

  // Toggle audio
  const toggleAudio = async () => {
    if (localTracks.audio) {
      await localTracks.audio.setEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    if (localTracks.video) {
      await localTracks.video.setEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (!agoraClient) return;

    if (isScreenSharing) {
      // Stop screen share
      if (screenTrack) {
        await agoraClient.unpublish(screenTrack);
        screenTrack.stop();
        screenTrack.close();
        setScreenTrack(null);
      }
      // Re-publish camera
      if (localTracks.video) {
        await agoraClient.publish(localTracks.video);
      }
      setIsScreenSharing(false);
    } else {
      // Start screen share
      try {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        const track = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: '1080p_2',
        }, 'disable');

        // Unpublish camera
        if (localTracks.video) {
          await agoraClient.unpublish(localTracks.video);
        }

        const videoTrack = Array.isArray(track) ? track[0] : track;
        await agoraClient.publish(videoTrack);
        setScreenTrack(videoTrack);
        setIsScreenSharing(true);

        // Handle screen share stop
        videoTrack.on('track-ended', () => {
          toggleScreenShare();
        });
      } catch (err) {
        console.error('Screen share error:', err);
        toast.error('Failed to share screen');
      }
    }
  };

  // Leave room - properly cleanup all resources
  const handleLeave = async () => {
    console.log('🚪 Leaving room, cleaning up resources...');
    
    try {
      // First unpublish tracks from Agora
      if (agoraClient) {
        try {
          const tracksToUnpublish = [];
          if (localTracks.audio) tracksToUnpublish.push(localTracks.audio);
          if (localTracks.video) tracksToUnpublish.push(localTracks.video);
          if (screenTrack) tracksToUnpublish.push(screenTrack);
          
          if (tracksToUnpublish.length > 0) {
            console.log('Unpublishing tracks...');
            await agoraClient.unpublish(tracksToUnpublish);
          }
        } catch (unpubError) {
          console.error('Error unpublishing:', unpubError);
        }
      }
      
      // Stop and close local audio track
      if (localTracks.audio) {
        console.log('Stopping audio track...');
        try {
          localTracks.audio.stop();
          localTracks.audio.close();
        } catch (e) { console.error('Error closing audio:', e); }
      }
      
      // Stop and close local video track
      if (localTracks.video) {
        console.log('Stopping video track...');
        try {
          localTracks.video.stop();
          localTracks.video.close();
        } catch (e) { console.error('Error closing video:', e); }
      }
      
      // Stop and close screen share track
      if (screenTrack) {
        console.log('Stopping screen track...');
        try {
          screenTrack.stop();
          screenTrack.close();
        } catch (e) { console.error('Error closing screen:', e); }
      }
      
      // Clear track state
      setLocalTracks({ audio: null, video: null });
      setScreenTrack(null);
      
      // Leave Agora channel
      if (agoraClient) {
        console.log('Leaving Agora channel...');
        try {
          await agoraClient.leave();
          console.log('✅ Left Agora channel');
        } catch (leaveError) {
          console.error('Error leaving channel:', leaveError);
        }
        setAgoraClient(null);
      }
      
      // Clear remote users
      setRemoteUsers([]);
      
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
    
    router.push('/video-streaming');
  };

  // Start stream (host only)
  const handleStartStream = async () => {
    try {
      await streaming.startStream();
      toast.success('Stream started!');
    } catch (err) {
      toast.error('Failed to start stream');
    }
  };

  // End stream (host only)
  const handleEndStream = async () => {
    if (!confirm('Are you sure you want to end the stream for everyone?')) return;
    
    try {
      // End stream in database first
      await streaming.endStream();
      toast.success('Stream ended');
      
      // Then cleanup and leave
      await handleLeave();
    } catch (err) {
      console.error('Error ending stream:', err);
      toast.error('Failed to end stream');
      // Still try to cleanup even if API fails
      await handleLeave();
    }
  };

  // Copy room link
  const copyRoomLink = () => {
    const link = `${window.location.origin}/video-streaming/${roomCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Room link copied!');
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative text-center"
        >
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Video className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-3xl blur opacity-30 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Joining Stream</h2>
          <p className="text-gray-400 mb-4">Setting up your connection...</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      </div>
    );
  }

  // Waiting room state
  if (isInWaitingRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative text-center max-w-md"
        >
          <div className="relative mb-6">
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30"
            >
              <Clock className="w-12 h-12 text-white" />
            </motion.div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Waiting Room</h2>
          <p className="text-gray-400 mb-2">
            You're in the waiting room
          </p>
          <p className="text-sm text-gray-500 mb-8">
            The host will admit you shortly. Please wait...
          </p>
          <div className="flex items-center justify-center gap-2 mb-6">
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-2 h-2 bg-amber-500 rounded-full"
            />
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
              className="w-2 h-2 bg-amber-500 rounded-full"
            />
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }}
              className="w-2 h-2 bg-amber-500 rounded-full"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.push('/video-streaming')}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Leave Waiting Room
          </Button>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Join</h2>
          <p className="text-gray-400 mb-8">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={() => router.push('/video-streaming')}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
              Try Again
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const room = streaming.room;
  const isHost = streaming.isHost;
  const isLive = room?.status === 'live';

  return (
    <TooltipProvider>
      <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col overflow-hidden">
        {/* Animated background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <header className="relative flex items-center justify-between px-4 py-3 bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50">
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                onClick={handleLeave}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Leave
              </Button>
            </motion.div>
            <div>
              <h1 className="font-semibold text-white flex items-center gap-2">
                {room?.title || 'Stream'}
                {isLive && (
                  <Badge className="bg-red-500/90 text-white border-0 shadow-lg shadow-red-500/30">
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    Live
                  </Badge>
                )}
                {room?.status === 'waiting' && (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-0">
                    <Clock className="w-3 h-3 mr-1" />
                    Waiting
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-gray-400 flex items-center gap-2">
                <span>Room: {roomCode}</span>
                <button 
                  onClick={copyRoomLink}
                  className="hover:text-white transition-colors"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </p>
            </div>
          </div>
          
          {/* Live stats */}
          <div className="flex items-center gap-4">
            {isLive && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4"
              >
                <div className="flex items-center gap-2 bg-gray-700/50 rounded-full px-3 py-1.5">
                  <Eye className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-white">{streaming.participants.length}</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-700/50 rounded-full px-3 py-1.5">
                  <Timer className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-mono text-white">{formatDuration(streamDuration)}</span>
                </div>
              </motion.div>
            )}
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowParticipants(!showParticipants)}
                className={cn(
                  'text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg',
                  showParticipants && 'bg-gray-700 text-white'
                )}
              >
                <Users className="w-4 h-4 mr-1" />
                {streaming.participants.length}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChat(!showChat)}
                className={cn(
                  'text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg',
                  showChat && 'bg-gray-700 text-white'
                )}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Floating Reactions */}
          <AnimatePresence>
            {floatingReactions.map(reaction => (
              <motion.div
                key={reaction.id}
                initial={{ opacity: 1, y: 0, x: `${reaction.x}%` }}
                animate={{ opacity: 0, y: -200 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 3, ease: 'easeOut' }}
                className="absolute bottom-32 text-4xl pointer-events-none z-50"
                style={{ left: `${reaction.x}%` }}
              >
                {reaction.emoji}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Video Area */}
          <div className="flex-1 flex flex-col p-4">
            {/* Main Video */}
            <div className="flex-1 relative rounded-2xl overflow-hidden bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 shadow-2xl">
              {/* Screen share or host video */}
              {isScreenSharing && screenTrack ? (
                <VideoPlayer
                  localVideoTrack={screenTrack}
                  userName="Screen Share"
                  isLocal
                  isScreenShare
                  size="full"
                />
              ) : localTracks.video && isHost ? (
                <VideoPlayer
                  localVideoTrack={localTracks.video}
                  userName="You"
                  isHost
                  isLocal
                  isMuted={!isAudioEnabled}
                  size="full"
                />
              ) : remoteUsers.length > 0 && remoteUsers[0].videoTrack ? (
                <VideoPlayer
                  remoteUser={remoteUsers[0]}
                  userName="Host"
                  isHost
                  size="full"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                      <Video className="w-12 h-12 text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-lg">
                      {isHost ? 'Your camera is off' : 'Waiting for host to start...'}
                    </p>
                    {/* Debug info */}
                    {!isHost && (
                      <p className="text-gray-600 text-xs mt-2">
                        Connected users: {remoteUsers.length} | Agora: {agoraClient ? 'Connected' : 'Disconnected'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Self view (small) when not host */}
              {!isHost && localTracks.video && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute bottom-4 right-4 w-48 h-36 rounded-xl overflow-hidden shadow-xl border border-gray-600/50"
                >
                  <VideoPlayer
                    localVideoTrack={localTracks.video}
                    userName="You"
                    isLocal
                    isMuted={!isAudioEnabled}
                    size="small"
                  />
                </motion.div>
              )}

              {/* Live reactions bar */}
              {isLive && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 left-4 flex items-center gap-2"
                >
                  <div className="flex items-center gap-1.5 bg-gray-900/80 backdrop-blur-sm rounded-full px-3 py-2">
                    {REACTIONS.map(({ emoji }) => (
                      <motion.button
                        key={emoji}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReaction(emoji)}
                        className="text-2xl hover:bg-gray-700/50 rounded-full p-1 transition-colors"
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Remote users thumbnails */}
            {remoteUsers.length > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 mt-4 overflow-x-auto pb-2"
              >
                {remoteUsers.slice(1).map((user) => (
                  <div key={user.uid} className="flex-shrink-0 rounded-xl overflow-hidden shadow-lg border border-gray-700/30">
                    <VideoPlayer
                      remoteUser={user}
                      userName={`User ${user.uid}`}
                      size="small"
                    />
                  </div>
                ))}
              </motion.div>
            )}

            {/* Controls */}
            <div className="flex justify-center mt-4">
              <StreamControls
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                isScreenSharing={isScreenSharing}
                isHost={isHost}
                isLive={isLive}
                roomCode={roomCode}
                handRaised={handRaised}
                participantCount={streaming.participants.length}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                onToggleScreenShare={toggleScreenShare}
                onLeave={handleLeave}
                onStartStream={isHost && !isLive ? handleStartStream : undefined}
                onEndStream={isHost ? handleEndStream : undefined}
                onToggleChat={() => setShowChat(!showChat)}
                onToggleParticipants={() => setShowParticipants(!showParticipants)}
                onRaiseHand={!isHost && room?.allow_raise_hand ? handleRaiseHand : undefined}
              />
            </div>
          </div>

          {/* Sidebar */}
          <AnimatePresence>
            {(showChat || showParticipants) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-80 border-l border-gray-700/50 flex flex-col bg-gray-800/50 backdrop-blur-xl"
              >
                {showParticipants && (
                  <div className={cn('flex-1 overflow-hidden', showChat && 'max-h-[50%] border-b border-gray-700/50')}>
                    <ParticipantsList
                      participants={streaming.participants.filter(p => !p.is_in_waiting_room)}
                      isHost={isHost}
                      waitingRoom={streaming.participants.filter(p => p.is_in_waiting_room)}
                      onMute={(id) => streaming.updateParticipant(id, 'mute')}
                      onKick={(id) => streaming.updateParticipant(id, 'kick')}
                      onPromote={(id) => streaming.updateParticipant(id, 'promote')}
                      onDemote={(id) => streaming.updateParticipant(id, 'demote')}
                      onAdmit={(id) => streaming.updateParticipant(id, 'admit')}
                      onLowerHand={(id) => streaming.updateParticipant(id, 'lower_hand')}
                      className="h-full"
                    />
                  </div>
                )}
                {showChat && room?.allow_chat && (
                  <div className={cn('flex-1 overflow-hidden', showParticipants && 'max-h-[50%]')}>
                    <StreamChat
                      messages={chat.messages}
                      isLoading={chat.isLoading}
                      isSending={chat.isSending}
                      currentUserId={currentUserId}
                      onSendMessage={chat.sendMessage}
                      className="h-full"
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}
