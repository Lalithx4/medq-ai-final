// Groups Feature Types
// WhatsApp-like Group Management System

// =====================================================
// GROUP TYPES
// =====================================================

export type GroupType = 'public' | 'private';
export type MemberRole = 'owner' | 'admin' | 'member';
export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'video' | 'stream_share' | 'system';
export type MediaFileType = 'image' | 'document' | 'audio' | 'video';

// =====================================================
// GROUP
// =====================================================

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
  group_type: GroupType;
  max_members: number;
  only_admins_can_message: boolean;
  only_admins_can_add_members: boolean;
  mute_notifications: boolean;
  invite_code?: string;
  invite_link_enabled: boolean;
  created_at: string;
  updated_at: string;
  
  // Computed/Joined fields
  member_count?: number;
  last_message?: GroupMessage;
  unread_count?: number;
  members?: GroupMember[];
  creator?: UserProfile;
}

export interface GroupSummary {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  group_type: GroupType;
  member_count: number;
  last_message?: {
    id: string;
    content: string;
    message_type: MessageType;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
}

// =====================================================
// GROUP MEMBER
// =====================================================

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: MemberRole;
  is_muted: boolean;
  notifications_enabled: boolean;
  added_by?: string;
  last_read_at: string;
  joined_at: string;
  
  // Joined fields
  user?: UserProfile;
  added_by_user?: UserProfile;
}

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  name?: string;
  avatar_url?: string;
  image?: string;
}

// =====================================================
// GROUP MESSAGE
// =====================================================

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content?: string;
  message_type: MessageType;
  reply_to_id?: string;
  metadata?: MessageMetadata;
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_for_everyone: boolean;
  created_at: string;
  
  // Joined fields
  sender?: UserProfile;
  reply_to?: GroupMessage;
  media?: GroupMedia[];
  stream_share?: GroupStreamShare;
}

export interface MessageMetadata {
  // For stream shares
  stream_room_id?: string;
  stream_title?: string;
  room_code?: string;
  
  // For files
  file_name?: string;
  file_size?: number;
  file_type?: string;
  
  // For images
  width?: number;
  height?: number;
  
  // For polls
  is_poll?: boolean;
  poll_id?: string;
  
  // General
  [key: string]: any;
}

// =====================================================
// GROUP MEDIA
// =====================================================

export interface GroupMedia {
  id: string;
  group_id: string;
  message_id?: string;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_key?: string;
  file_type: MediaFileType;
  mime_type?: string;
  file_size?: number;
  width?: number;
  height?: number;
  thumbnail_url?: string;
  page_count?: number;
  created_at: string;
  
  // Alias for compatibility
  media_type?: MediaFileType;
  
  // Joined fields
  uploader?: UserProfile;
}

// =====================================================
// GROUP STREAM SHARE
// =====================================================

export interface GroupStreamShare {
  id: string;
  group_id: string;
  message_id?: string;
  stream_room_id: string;
  shared_by: string;
  stream_title?: string;
  stream_description?: string;
  room_code?: string;
  shared_at: string;
  is_active?: boolean;
  
  // Joined fields
  sharer?: UserProfile;
  stream_room?: StreamingRoomSummary;
  stream?: {
    room_name?: string;
    description?: string;
    participant_count?: number;
    started_at?: string;
  };
}

export interface StreamingRoomSummary {
  id: string;
  title: string;
  description?: string;
  room_code: string;
  status: 'waiting' | 'live' | 'ended';
  participant_count?: number;
  host?: UserProfile;
}

// =====================================================
// READ RECEIPTS
// =====================================================

export interface MessageReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
  user?: UserProfile;
}

// =====================================================
// TYPING INDICATOR
// =====================================================

export interface TypingIndicator {
  id: string;
  group_id: string;
  user_id: string;
  started_at: string;
  full_name?: string;
  user?: UserProfile;
}

// =====================================================
// INPUT TYPES (for API requests)
// =====================================================

export interface CreateGroupInput {
  name: string;
  description?: string;
  avatar_url?: string;
  group_type?: GroupType;
  max_members?: number;
  only_admins_can_message?: boolean;
  only_admins_can_add_members?: boolean;
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  avatar_url?: string;
  only_admins_can_message?: boolean;
  only_admins_can_add_members?: boolean;
  mute_notifications?: boolean;
  invite_link_enabled?: boolean;
}

export interface AddMemberInput {
  user_id: string;
  role?: MemberRole;
}

export interface SendMessageInput {
  content?: string;
  message_type?: MessageType;
  reply_to_id?: string;
  metadata?: MessageMetadata;
}

export interface UploadMediaInput {
  file: File;
  message_type?: MessageType;
}

export interface ShareStreamInput {
  stream_room_id: string;
  message?: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface GroupsResponse {
  success: boolean;
  groups: GroupSummary[];
  total?: number;
  error?: string;
}

export interface GroupResponse {
  success: boolean;
  group: Group;
  error?: string;
}

export interface MembersResponse {
  success: boolean;
  members: GroupMember[];
  total: number;
  error?: string;
}

export interface MessagesResponse {
  success: boolean;
  messages: GroupMessage[];
  hasMore: boolean;
  cursor?: string;
  error?: string;
}

export interface MessageResponse {
  success: boolean;
  message: GroupMessage;
}

export interface MediaResponse {
  success: boolean;
  media: GroupMedia;
  message?: GroupMessage;
}

export interface StreamShareResponse {
  success: boolean;
  share: GroupStreamShare;
  message: GroupMessage;
}

export interface JoinGroupResponse {
  success: boolean;
  group: Group;
  membership: GroupMember;
}

// =====================================================
// REALTIME EVENT TYPES
// =====================================================

export type RealtimeEventType = 
  | 'INSERT' 
  | 'UPDATE' 
  | 'DELETE';

export interface RealtimePayload<T> {
  type: RealtimeEventType;
  table: string;
  schema: string;
  record: T;
  old_record?: T;
}

export interface MessageRealtimePayload extends RealtimePayload<GroupMessage> {
  table: 'group_messages';
}

export interface MemberRealtimePayload extends RealtimePayload<GroupMember> {
  table: 'group_members';
}

export interface TypingRealtimePayload extends RealtimePayload<TypingIndicator> {
  table: 'group_typing_indicators';
}

// =====================================================
// MESSAGE REACTIONS
// =====================================================

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: UserProfile;
}

export interface ReactionCount {
  emoji: string;
  count: number;
  users: { id: string; name: string }[];
  hasReacted: boolean; // Current user has reacted with this emoji
}

// =====================================================
// POLLS
// =====================================================

export interface PollOption {
  id: string;
  text: string;
}

export interface GroupPoll {
  id: string;
  group_id: string;
  message_id?: string;
  created_by: string;
  question: string;
  options: PollOption[];
  is_multiple_choice: boolean;
  is_anonymous: boolean;
  allow_add_options: boolean;
  is_closed: boolean;
  ends_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  total_votes?: number;
  results?: PollResults[];
  user_votes?: string[]; // Option IDs current user voted for
  creator?: UserProfile;
}

export interface PollResults {
  option_id: string;
  vote_count: number;
  percentage: number;
  voters?: { id: string; name: string }[];
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
  user?: UserProfile;
}

export interface CreatePollInput {
  question: string;
  options: string[];
  is_multiple_choice?: boolean;
  is_anonymous?: boolean;
  allow_add_options?: boolean;
  ends_at?: string;
}

// =====================================================
// MENTIONS
// =====================================================

export interface MessageMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  created_at: string;
  mentioned_user?: UserProfile;
}

// =====================================================
// LINK PREVIEWS
// =====================================================

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  site_name?: string;
  favicon_url?: string;
  type: 'website' | 'youtube' | 'doi' | 'twitter' | 'github' | 'paper';
  // YouTube specific
  video_id?: string;
  // DOI/Paper specific
  doi?: string;
  authors?: string[];
  journal?: string;
  year?: number;
  abstract?: string;
  citation?: {
    bibtex?: string;
    apa?: string;
    mla?: string;
  };
}

// =====================================================
// ANNOTATIONS
// =====================================================

export interface GroupAnnotation {
  id: string;
  group_id: string;
  media_id?: string;
  created_by: string;
  content: string;
  annotation_type: 'highlight' | 'comment' | 'note';
  position_data?: {
    page?: number;
    startOffset?: number;
    endOffset?: number;
    selectedText?: string;
    rect?: { x: number; y: number; width: number; height: number };
  };
  color: string;
  parent_id?: string;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  creator?: UserProfile;
  replies?: GroupAnnotation[];
  resolver?: UserProfile;
}

export interface CreateAnnotationInput {
  media_id?: string;
  content: string;
  annotation_type?: 'highlight' | 'comment' | 'note';
  position_data?: GroupAnnotation['position_data'];
  color?: string;
  parent_id?: string;
}

// =====================================================
// EXTENDED GROUP MESSAGE (with new features)
// =====================================================

export interface GroupMessageExtended extends GroupMessage {
  reactions?: ReactionCount[];
  is_pinned?: boolean;
  pinned_at?: string;
  pinned_by?: string;
  link_preview?: LinkPreview;
  mentions?: MessageMention[];
  poll?: GroupPoll;
  read_by_count?: number;
  read_by?: MessageReadReceipt[];
}

// =====================================================
// API RESPONSE TYPES (Enhanced)
// =====================================================

export interface ReactionsResponse {
  success: boolean;
  reactions: ReactionCount[];
  error?: string;
}

export interface PollResponse {
  success: boolean;
  poll: GroupPoll;
  message?: GroupMessage;
  error?: string;
}

export interface PollVoteResponse {
  success: boolean;
  poll: GroupPoll;
  error?: string;
}

export interface AnnotationsResponse {
  success: boolean;
  annotations: GroupAnnotation[];
  error?: string;
}

export interface AnnotationResponse {
  success: boolean;
  annotation: GroupAnnotation;
  error?: string;
}

export interface LinkPreviewResponse {
  success: boolean;
  preview: LinkPreview;
  error?: string;
}

export interface ReadReceiptsResponse {
  success: boolean;
  receipts: MessageReadReceipt[];
  count: number;
  error?: string;
}

export interface PinnedMessagesResponse {
  success: boolean;
  messages: GroupMessageExtended[];
  error?: string;
}

export interface MentionsResponse {
  success: boolean;
  messages: GroupMessageExtended[];
  error?: string;
}
