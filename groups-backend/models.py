# Pydantic Models for Groups
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class GroupType(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class MemberRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"


class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    AUDIO = "audio"
    VIDEO = "video"
    STREAM_SHARE = "stream_share"
    SYSTEM = "system"


class MediaFileType(str, Enum):
    IMAGE = "image"
    DOCUMENT = "document"
    AUDIO = "audio"
    VIDEO = "video"


# =====================================================
# USER PROFILE
# =====================================================
class UserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


# =====================================================
# GROUP MODELS
# =====================================================
class GroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    group_type: GroupType = GroupType.PRIVATE
    max_members: int = 256
    only_admins_can_message: bool = False
    only_admins_can_add_members: bool = False


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    group_type: Optional[GroupType] = None
    only_admins_can_message: Optional[bool] = None
    only_admins_can_add_members: Optional[bool] = None
    mute_notifications: Optional[bool] = None
    invite_link_enabled: Optional[bool] = None


class Group(GroupBase):
    id: str
    created_by: str
    invite_code: Optional[str] = None
    invite_link_enabled: bool = True
    mute_notifications: bool = False
    created_at: datetime
    updated_at: datetime
    member_count: Optional[int] = None
    unread_count: Optional[int] = None
    creator: Optional[UserProfile] = None

    class Config:
        from_attributes = True


class GroupSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    group_type: GroupType
    member_count: int = 0
    unread_count: int = 0
    last_message: Optional[Dict[str, Any]] = None


# =====================================================
# GROUP MEMBER MODELS
# =====================================================
class MemberBase(BaseModel):
    user_id: str
    role: MemberRole = MemberRole.MEMBER


class MemberAdd(BaseModel):
    user_id: str
    role: MemberRole = MemberRole.MEMBER


class MemberUpdate(BaseModel):
    role: Optional[MemberRole] = None
    is_muted: Optional[bool] = None
    notifications_enabled: Optional[bool] = None


class GroupMember(BaseModel):
    id: str
    group_id: str
    user_id: str
    role: MemberRole
    is_muted: bool = False
    notifications_enabled: bool = True
    added_by: Optional[str] = None
    last_read_at: datetime
    joined_at: datetime
    user: Optional[UserProfile] = None

    class Config:
        from_attributes = True


# =====================================================
# MESSAGE MODELS
# =====================================================
class MessageCreate(BaseModel):
    content: Optional[str] = None
    message_type: MessageType = MessageType.TEXT
    reply_to_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class MessageUpdate(BaseModel):
    content: str


class GroupMessage(BaseModel):
    id: str
    group_id: str
    sender_id: str
    content: Optional[str] = None
    message_type: MessageType
    reply_to_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    is_deleted: bool = False
    created_at: datetime
    sender: Optional[UserProfile] = None

    class Config:
        from_attributes = True


# =====================================================
# MEDIA MODELS
# =====================================================
class GroupMedia(BaseModel):
    id: str
    group_id: str
    message_id: Optional[str] = None
    uploaded_by: str
    file_name: str
    file_url: str
    file_key: Optional[str] = None
    file_type: str
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    thumbnail_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# =====================================================
# STREAM SHARE MODELS
# =====================================================
class StreamShareCreate(BaseModel):
    stream_room_id: str
    room_code: str
    stream_title: Optional[str] = None
    stream_description: Optional[str] = None


class GroupStreamShare(BaseModel):
    id: str
    group_id: str
    message_id: Optional[str] = None
    stream_room_id: Optional[str] = None
    shared_by: str
    stream_title: Optional[str] = None
    stream_description: Optional[str] = None
    room_code: Optional[str] = None
    shared_at: datetime
    sharer: Optional[UserProfile] = None

    class Config:
        from_attributes = True


# =====================================================
# TYPING INDICATOR
# =====================================================
class TypingIndicator(BaseModel):
    group_id: str
    user_id: str
    full_name: Optional[str] = None
    started_at: datetime


# =====================================================
# RESPONSE MODELS
# =====================================================
class GroupResponse(BaseModel):
    success: bool
    group: Optional[Group] = None
    error: Optional[str] = None


class GroupsResponse(BaseModel):
    success: bool
    groups: List[GroupSummary] = []
    total: int = 0
    error: Optional[str] = None


class MembersResponse(BaseModel):
    success: bool
    members: List[GroupMember] = []
    error: Optional[str] = None


class MessagesResponse(BaseModel):
    success: bool
    messages: List[GroupMessage] = []
    has_more: bool = False
    error: Optional[str] = None


class MessageResponse(BaseModel):
    success: bool
    message: Optional[GroupMessage] = None
    error: Optional[str] = None


class InviteResponse(BaseModel):
    success: bool
    invite_link: Optional[str] = None
    invite_code: Optional[str] = None
    error: Optional[str] = None
