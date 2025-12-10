'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, addHours, setHours, setMinutes } from 'date-fns';
import { CalendarIcon, Clock, Video, Users, MessageSquare, Hand, Loader2, Zap, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CreateRoomInput } from '../types';

interface CreateRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Generate time slots in 15-minute intervals
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Duration options in minutes
const DURATION_OPTIONS = [
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' },
];

export function CreateRoomModal({ open, onOpenChange }: CreateRoomModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [meetingType, setMeetingType] = useState<'instant' | 'scheduled'>('instant');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(100);
  const [allowChat, setAllowChat] = useState(true);
  const [allowRaiseHand, setAllowRaiseHand] = useState(true);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);
  
  // Scheduling state
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [duration, setDuration] = useState('60');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setMaxParticipants(100);
    setAllowChat(true);
    setAllowRaiseHand(true);
    setWaitingRoomEnabled(false);
    setScheduledDate(undefined);
    setScheduledTime('09:00');
    setDuration('60');
    setMeetingType('instant');
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for your stream');
      return;
    }

    if (meetingType === 'scheduled' && !scheduledDate) {
      toast.error('Please select a date for your scheduled stream');
      return;
    }

    setIsLoading(true);

    try {
      // Build scheduled datetime
      let scheduled_at: string | undefined;
      let scheduled_end_at: string | undefined;

      if (meetingType === 'scheduled' && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const startDate = setMinutes(setHours(scheduledDate, hours ?? 9), minutes ?? 0);
        scheduled_at = startDate.toISOString();
        scheduled_end_at = addHours(startDate, parseInt(duration) / 60).toISOString();
      }

      const payload: CreateRoomInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        max_participants: maxParticipants,
        allow_chat: allowChat,
        allow_raise_hand: allowRaiseHand,
        waiting_room_enabled: waitingRoomEnabled,
        is_scheduled: meetingType === 'scheduled',
        scheduled_at,
        scheduled_end_at,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const response = await fetch('/api/video-streaming/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create stream');
      }

      toast.success(
        meetingType === 'scheduled' 
          ? 'Stream scheduled successfully!' 
          : 'Stream created! Redirecting...'
      );

      resetForm();
      onOpenChange(false);

      // For instant meetings, redirect immediately
      // For scheduled, stay on dashboard
      if (meetingType === 'instant') {
        router.push(`/video-streaming/${data.roomCode}`);
      } else {
        // Refresh the page to show the new scheduled stream
        router.refresh();
      }
    } catch (error: any) {
      console.error('Create stream error:', error);
      toast.error(error.message || 'Failed to create stream');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Create New Stream
          </DialogTitle>
          <DialogDescription>
            Start an instant stream or schedule one for later
          </DialogDescription>
        </DialogHeader>

        <Tabs value={meetingType} onValueChange={(v) => setMeetingType(v as 'instant' | 'scheduled')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instant" className="gap-2">
              <Zap className="w-4 h-4" />
              Instant
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-2">
              <CalendarPlus className="w-4 h-4" />
              Schedule
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Stream Title *</Label>
              <Input
                id="title"
                placeholder="e.g., CME: Advanced Cardiac Care"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this stream is about..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Scheduling Options */}
            <TabsContent value="scheduled" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !scheduledDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Picker */}
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Select value={scheduledTime} onValueChange={setScheduledTime}>
                    <SelectTrigger>
                      <Clock className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scheduled Summary */}
              {scheduledDate && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary">
                    Scheduled for {format(scheduledDate, 'EEEE, MMMM d, yyyy')} at {scheduledTime}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Duration: {DURATION_OPTIONS.find(d => d.value === duration)?.label}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Stream Settings */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium">Stream Settings</h4>
              
              <div className="space-y-3">
                {/* Max Participants */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="max-participants" className="font-normal">
                      Max Participants
                    </Label>
                  </div>
                  <Input
                    id="max-participants"
                    type="number"
                    min={1}
                    max={1000}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 100)}
                    className="w-24 text-right"
                  />
                </div>

                {/* Allow Chat */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="allow-chat" className="font-normal">
                      Enable Chat
                    </Label>
                  </div>
                  <Switch
                    id="allow-chat"
                    checked={allowChat}
                    onCheckedChange={setAllowChat}
                  />
                </div>

                {/* Allow Raise Hand */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hand className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="allow-raise-hand" className="font-normal">
                      Allow Raise Hand
                    </Label>
                  </div>
                  <Switch
                    id="allow-raise-hand"
                    checked={allowRaiseHand}
                    onCheckedChange={setAllowRaiseHand}
                  />
                </div>

                {/* Waiting Room */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="waiting-room" className="font-normal">
                      Waiting Room
                    </Label>
                  </div>
                  <Switch
                    id="waiting-room"
                    checked={waitingRoomEnabled}
                    onCheckedChange={setWaitingRoomEnabled}
                  />
                </div>
              </div>
            </div>
          </div>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : meetingType === 'scheduled' ? (
              <>
                <CalendarPlus className="w-4 h-4 mr-2" />
                Schedule Stream
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Start Stream
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
