// Video Streaming Types

export type RoomStatus = 'waiting' | 'live' | 'ended' | 'scheduled';
export type ParticipantRole = 'host' | 'co-host' | 'viewer';
export type StreamQuality = 'low' | 'medium' | 'high' | 'hd';

export interface StreamingRoom {
  id: string;
  host_id: string;
  title: string;
  description?: string;
  room_code: string;
  status: RoomStatus;
  is_recording: boolean;
  max_participants: number;
  allow_chat: boolean;
  allow_raise_hand: boolean;
  waiting_room_enabled: boolean;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  // Scheduling fields
  scheduled_at?: string;
  scheduled_end_at?: string;
  timezone?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  // Stats
  total_participants?: number;
  peak_participants?: number;
  total_duration_seconds?: number;
  // Joined fields
  host?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
  participant_count?: number;
}

export interface StreamingParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: ParticipantRole;
  is_muted: boolean;
  is_video_on: boolean;
  hand_raised: boolean;
  joined_at: string;
  left_at?: string;
  // Joined fields
  user?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  timestamp: string;
  created_at: string;
  is_pinned?: boolean;
  user?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface AgoraTokenResponse {
  token: string;
  channel: string;
  uid: number;
  appId: string;
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
  scheduled_at?: string;
  scheduled_end_at?: string;
  timezone?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
}

export interface JoinRoomInput {
  room_code: string;
}

export interface StreamSettings {
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenShareEnabled: boolean;
  quality: StreamQuality;
}

export interface RaisedHand {
  participantId: string;
  userId: string;
  userName: string;
  timestamp: string;
}

// Agora specific types
export interface AgoraUser {
  uid: number | string;
  audioTrack?: any;
  videoTrack?: any;
  hasAudio: boolean;
  hasVideo: boolean;
}

export interface StreamStats {
  viewers: number;
  duration: number;
  quality: StreamQuality;
  bitrate?: number;
}
