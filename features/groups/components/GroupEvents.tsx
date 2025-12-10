// Group Events & Scheduling Component
'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  Video,
  MessageSquare,
  Bell,
  Repeat,
  Edit2,
  Trash2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO
} from 'date-fns';

// Types
export interface GroupEvent {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description?: string;
  location?: string;
  location_type?: 'physical' | 'virtual' | 'hybrid';
  meeting_link?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  recurrence?: RecurrenceRule;
  reminder_minutes?: number;
  color?: string;
  created_at: string;
  updated_at: string;
  
  // Computed
  rsvps?: EventRSVP[];
  rsvp_counts?: {
    yes: number;
    no: number;
    maybe: number;
  };
  user_rsvp?: 'yes' | 'no' | 'maybe';
  creator?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  end_date?: string;
  count?: number;
  days_of_week?: number[];
}

export interface EventRSVP {
  id: string;
  event_id: string;
  user_id: string;
  status: 'yes' | 'no' | 'maybe';
  created_at: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  location_type?: 'physical' | 'virtual' | 'hybrid';
  meeting_link?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  recurrence?: RecurrenceRule;
  reminder_minutes?: number;
  color?: string;
}

// Event colors
const EVENT_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' }
];

// Create Event Modal
interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (event: CreateEventInput) => Promise<void>;
  isCreating?: boolean;
  initialDate?: Date;
}

export function CreateEventModal({
  open,
  onOpenChange,
  onCreate,
  isCreating = false,
  initialDate = new Date()
}: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationType, setLocationType] = useState<'physical' | 'virtual' | 'hybrid'>('virtual');
  const [meetingLink, setMeetingLink] = useState('');
  const [startDate, setStartDate] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState('11:00');
  const [allDay, setAllDay] = useState(false);
  const [hasRecurrence, setHasRecurrence] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [reminder, setReminder] = useState('15');
  const [color, setColor] = useState('#3B82F6');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setLocationType('virtual');
    setMeetingLink('');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setStartTime('10:00');
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setEndTime('11:00');
    setAllDay(false);
    setHasRecurrence(false);
    setRecurrenceFreq('weekly');
    setReminder('15');
    setColor('#3B82F6');
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    const startDateTime = allDay 
      ? `${startDate}T00:00:00` 
      : `${startDate}T${startTime}:00`;
    const endDateTime = allDay
      ? `${endDate}T23:59:59`
      : `${endDate}T${endTime}:00`;

    const eventInput: CreateEventInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      location_type: locationType,
      meeting_link: meetingLink.trim() || undefined,
      start_time: startDateTime,
      end_time: endDateTime,
      all_day: allDay,
      reminder_minutes: parseInt(reminder),
      color,
      ...(hasRecurrence ? {
        recurrence: {
          frequency: recurrenceFreq,
          interval: 1
        }
      } : {})
    };

    if (onCreate) {
      await onCreate(eventInput);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Create Event
          </DialogTitle>
          <DialogDescription>
            Schedule a group event or meeting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              placeholder="Enter event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {!allDay && (
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
            {!allDay && (
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="allDay">All day event</Label>
            <Switch
              id="allDay"
              checked={allDay}
              onCheckedChange={setAllDay}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location Type</Label>
            <Select value={locationType} onValueChange={(v: any) => setLocationType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virtual">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Virtual
                  </div>
                </SelectItem>
                <SelectItem value="physical">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Physical
                  </div>
                </SelectItem>
                <SelectItem value="hybrid">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Hybrid
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {locationType !== 'virtual' && (
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Enter location address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          )}

          {locationType !== 'physical' && (
            <div className="space-y-2">
              <Label>Meeting Link</Label>
              <Input
                placeholder="https://meet.example.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Add event details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Settings */}
          <div className="space-y-4 pt-4 border-t">
            {/* Recurrence */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-muted-foreground" />
                <Label>Recurring Event</Label>
              </div>
              <Switch
                checked={hasRecurrence}
                onCheckedChange={setHasRecurrence}
              />
            </div>

            {hasRecurrence && (
              <Select value={recurrenceFreq} onValueChange={(v: any) => setRecurrenceFreq(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Reminder */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <Label>Reminder</Label>
              </div>
              <Select value={reminder} onValueChange={setReminder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No reminder</SelectItem>
                  <SelectItem value="5">5 minutes before</SelectItem>
                  <SelectItem value="15">15 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="1440">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Event Color</Label>
              <div className="flex gap-2 flex-wrap">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform",
                      color === c.value && "ring-2 ring-offset-2 ring-primary scale-110"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Event Card Component
interface EventCardProps {
  event: GroupEvent;
  currentUserId: string;
  onRSVP: (eventId: string, status: 'yes' | 'no' | 'maybe') => Promise<void>;
  onEdit?: (event: GroupEvent) => void;
  onDelete?: (eventId: string) => void;
  isAdmin?: boolean;
  className?: string;
}

export function EventCard({
  event,
  currentUserId,
  onRSVP,
  onEdit,
  onDelete,
  isAdmin = false,
  className
}: EventCardProps) {
  const [isRSVPing, setIsRSVPing] = useState(false);
  const isCreator = event.created_by === currentUserId;
  const canManage = isAdmin || isCreator;

  const startDate = parseISO(event.start_time);
  const endDate = parseISO(event.end_time);
  const isPast = endDate < new Date();

  const handleRSVP = async (status: 'yes' | 'no' | 'maybe') => {
    setIsRSVPing(true);
    await onRSVP(event.id, status);
    setIsRSVPing(false);
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card overflow-hidden",
        isPast && "opacity-60",
        className
      )}
      style={{ borderLeftColor: event.color || '#3B82F6', borderLeftWidth: 4 }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{event.title}</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {event.all_day
                  ? format(startDate, 'MMM d, yyyy')
                  : format(startDate, 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </div>
          
          {canManage && (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onEdit?.(event)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete?.(event.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Location */}
        {(event.location || event.meeting_link) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            {event.location_type === 'virtual' ? (
              <Video className="w-3.5 h-3.5" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            {event.meeting_link ? (
              <a
                href={event.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate"
              >
                Join Meeting
              </a>
            ) : (
              <span className="truncate">{event.location}</span>
            )}
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {event.description}
          </p>
        )}

        {/* RSVP Counts */}
        {event.rsvp_counts && (
          <div className="flex items-center gap-4 mb-3 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <Check className="w-3.5 h-3.5" />
              {event.rsvp_counts.yes} going
            </span>
            <span className="flex items-center gap-1 text-yellow-600">
              <Clock className="w-3.5 h-3.5" />
              {event.rsvp_counts.maybe} maybe
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <X className="w-3.5 h-3.5" />
              {event.rsvp_counts.no} not going
            </span>
          </div>
        )}

        {/* RSVP Buttons */}
        {!isPast && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={event.user_rsvp === 'yes' ? 'default' : 'outline'}
              onClick={() => handleRSVP('yes')}
              disabled={isRSVPing}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-1" />
              Going
            </Button>
            <Button
              size="sm"
              variant={event.user_rsvp === 'maybe' ? 'default' : 'outline'}
              onClick={() => handleRSVP('maybe')}
              disabled={isRSVPing}
              className="flex-1"
            >
              <Clock className="w-4 h-4 mr-1" />
              Maybe
            </Button>
            <Button
              size="sm"
              variant={event.user_rsvp === 'no' ? 'default' : 'outline'}
              onClick={() => handleRSVP('no')}
              disabled={isRSVPing}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-1" />
              No
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Calendar View
interface CalendarViewProps {
  events: GroupEvent[];
  onDateSelect: (date: Date) => void;
  onEventClick: (event: GroupEvent) => void;
  className?: string;
}

export function CalendarView({
  events,
  onDateSelect,
  onEventClick,
  className
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = parseISO(event.start_time);
      return isSameDay(eventStart, day);
    });
  };

  return (
    <div className={cn("bg-card rounded-lg border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className="p-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <button
              key={index}
              onClick={() => onDateSelect(day)}
              className={cn(
                "min-h-[80px] p-1 border-b border-r text-left transition-colors",
                "hover:bg-muted/50",
                !isCurrentMonth && "text-muted-foreground bg-muted/20"
              )}
            >
              <div className={cn(
                "text-sm mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                isCurrentDay && "bg-primary text-primary-foreground"
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: event.color || '#3B82F6', color: 'white' }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Upcoming Events List
interface UpcomingEventsProps {
  events: GroupEvent[];
  currentUserId: string;
  onRSVP: (eventId: string, status: 'yes' | 'no' | 'maybe') => Promise<void>;
  onEdit?: (event: GroupEvent) => void;
  onDelete?: (eventId: string) => void;
  isAdmin?: boolean;
  className?: string;
}

export function UpcomingEvents({
  events,
  currentUserId,
  onRSVP,
  onEdit,
  onDelete,
  isAdmin = false,
  className
}: UpcomingEventsProps) {
  const upcomingEvents = events
    .filter(e => parseISO(e.end_time) >= new Date())
    .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())
    .slice(0, 5);

  if (upcomingEvents.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {upcomingEvents.map(event => (
        <EventCard
          key={event.id}
          event={event}
          currentUserId={currentUserId}
          onRSVP={onRSVP}
          onEdit={onEdit}
          onDelete={onDelete}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
