'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Video,
  Search,
  MoreHorizontal,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Users,
  Clock,
  Calendar,
  Play,
  Square,
  Radio,
  ArrowUpDown,
  TrendingUp,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Stream {
  id: string;
  title: string;
  room_code: string;
  status: string;
  host_id: string;
  max_participants: number;
  total_participants: number;
  peak_participants: number;
  total_duration_seconds: number;
  createdAt: string;
  started_at: string | null;
  ended_at: string | null;
  scheduled_at: string | null;
  host_email?: string;
  hostName?: string;
}

interface StreamStats {
  total: number;
  live: number;
  scheduled: number;
  ended: number;
  totalParticipants: number;
  avgDuration: number;
}

const ITEMS_PER_PAGE = 10;

export default function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState<Stream | null>(null);

  useEffect(() => {
    fetchStreams();
    fetchStats();
  }, []);

  const fetchStreams = async () => {
    setIsLoading(true);
    try {
      const supabase = getBrowserSupabase();

      const { data, error } = await supabase
        .from('streaming_rooms')
        .select(`
          *,
          users:host_id (
            email,
            name
          )
        `)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      const formattedStreams = (data || []).map((stream: any) => ({
        ...stream,
        host_email: stream.users?.email,
        hostName: stream.users?.name,
      }));

      setStreams(formattedStreams);
    } catch (error) {
      console.error('Error fetching streams:', error);
      toast.error('Failed to fetch streams');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const supabase = getBrowserSupabase();

      const { data: allStreams } = await supabase
        .from('streaming_rooms')
        .select('status, total_participants, total_duration_seconds');

      if (allStreams) {
        const live = allStreams.filter((s) => s.status === 'live').length;
        const scheduled = allStreams.filter((s) => s.status === 'scheduled').length;
        const ended = allStreams.filter((s) => s.status === 'ended').length;
        const totalParticipants = allStreams.reduce(
          (sum, s) => sum + (s.total_participants || 0),
          0
        );
        const streamsWithDuration = allStreams.filter((s) => s.total_duration_seconds > 0);
        const avgDuration = streamsWithDuration.length
          ? streamsWithDuration.reduce((sum, s) => sum + s.total_duration_seconds, 0) /
            streamsWithDuration.length
          : 0;

        setStats({
          total: allStreams.length,
          live,
          scheduled,
          ended,
          totalParticipants,
          avgDuration: Math.round(avgDuration / 60), // Convert to minutes
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredStreams = useMemo(() => {
    let result = [...streams];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (stream) =>
          stream.title?.toLowerCase().includes(query) ||
          stream.room_code?.toLowerCase().includes(query) ||
          stream.host_email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((stream) => stream.status === statusFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortField as keyof Stream];
      const bVal = b[sortField as keyof Stream];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [streams, searchQuery, statusFilter, sortField, sortOrder]);

  const paginatedStreams = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStreams.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStreams, currentPage]);

  const totalPages = Math.ceil(filteredStreams.length / ITEMS_PER_PAGE);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleDeleteStream = async () => {
    if (!streamToDelete) return;

    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase
        .from('streaming_rooms')
        .delete()
        .eq('id', streamToDelete.id);

      if (error) throw error;

      setStreams(streams.filter((s) => s.id !== streamToDelete.id));
      toast.success('Stream deleted successfully');
      setShowDeleteDialog(false);
      setStreamToDelete(null);
      fetchStats();
    } catch (error) {
      console.error('Error deleting stream:', error);
      toast.error('Failed to delete stream');
    }
  };

  const handleEndStream = async (stream: Stream) => {
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase
        .from('streaming_rooms')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', stream.id);

      if (error) throw error;

      setStreams(
        streams.map((s) =>
          s.id === stream.id ? { ...s, status: 'ended', ended_at: new Date().toISOString() } : s
        )
      );
      toast.success('Stream ended successfully');
      fetchStats();
    } catch (error) {
      console.error('Error ending stream:', error);
      toast.error('Failed to end stream');
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <Badge className="bg-red-500 gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Live
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge className="bg-blue-500/10 text-blue-500 gap-1">
            <Calendar className="w-3 h-3" />
            Scheduled
          </Badge>
        );
      case 'waiting':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 gap-1">
            <Clock className="w-3 h-3" />
            Waiting
          </Badge>
        );
      case 'ended':
        return (
          <Badge variant="secondary" className="gap-1">
            <Square className="w-3 h-3" />
            Ended
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-xl', color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Video className="w-8 h-8" />
            Video Streams
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage all video streaming sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchStreams} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Streams"
            value={stats.total}
            icon={Video}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            title="Live Now"
            value={stats.live}
            icon={Radio}
            color="bg-red-500/10 text-red-500"
          />
          <StatCard
            title="Scheduled"
            value={stats.scheduled}
            icon={Calendar}
            color="bg-blue-500/10 text-blue-500"
          />
          <StatCard
            title="Ended"
            value={stats.ended}
            icon={Square}
            color="bg-gray-500/10 text-gray-500"
          />
          <StatCard
            title="Total Participants"
            value={stats.totalParticipants.toLocaleString()}
            icon={Users}
            color="bg-green-500/10 text-green-500"
          />
          <StatCard
            title="Avg. Duration"
            value={`${stats.avgDuration}m`}
            icon={Timer}
            color="bg-purple-500/10 text-purple-500"
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, room code, or host..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Streams Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stream</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('total_participants')}
                >
                  <div className="flex items-center gap-1">
                    Participants
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead>Duration</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    Created
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-12 bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedStreams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Video className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No streams found</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStreams.map((stream) => (
                  <TableRow key={stream.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{stream.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {stream.room_code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {stream.hostName?.charAt(0) || stream.host_email?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate max-w-[120px]">
                          {stream.hostName || stream.host_email || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(stream.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {stream.total_participants} / {stream.max_participants}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDuration(stream.total_duration_seconds)}</TableCell>
                    <TableCell>
                      {format(new Date(stream.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(`/video-streaming/${stream.room_code}`, '_blank')
                            }
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Stream
                          </DropdownMenuItem>
                          {stream.status === 'live' && (
                            <DropdownMenuItem onClick={() => handleEndStream(stream)}>
                              <Square className="w-4 h-4 mr-2" />
                              End Stream
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setStreamToDelete(stream);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredStreams.length)} of{' '}
                {filteredStreams.length} streams
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stream</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this stream? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {streamToDelete && (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Video className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">{streamToDelete.title}</p>
                <p className="text-sm text-muted-foreground">{streamToDelete.room_code}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStream}>
              Delete Stream
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
