'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Copy,
  Check,
  Mail,
  Calendar,
  Clock,
  Link2,
  Share2,
  MessageSquare,
  Download,
} from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { StreamingRoom } from '../types';

interface ShareMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stream: StreamingRoom | null;
}

export function ShareMeetingDialog({ open, onOpenChange, stream }: ShareMeetingDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [emails, setEmails] = useState('');

  if (!stream) return null;

  const meetingUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/video-streaming/${stream.room_code}`
    : '';

  const scheduledDate = stream.scheduled_at ? parseISO(stream.scheduled_at) : null;
  const endDate = stream.scheduled_end_at ? parseISO(stream.scheduled_end_at) : null;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  // Generate meeting details text
  const getMeetingDetailsText = () => {
    let details = `📹 ${stream.title}\n\n`;
    
    if (stream.description) {
      details += `${stream.description}\n\n`;
    }

    if (scheduledDate) {
      details += `📅 Date: ${format(scheduledDate, 'EEEE, MMMM d, yyyy')}\n`;
      details += `🕐 Time: ${format(scheduledDate, 'h:mm a')}`;
      if (endDate) {
        details += ` - ${format(endDate, 'h:mm a')}`;
      }
      details += `\n`;
      if (stream.timezone) {
        details += `🌍 Timezone: ${stream.timezone}\n`;
      }
    }

    details += `\n🔗 Join Link: ${meetingUrl}\n`;
    details += `📝 Room Code: ${stream.room_code}\n`;

    return details;
  };

  // Generate calendar event (ICS format)
  const generateICSFile = () => {
    if (!scheduledDate) return;

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BioDocsAI//Video Streaming//EN
BEGIN:VEVENT
UID:${stream.id}@biodocs.ai
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(scheduledDate)}
${endDate ? `DTEND:${formatICSDate(endDate)}` : ''}
SUMMARY:${stream.title}
DESCRIPTION:${stream.description || 'Video Stream'}\\n\\nJoin: ${meetingUrl}
URL:${meetingUrl}
LOCATION:${meetingUrl}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${stream.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Calendar event downloaded!');
  };

  // Open email client with pre-filled content
  const sendEmailInvite = () => {
    const subject = encodeURIComponent(`Invitation: ${stream.title}`);
    const body = encodeURIComponent(getMeetingDetailsText());
    const emailList = emails.split(',').map(e => e.trim()).filter(Boolean).join(',');
    
    window.open(`mailto:${emailList}?subject=${subject}&body=${body}`, '_blank');
  };

  // Share via Web Share API
  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: stream.title,
          text: getMeetingDetailsText(),
          url: meetingUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      copyToClipboard(getMeetingDetailsText(), 'details');
    }
  };

  // Open WhatsApp share
  const shareWhatsApp = () => {
    const text = encodeURIComponent(getMeetingDetailsText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Meeting
          </DialogTitle>
          <DialogDescription>
            Share meeting details with participants
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Meeting Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h3 className="font-semibold">{stream.title}</h3>
            {scheduledDate && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(scheduledDate, 'EEE, MMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(scheduledDate, 'h:mm a')}
                  {endDate && ` - ${format(endDate, 'h:mm a')}`}
                </span>
              </div>
            )}
          </div>

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label>Meeting Link</Label>
            <div className="flex gap-2">
              <Input value={meetingUrl} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(meetingUrl, 'link')}
              >
                {copied === 'link' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Room Code */}
          <div className="space-y-2">
            <Label>Room Code</Label>
            <div className="flex gap-2">
              <Input
                value={stream.room_code}
                readOnly
                className="font-mono text-lg tracking-wider"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(stream.room_code, 'code')}
              >
                {copied === 'code' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Quick Share Options */}
          <div className="space-y-3">
            <Label>Quick Share</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={shareNative} className="gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button variant="outline" onClick={shareWhatsApp} className="gap-2">
                <MessageSquare className="w-4 h-4" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(getMeetingDetailsText(), 'details')}
                className="gap-2"
              >
                {copied === 'details' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                Copy Details
              </Button>
              {scheduledDate && (
                <Button variant="outline" onClick={generateICSFile} className="gap-2">
                  <Download className="w-4 h-4" />
                  Add to Calendar
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Email Invite */}
          <div className="space-y-3">
            <Label>Send Email Invite</Label>
            <Textarea
              placeholder="Enter email addresses (comma separated)"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={2}
            />
            <Button
              onClick={sendEmailInvite}
              disabled={!emails.trim()}
              className="w-full gap-2"
            >
              <Mail className="w-4 h-4" />
              Send Email Invite
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
