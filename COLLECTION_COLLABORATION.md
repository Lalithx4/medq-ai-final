# Collection Collaboration Feature

This document describes the Google Drive-style collaboration feature for file collections.

## Overview

Users can now share collections with others, similar to Google Drive:
- **Invite by Email**: Add members with specific roles (Viewer/Editor)
- **Share Links**: Generate shareable links with public or login-required access
- **Real-time Presence**: See who's currently viewing a collection
- **Role-based Access**: Owner, Editor, and Viewer permissions

## Database Schema

### New Tables

#### `collection_members`
Stores collection membership and invitations:
- `id`: UUID primary key
- `collection_id`: Reference to file_collections
- `user_id`: Reference to user (null if not yet registered)
- `email`: Invited user's email
- `role`: 'owner', 'editor', or 'viewer'
- `status`: 'pending', 'accepted', or 'rejected'
- `invited_by`: User who sent the invitation
- `invited_at`, `accepted_at`: Timestamps

#### `collection_presence`
Tracks who's currently viewing a collection:
- `id`: UUID primary key
- `collection_id`: Reference to file_collections
- `user_id`: Current user
- `user_email`, `user_name`, `user_avatar`: User display info
- `last_seen`: Timestamp for heartbeat
- `is_active`: Whether user is currently active

### Modified Tables

#### `file_collections` - New Columns
- `is_shared`: Boolean indicating if collection has members
- `share_link`: UUID for shareable link
- `share_link_enabled`: Whether link sharing is active
- `share_link_access`: 'public' (anyone) or 'login' (requires auth)
- `share_link_role`: Default role for link access

## API Endpoints

### Collection Members
- `GET /api/file-manager/collections/members?collectionId=xxx` - List members
- `POST /api/file-manager/collections/members` - Invite member
- `DELETE /api/file-manager/collections/members?memberId=xxx&collectionId=xxx` - Remove member
- `PATCH /api/file-manager/collections/members` - Update member role

### Share Link
- `GET /api/file-manager/collections/share-link?collectionId=xxx` - Get settings
- `POST /api/file-manager/collections/share-link` - Update settings

### Shared Collections
- `GET /api/file-manager/shared` - Get collections shared with me
- `GET /api/file-manager/shared/[shareLink]` - Access via share link

### Presence
- `GET /api/file-manager/collections/presence?collectionId=xxx` - Who's online
- `POST /api/file-manager/collections/presence` - Heartbeat
- `DELETE /api/file-manager/collections/presence` - Leave

## UI Components

### ShareCollectionModal
Full-featured sharing dialog with:
- Email input with role selection (Viewer/Editor)
- Member list with role badges and remove option
- Share link toggle with access settings (Public/Login)
- One-click link copy and regenerate

### CollectionManager Updates
- Share button in dropdown menu
- Shared indicator (Users icon) on collection items
- Role badge for shared collections (Editor/Viewer)
- Public/Login link indicator (Globe/Lock icons)

### SharedWithMe Section
- New sidebar section showing collections shared by others
- Displays owner email and your role
- Leave option in dropdown menu

### CollectionPresence
- Avatars showing online users in collection header
- Heartbeat every 30 seconds
- Auto-cleanup of stale presence records

## Roles & Permissions

| Permission | Owner | Editor | Viewer |
|------------|-------|--------|--------|
| View files | ✅ | ✅ | ✅ |
| Add files | ✅ | ✅ | ❌ |
| Remove files | ✅ | ✅ | ❌ |
| Invite members | ✅ | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Change settings | ✅ | ❌ | ❌ |
| Delete collection | ✅ | ❌ | ❌ |

## Setup Instructions

1. Run the migration in Supabase SQL Editor:
   ```sql
   -- Copy contents of supabase/migrations/20241128_collection_collaboration.sql
   ```

2. Enable Realtime for presence (optional):
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE collection_presence;
   ```

3. The feature is now ready to use!

## Shared Page

A public page at `/shared/[shareLink]` displays:
- Collection name and description
- Owner information
- File grid with view/download options
- Login prompt if access requires authentication
