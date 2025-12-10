// Video Streaming Types

export interface StreamingRoom {
  id: string;
  host_id: string;
  title: string;
  description?: string | null;
  room_code: string;
  status: 'waiting' | 'live' | 'ended' | 'scheduled';
  is_recording: boolean;
  max_participants: number;
  allow_chat: boolean;
  allow_raise_hand: boolean;
  waiting_room_enabled: boolean;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  total_participants: number;
  peak_participants: number;
  total_duration_seconds: number;
  participant_count?: number;
  
  // Scheduling fields
  scheduled_at?: string | null;
  scheduled_end_at?: string | null;
  timezone?: string | null;
  is_recurring?: boolean;
  recurrence_rule?: string | null; // iCal RRULE format
  
  // Host info (joined from users table)
  host?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface StreamingParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'host' | 'co-host' | 'viewer';
  is_muted: boolean;
  is_video_on: boolean;
  hand_raised: boolean;
  is_in_waiting_room: boolean;
  joined_at: string;
  left_at?: string | null;
  
  // User info (joined)
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface StreamChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  is_pinned: boolean;
  created_at: string;
  
  // User info (joined)
  user?: {
    id: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface CreateRoomInput {
  title: string;
  description?: string;
  max_participants?: number;
  allow_chat?: boolean;
  allow_raise_hand?: boolean;
  waiting_room_enabled?: boolean;
  
  // Scheduling
  is_scheduled?: boolean;
  scheduled_at?: string; // ISO date string
  scheduled_end_at?: string;
  timezone?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
}

export interface ScheduleSlot {
  date: Date;
  startTime: string; // HH:mm format
  endTime: string;
  title: string;
  room?: StreamingRoom;
}

export type StreamStatus = 'waiting' | 'live' | 'ended' | 'scheduled';

export interface StreamStats {
  totalStreams: number;
  liveStreams: number;
  scheduledStreams: number;
  totalViewers: number;
  upcomingStreams: StreamingRoom[];
}
