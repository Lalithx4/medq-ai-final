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
  Users,
  Share2,
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
  const [redirecting, setRedirecting] = useState(false);

  // Fetch token and meeting URL on mount
  useEffect(() => {
    const initializeMeeting = async () => {
      try {
        setIsLoading(true);
        
        // First, join the room to get room info
        const joinResponse = await fetch(`/api/video-streaming/${roomCode}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!joinResponse.ok) {
          const joinError = await joinResponse.json();
          throw new Error(joinError.error || 'Failed to join room');
        }
        
        const joinData = await joinResponse.json();
        setRoomTitle(joinData.room?.title || 'Video Meeting');
        setIsHost(joinData.isHost);
        
        // Get MiroTalk token
        const tokenResponse = await fetch('/api/video-streaming/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomCode, role: joinData.role }),
        });
        
        if (!tokenResponse.ok) {
          const tokenError = await tokenResponse.json();
          throw new Error(tokenError.error || 'Failed to get meeting token');
        }
        
        const tokenData = await tokenResponse.json();
        setMeetingUrl(tokenData.meetingUrl);
        setIsLoading(false);
        
      } catch (err) {
        console.error('Error initializing meeting:', err);
        setError((err as Error).message);
        setIsLoading(false);
      }
    };
    
    initializeMeeting();
  }, [roomCode]);

  // Copy room link
  const copyRoomLink = () => {
    const link = `${window.location.origin}/video-streaming/${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Room link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Join meeting (redirect to MiroTalk)
  const joinMeeting = () => {
    if (meetingUrl) {
      setRedirecting(true);
      window.location.href = meetingUrl;
    }
  };

  // Open in new tab
  const openInNewTab = () => {
    if (meetingUrl) {
      window.open(meetingUrl, '_blank');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
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
          <h2 className="text-2xl font-bold text-white mb-2">Preparing Meeting</h2>
          <p className="text-gray-400 mb-4">Setting up your video session...</p>
          <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
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
              <ArrowLeft className="w-4 h-4 mr-2" />
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

  // Redirecting state
  if (redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white">Joining Meeting...</h2>
          <p className="text-gray-400 mt-2">Redirecting to video room</p>
        </motion.div>
      </div>
    );
  }

  // Ready state - show join options
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        {/* Card */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Video className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-3xl blur opacity-20" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{roomTitle}</h1>
            <p className="text-gray-400">
              {isHost ? 'You are the host of this meeting' : 'You are joining as a participant'}
            </p>
          </div>

          {/* Room Info */}
          <div className="bg-gray-700/30 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Room Code</p>
                <p className="text-lg font-mono text-white">{roomCode}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyRoomLink}
                className="text-gray-400 hover:text-white"
              >
                {copied ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={joinMeeting}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25"
            >
              <Video className="w-5 h-5 mr-2" />
              Join Meeting
            </Button>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={openInNewTab}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/50 rounded-xl"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </Button>
              <Button
                variant="outline"
                onClick={copyRoomLink}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/50 rounded-xl"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Link
              </Button>
            </div>
          </div>

          {/* Back button */}
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => router.push('/video-streaming')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Meetings
            </Button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-gray-500 text-sm mt-4">
          Powered by BioDocs.ai • Secure video conferencing
        </p>
      </motion.div>
    </div>
  );
}
