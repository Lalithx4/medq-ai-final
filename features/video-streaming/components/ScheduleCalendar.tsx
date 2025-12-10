'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Video,
  Calendar as CalendarIcon,
  List,
  Share2,
  Play,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { StreamingRoom } from '../types';

interface ScheduleCalendarProps {
  streams: StreamingRoom[];
  onStreamClick?: (stream: StreamingRoom) => void;
  onShareClick?: (stream: StreamingRoom) => void;
  onRescheduleClick?: (stream: StreamingRoom) => void;
}

export function ScheduleCalendar({ streams, onStreamClick, onShareClick, onRescheduleClick }: ScheduleCalendarProps) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Filter scheduled streams
  const scheduledStreams = useMemo(() => {
    return streams.filter(s => s.scheduled_at && (s.status === 'scheduled' || s.status === 'waiting'));
  }, [streams]);

  // Get streams for a specific date
  const getStreamsForDate = (date: Date) => {
    return scheduledStreams.filter(stream => {
      if (!stream.scheduled_at) return false;
      return isSameDay(parseISO(stream.scheduled_at), date);
    });
  };

  // Get streams for selected date
  const selectedDateStreams = selectedDate ? getStreamsForDate(selectedDate) : [];

  // Get upcoming streams (next 7 days)
  const upcomingStreams = useMemo(() => {
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    return scheduledStreams
      .filter(s => {
        if (!s.scheduled_at) return false;
        const scheduledDate = parseISO(s.scheduled_at);
        return scheduledDate >= now && scheduledDate <= weekFromNow;
      })
      .sort((a, b) => {
        const dateA = a.scheduled_at ? parseISO(a.scheduled_at).getTime() : 0;
        const dateB = b.scheduled_at ? parseISO(b.scheduled_at).getTime() : 0;
        return dateA - dateB;
      });
  }, [scheduledStreams]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const handleStreamClick = (stream: StreamingRoom) => {
    if (onStreamClick) {
      onStreamClick(stream);
    } else {
      router.push(`/video-streaming/${stream.room_code}`);
    }
  };

  const canStartStream = (stream: StreamingRoom) => {
    if (!stream.scheduled_at) return true;
    const scheduledTime = parseISO(stream.scheduled_at);
    const now = new Date();
    // Allow starting 15 minutes before scheduled time
    const startWindow = addDays(scheduledTime, -15 / (24 * 60)); // 15 minutes before
    return now >= startWindow;
  };

  const StreamCard = ({ stream }: { stream: StreamingRoom }) => {
    const scheduledTime = stream.scheduled_at ? parseISO(stream.scheduled_at) : null;
    const canStart = canStartStream(stream);
    const isLive = stream.status === 'live';

    return (
      <div
        className={cn(
          'p-3 rounded-lg border transition-all',
          isLive ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-border bg-card'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{stream.title}</h4>
            {scheduledTime && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(scheduledTime, 'h:mm a')}
                {stream.scheduled_end_at && (
                  <> - {format(parseISO(stream.scheduled_end_at), 'h:mm a')}</>
                )}
              </p>
            )}
          </div>
          {isLive ? (
            <Badge className="bg-red-500 text-white shrink-0">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              Live
            </Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">
              <Clock className="w-3 h-3 mr-1" />
              Scheduled
            </Badge>
          )}
        </div>
        {stream.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {stream.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {stream.participant_count || 0} / {stream.max_participants}
          </span>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => onShareClick?.(stream)}
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>
          {!isLive && onRescheduleClick && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => onRescheduleClick(stream)}
            >
              <CalendarClock className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1 gap-1.5"
            disabled={!canStart && !isLive}
            onClick={() => handleStreamClick(stream)}
          >
            <Play className="w-3.5 h-3.5" />
            {isLive ? 'Join' : canStart ? 'Start' : 'Not Yet'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list')}>
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === 'calendar' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar Grid */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const dayStreams = getStreamsForDate(day);
                  const hasStreams = dayStreams.length > 0;
                  const hasLive = dayStreams.some(s => s.status === 'live');
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isPastDay = isPast(day) && !isToday(day);

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'aspect-square p-1 rounded-lg text-sm relative transition-all',
                        'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary',
                        !isSameMonth(day, currentMonth) && 'text-muted-foreground/50',
                        isToday(day) && 'bg-primary/10 font-bold',
                        isSelected && 'ring-2 ring-primary bg-primary/5',
                        isPastDay && 'text-muted-foreground/50',
                        hasStreams && !isSelected && 'bg-blue-50 dark:bg-blue-950/30',
                        hasLive && !isSelected && 'bg-red-50 dark:bg-red-950/30'
                      )}
                    >
                      <span className="block">{format(day, 'd')}</span>
                      {hasStreams && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
                          <span className={cn(
                            'inline-flex items-center justify-center min-w-[18px] h-[14px] px-1 rounded-full text-[9px] font-medium',
                            hasLive 
                              ? 'bg-red-500 text-white' 
                              : 'bg-primary text-primary-foreground'
                          )}>
                            {dayStreams.length}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Streams */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedDate
                  ? format(selectedDate, 'EEEE, MMMM d')
                  : 'Select a date'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedDate ? (
                selectedDateStreams.length > 0 ? (
                  selectedDateStreams.map((stream) => (
                    <StreamCard key={stream.id} stream={stream} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No streams scheduled</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click a date to view streams</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Streams</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingStreams.length > 0 ? (
              <div className="space-y-3">
                {upcomingStreams.map((stream) => (
                  <div key={stream.id} className="flex items-start gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-xs text-muted-foreground uppercase">
                        {stream.scheduled_at && format(parseISO(stream.scheduled_at), 'EEE')}
                      </p>
                      <p className="text-2xl font-bold">
                        {stream.scheduled_at && format(parseISO(stream.scheduled_at), 'd')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stream.scheduled_at && format(parseISO(stream.scheduled_at), 'MMM')}
                      </p>
                    </div>
                    <div className="flex-1">
                      <StreamCard stream={stream} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming streams scheduled</p>
                <p className="text-sm mt-1">Create a new stream to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
