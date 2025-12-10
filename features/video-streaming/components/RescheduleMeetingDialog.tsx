'use client';

import { useState } from 'react';
import { format, parseISO, addHours } from 'date-fns';
import {
  Calendar,
  Clock,
  Loader2,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StreamingRoom } from '../types';

interface RescheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stream: StreamingRoom | null;
  onRescheduleSuccess?: (updatedStream: StreamingRoom) => void;
}

const TIMEZONES = [
  { value: 'Asia/Calcutta', label: 'India (IST)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
];

const DURATIONS = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' },
];

export function RescheduleMeetingDialog({ 
  open, 
  onOpenChange, 
  stream,
  onRescheduleSuccess 
}: RescheduleMeetingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with current stream values
  const currentScheduledAt = stream?.scheduled_at ? parseISO(stream.scheduled_at) : null;
  const currentEndAt = stream?.scheduled_end_at ? parseISO(stream.scheduled_end_at) : null;
  
  // Calculate current duration in minutes
  const currentDuration = currentScheduledAt && currentEndAt 
    ? Math.round((currentEndAt.getTime() - currentScheduledAt.getTime()) / (1000 * 60))
    : 60;

  const [formData, setFormData] = useState({
    date: currentScheduledAt ? format(currentScheduledAt, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    time: currentScheduledAt ? format(currentScheduledAt, 'HH:mm') : '10:00',
    duration: String(currentDuration),
    timezone: stream?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Reset form when stream changes
  useState(() => {
    if (stream?.scheduled_at) {
      const scheduledAt = parseISO(stream.scheduled_at);
      const endAt = stream.scheduled_end_at ? parseISO(stream.scheduled_end_at) : null;
      const duration = endAt 
        ? Math.round((endAt.getTime() - scheduledAt.getTime()) / (1000 * 60))
        : 60;
      
      setFormData({
        date: format(scheduledAt, 'yyyy-MM-dd'),
        time: format(scheduledAt, 'HH:mm'),
        duration: String(duration),
        timezone: stream.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  });

  if (!stream) return null;

  const handleReschedule = async () => {
    if (!formData.date || !formData.time) {
      toast.error('Please select date and time');
      return;
    }

    // Validate that the new time is in the future
    const scheduledAt = new Date(`${formData.date}T${formData.time}`);
    if (scheduledAt <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    setIsSubmitting(true);

    try {
      const durationMinutes = parseInt(formData.duration);
      const scheduledEndAt = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);

      const response = await fetch(`/api/video-streaming/${stream.room_code}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_at: scheduledAt.toISOString(),
          scheduled_end_at: scheduledEndAt.toISOString(),
          timezone: formData.timezone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reschedule meeting');
      }

      toast.success('Meeting rescheduled successfully!');
      
      if (onRescheduleSuccess) {
        onRescheduleSuccess(data.room);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Reschedule error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reschedule meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date (today)
  const minDate = format(new Date(), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Reschedule Meeting
          </DialogTitle>
          <DialogDescription>
            Change the date and time for "{stream.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Schedule Info */}
          {currentScheduledAt && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground mb-1">Currently scheduled for:</p>
              <p className="font-medium">
                {format(currentScheduledAt, 'EEEE, MMMM d, yyyy')} at {format(currentScheduledAt, 'h:mm a')}
              </p>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              New Date
            </Label>
            <Input
              id="date"
              type="date"
              min={minDate}
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              New Time
            </Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select
              value={formData.duration}
              onValueChange={(value) => setFormData({ ...formData, duration: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData({ ...formData, timezone: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rescheduling...
              </>
            ) : (
              <>
                <CalendarClock className="w-4 h-4" />
                Reschedule
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
