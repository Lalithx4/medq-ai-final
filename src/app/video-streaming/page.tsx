// Video Streaming Dashboard Page - Clean Professional UI
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  Plus, 
  Users, 
  Clock, 
  Play, 
  MoreVertical,
  Trash2,
  ExternalLink,
  Calendar,
  Radio,
  CheckCircle,
  Copy,
  Search,
  ArrowRight,
  Wifi,
  Activity,
  Share2,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CreateRoomModal, ScheduleCalendar, ShareMeetingDialog, RescheduleMeetingDialog } from '@/features/video-streaming/components';
import { StreamingRoom } from '@/features/video-streaming/types';
import { parseISO, isPast, addMinutes } from 'date-fns';
import { AppLayout } from '@/components/home/AppLayout';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function VideoStreamingPage() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedStream, setSelectedStream] = useState<StreamingRoom | null>(null);
  const [hostedRooms, setHostedRooms] = useState<StreamingRoom[]>([]);
  const [participatedRooms, setParticipatedRooms] = useState<StreamingRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');

  // Fetch rooms
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/video-streaming/rooms');
      const data = await response.json();
      
      if (response.ok) {
        setHostedRooms(data.hosted || []);
        setParticipatedRooms(data.participated || []);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }
    router.push(`/video-streaming/${joinCode.trim().toUpperCase()}`);
  };

  const handleDeleteRoom = async (roomCode: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
      const response = await fetch(`/api/video-streaming/${roomCode}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Room deleted');
        fetchRooms();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete room');
      }
    } catch (error) {
      toast.error('Failed to delete room');
    }
  };

  const copyRoomLink = (roomCode: string) => {
    const link = `${window.location.origin}/video-streaming/${roomCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Room link copied!');
  };

  const handleShareStream = (stream: StreamingRoom) => {
    setSelectedStream(stream);
    setShowShareDialog(true);
  };

  // Check if a scheduled stream can be started (15 min before scheduled time)
  const canStartStream = (room: StreamingRoom) => {
    if (!room.scheduled_at) return true;
    const scheduledTime = parseISO(room.scheduled_at);
    const startWindow = addMinutes(scheduledTime, -15);
    return new Date() >= startWindow;
  };

  // Stats
  const totalStreams = hostedRooms.length;
  const liveStreams = hostedRooms.filter(r => r.status === 'live').length;
  const totalViewers = hostedRooms.reduce((acc, r) => acc + (r.participant_count || 0), 0);

  const getStatusBadge = (status: string, room?: StreamingRoom) => {
    switch (status) {
      case 'live':
        return (
          <Badge className="bg-red-500/90 text-white border-0 shadow-lg shadow-red-500/30">
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Live
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0">
            <Calendar className="w-3 h-3 mr-1" />
            Scheduled
          </Badge>
        );
      case 'waiting':
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0">
            <Clock className="w-3 h-3 mr-1" />
            Waiting
          </Badge>
        );
      case 'ended':
        return (
          <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800 border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ended
          </Badge>
        );
      default:
        return null;
    }
  };

  // Calculate scheduled streams count
  const scheduledStreams = hostedRooms.filter(r => r.status === 'scheduled').length;

  const RoomCard = ({ room, isHosted = true, index = 0 }: { room: StreamingRoom; isHosted?: boolean; index?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "bg-card hover:shadow-lg border border-border",
        "hover:-translate-y-0.5",
        room.status === 'live' && "ring-2 ring-red-500/40"
      )}>
        <CardContent className="p-5 relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                {room.title}
              </h3>
              {room.description && (
                <p className="text-sm text-muted-foreground truncate mt-1">
                  {room.description}
                </p>
              )}
            </div>
            {getStatusBadge(room.status)}
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-md">
              <Users className="w-3.5 h-3.5" />
              {room.participant_count || 0}
            </span>
            {room.scheduled_at ? (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {format(parseISO(room.scheduled_at), 'MMM d, h:mm a')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(room.created_at), 'MMM d')}
              </span>
            )}
            {room.total_duration_seconds && room.total_duration_seconds > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {Math.floor(room.total_duration_seconds / 60)}m
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              className={cn(
                "flex-1",
                room.status === 'live' && "bg-red-500 hover:bg-red-600 text-white"
              )}
              disabled={room.status === 'ended' || (room.status === 'scheduled' && !canStartStream(room))}
              onClick={() => router.push(`/video-streaming/${room.room_code}`)}
            >
              {room.status === 'live' ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Join Live
                </>
              ) : room.status === 'scheduled' ? (
                canStartStream(room) ? (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Start Now
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Scheduled
                  </>
                )
              ) : room.status === 'waiting' ? (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  {isHosted ? 'Start Stream' : 'Join'}
                </>
              ) : (
                'View Details'
              )}
            </Button>

            {isHosted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleShareStream(room)}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share meeting
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyRoomLink(room.room_code)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => window.open(`/video-streaming/${room.room_code}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in new tab
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDeleteRoom(room.room_code)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete room
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Video className="w-5 h-5 text-red-500" />
                </div>
                Video Streaming
              </h1>
              <p className="text-muted-foreground mt-1">
                Create and join live video streams for medical education
              </p>
            </div>
            
            <Button 
              onClick={() => setShowCreateModal(true)} 
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Stream
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-card border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Video className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalStreams}</p>
                    <p className="text-xs text-muted-foreground">Total Streams</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Activity className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{liveStreams}</p>
                    <p className="text-xs text-muted-foreground">Live Now</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Users className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalViewers}</p>
                    <p className="text-xs text-muted-foreground">Total Viewers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Join - Hidden for now */}
          {/* <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wifi className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-medium">Quick Join</h2>
                  <p className="text-sm text-muted-foreground">Enter a room code to join instantly</p>
                </div>
              </div>
              <div className="flex gap-3 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter room code (e.g., ABC12345)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    className="pl-9 font-mono uppercase"
                    maxLength={8}
                  />
                </div>
                <Button onClick={handleJoinRoom}>
                  Join
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card> */}

          {/* Rooms Tabs */}
          <Tabs defaultValue="calendar" className="space-y-4">
            <TabsList className="bg-muted">
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="w-4 h-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="hosted" className="gap-2">
                <Video className="w-4 h-4" />
                My Streams ({hostedRooms.length})
              </TabsTrigger>
              <TabsTrigger value="participated" className="gap-2">
                <Users className="w-4 h-4" />
                Joined ({participatedRooms.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <ScheduleCalendar 
                streams={hostedRooms} 
                onStreamClick={(stream) => router.push(`/video-streaming/${stream.room_code}`)}
                onShareClick={(stream) => {
                  setSelectedStream(stream);
                  setShowShareDialog(true);
                }}
                onRescheduleClick={(stream) => {
                  setSelectedStream(stream);
                  setShowRescheduleDialog(true);
                }}
              />
            </TabsContent>

            <TabsContent value="hosted">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <Card key={i} className="animate-pulse bg-muted/50 border">
                        <CardContent className="p-5">
                          <div className="h-5 bg-muted rounded mb-3 w-3/4" />
                          <div className="h-4 bg-muted rounded w-1/2 mb-4" />
                          <div className="h-9 bg-muted rounded" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : hostedRooms.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card className="bg-card border">
                      <CardContent className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-xl flex items-center justify-center">
                          <Video className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">No streams yet</h3>
                        <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                          Create your first stream to start broadcasting live video to your students
                        </p>
                        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                          <Plus className="w-4 h-4" />
                          Create Your First Stream
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hostedRooms.map((room, index) => (
                      <RoomCard key={room.id} room={room} isHosted index={index} />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="participated">
              <AnimatePresence mode="wait">
                {participatedRooms.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Card className="bg-card border">
                      <CardContent className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-xl flex items-center justify-center">
                          <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">No streams joined</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                          Join a stream using a room code shared by your instructor
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {participatedRooms.map((room, index) => (
                      <RoomCard key={room.id} room={room} isHosted={false} index={index} />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Modal */}
      <CreateRoomModal open={showCreateModal} onOpenChange={setShowCreateModal} />
      
      {/* Share Dialog */}
      <ShareMeetingDialog 
        open={showShareDialog} 
        onOpenChange={setShowShareDialog}
        stream={selectedStream}
        onStartMeeting={(stream) => router.push(`/video-streaming/${stream.room_code}`)}
        onReschedule={(stream) => {
          setSelectedStream(stream);
          setShowRescheduleDialog(true);
        }}
      />

      {/* Reschedule Dialog */}
      <RescheduleMeetingDialog
        open={showRescheduleDialog}
        onOpenChange={setShowRescheduleDialog}
        stream={selectedStream}
        onRescheduleSuccess={(updatedStream) => {
          // Update the stream in the local state
          setHostedRooms(prev => 
            prev.map(room => room.id === updatedStream.id ? updatedStream : room)
          );
          setSelectedStream(updatedStream);
        }}
      />
    </AppLayout>
  );
}
