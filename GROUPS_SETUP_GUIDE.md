# Groups Feature - Setup Guide

This document provides instructions for setting up the WhatsApp-like Groups feature in BioDocs AI.

## Overview

The Groups feature enables:
- **Group Creation & Management**: Create groups, add/remove members, assign admin roles
- **Real-time Group Chat**: Send text, images, files with replies and typing indicators
- **Stream Sharing**: Share video streaming sessions directly to groups
- **Invite Links**: Generate shareable invite links for group joining

## Database Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `edxijcfybryqcffokimr`
3. Navigate to **SQL Editor**
4. Copy the entire contents of `supabase/migrations/20241202_groups_system.sql`
5. Paste and run the SQL in the editor

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Link to your project
supabase link --project-ref edxijcfybryqcffokimr

# Run migrations
supabase db push
```

### Option 3: Direct Connection

Connect to your Supabase database using psql or any PostgreSQL client:

```bash
psql "postgresql://postgres:[YOUR_PASSWORD]@db.edxijcfybryqcffokimr.supabase.co:5432/postgres"

# Then run the migration file
\i supabase/migrations/20241202_groups_system.sql
```

## Verify Setup

After running the migration, verify the tables are created:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('groups', 'group_members', 'group_messages', 'group_media', 'group_stream_shares', 'group_message_reads', 'group_typing_indicators');

-- Should return 7 tables
```

## File Structure

```
features/groups/
├── index.ts                  # Feature barrel export
├── types.ts                  # TypeScript types
├── hooks/
│   ├── index.ts             # Hooks barrel export
│   ├── useGroups.ts         # Group CRUD operations
│   ├── useGroupChat.ts      # Chat messaging with realtime
│   └── useGroupMembers.ts   # Member management
└── components/
    ├── index.ts             # Components barrel export
    ├── CreateGroupModal.tsx # Create new group dialog
    ├── GroupCard.tsx        # Group preview card
    ├── GroupList.tsx        # Groups sidebar list
    ├── GroupMessage.tsx     # Message bubble component
    ├── MessageInput.tsx     # Chat input with file upload
    ├── GroupChat.tsx        # Main chat view
    ├── MembersList.tsx      # Members panel
    ├── AddMembersModal.tsx  # Add members dialog
    ├── GroupHeader.tsx      # Chat header
    ├── GroupInfo.tsx        # Group info sidebar
    ├── StreamShareCard.tsx  # Stream share display
    ├── InviteLinkModal.tsx  # Manage invite links
    └── ShareToGroupModal.tsx # Share stream to groups

src/app/
├── groups/
│   ├── layout.tsx           # Groups layout
│   ├── page.tsx             # Groups dashboard
│   ├── [groupId]/
│   │   └── page.tsx         # Individual group chat
│   └── join/
│       └── [inviteCode]/
│           └── page.tsx     # Join via invite link

src/app/api/groups/
├── route.ts                 # GET list, POST create
├── [groupId]/
│   ├── route.ts            # GET/PUT/DELETE group
│   ├── members/
│   │   └── route.ts        # Member management
│   ├── messages/
│   │   ├── route.ts        # GET/POST messages
│   │   └── [messageId]/
│   │       └── route.ts    # PUT/DELETE message
│   ├── media/
│   │   └── route.ts        # Media upload
│   ├── stream-share/
│   │   └── route.ts        # Share streams
│   ├── invite/
│   │   └── route.ts        # Invite link management
│   └── typing/
│       └── route.ts        # Typing indicators
├── join/
│   └── [inviteCode]/
│       └── route.ts        # Join via invite
└── search-users/
    └── route.ts            # Search users to add
```

## Usage

### Navigate to Groups
```
/groups - Groups dashboard
/groups/[groupId] - Individual group chat
/groups/join/[inviteCode] - Join via invite link
```

### Creating a Group
1. Go to `/groups`
2. Click "New Group" button
3. Enter group name and optional description
4. Group is created and you're redirected to the chat

### Sharing a Stream to Groups
1. Start a video stream at `/video-streaming`
2. Click the Share button in stream controls
3. Select "Share to Group"
4. Choose one or more groups
5. Members will see the stream share in their group chat

### Invite Links
1. Open a group chat
2. Click the menu (...) → "Invite Link"
3. Generate or copy the invite link
4. Share the link with others

## Real-time Features

The groups feature uses Supabase Realtime for:
- Live message updates
- Typing indicators
- Member presence
- New member notifications

Enable realtime in Supabase Dashboard:
1. Go to Database → Replication
2. Enable for tables: `group_messages`, `group_members`, `group_typing_indicators`

## Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://edxijcfybryqcffokimr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For file uploads (optional, uses existing Wasabi config)
WASABI_ACCESS_KEY_ID=your-wasabi-key
WASABI_SECRET_ACCESS_KEY=your-wasabi-secret
WASABI_REGION=ap-northeast-2
WASABI_BUCKET=dataextract
```

## Troubleshooting

### Groups not loading
- Check Supabase connection in browser console
- Verify RLS policies are created
- Ensure user is authenticated

### Messages not appearing in realtime
- Enable realtime for `group_messages` table
- Check browser WebSocket connection
- Verify Supabase anon key has realtime permissions

### File uploads failing
- Check Wasabi credentials
- Verify bucket CORS settings
- Ensure file size is under limit

## API Reference

### Create Group
```typescript
POST /api/groups
Body: { name: string, description?: string }
```

### Send Message
```typescript
POST /api/groups/[groupId]/messages
Body: { content: string, message_type?: string, reply_to_id?: string }
```

### Share Stream
```typescript
POST /api/groups/[groupId]/stream-share
Body: { room_code: string }
```

### Add Members
```typescript
POST /api/groups/[groupId]/members
Body: { user_ids: string[] }
```
