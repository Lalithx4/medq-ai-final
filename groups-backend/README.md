# BioDocs AI - Groups Backend

WhatsApp-like group management system built with FastAPI.

## Features

- ✅ **Group Management** - Create, update, delete groups
- ✅ **Member Management** - Add, remove, update member roles
- ✅ **Real-time Chat** - WebSocket-based messaging
- ✅ **Media Upload** - Images, documents, audio, video via Wasabi S3
- ✅ **Stream Sharing** - Share video streams to groups
- ✅ **Typing Indicators** - Real-time typing status
- ✅ **Invite Links** - Join groups via invite codes
- ✅ **Read Receipts** - Track message reads

## Quick Start

### 1. Install Dependencies

```bash
cd groups-backend
pip install -r requirements.txt
```

### 2. Environment Variables

The backend uses the same `.env` file as the main project. Required variables:

```env
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Wasabi (for file uploads)
WASABI_ACCESS_KEY_ID=your-access-key
WASABI_SECRET_ACCESS_KEY=your-secret-key
WASABI_BUCKET_NAME=dataextract
WASABI_REGION=ap-northeast-2
WASABI_ENDPOINT=https://s3.ap-northeast-2.wasabisys.com
```

### 3. Run Database Migration

Run `supabase/migrations/GROUPS_QUICK_SETUP.sql` in Supabase SQL Editor.

### 4. Start the Server

```bash
# Development
python main.py

# Or with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Server runs at: http://localhost:8001

## API Endpoints

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | List user's groups |
| POST | `/api/groups` | Create new group |
| GET | `/api/groups/{id}` | Get group details |
| PUT | `/api/groups/{id}` | Update group settings |
| DELETE | `/api/groups/{id}` | Delete group |

### Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups/{id}/members` | List members |
| POST | `/api/groups/{id}/members` | Add members |
| PUT | `/api/groups/{id}/members/{user_id}` | Update member |
| DELETE | `/api/groups/{id}/members/{user_id}` | Remove member |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups/{id}/messages` | Get messages |
| POST | `/api/groups/{id}/messages` | Send message |
| PUT | `/api/groups/{id}/messages/{msg_id}` | Edit message |
| DELETE | `/api/groups/{id}/messages/{msg_id}` | Delete message |

### Media

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups/{id}/media` | Upload file |
| GET | `/api/groups/{id}/media` | List media |
| DELETE | `/api/groups/{id}/media/{media_id}` | Delete file |
| GET | `/api/groups/{id}/media/{media_id}/download` | Get download URL |

### Invites

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups/{id}/invite` | Get invite link |
| POST | `/api/groups/{id}/invite` | Regenerate invite |
| GET | `/api/groups/join/{code}` | Get group info from invite |
| POST | `/api/groups/join/{code}` | Join via invite |

### Stream Sharing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups/{id}/stream-share` | Share stream to group |
| GET | `/api/groups/{id}/stream-shares` | List shared streams |

## WebSocket

Connect to: `ws://localhost:8001/ws/groups/{group_id}?token={jwt_token}`

### Client → Server Messages

```json
// Send message
{"type": "message", "content": "Hello!", "reply_to_id": null}

// Typing indicator
{"type": "typing"}
{"type": "stop_typing"}

// Mark message as read
{"type": "read", "message_id": "uuid"}

// Ping/pong
{"type": "ping"}
```

### Server → Client Messages

```json
// New message
{"type": "new_message", "message": {...}}

// Message edited
{"type": "message_edited", "message_id": "uuid", "content": "..."}

// Message deleted
{"type": "message_deleted", "message_id": "uuid"}

// Typing indicators
{"type": "typing_start", "user_id": "uuid", "user_name": "John"}
{"type": "typing_stop", "user_id": "uuid"}

// Online status
{"type": "user_online", "user_id": "uuid"}
{"type": "user_offline", "user_id": "uuid"}

// Member events
{"type": "member_joined", "user": {...}}
{"type": "member_left", "user_id": "uuid"}
```

## Frontend Integration

Update your Next.js frontend to call this backend:

```typescript
// In your hooks/API calls, change the base URL
const GROUPS_API = process.env.NEXT_PUBLIC_GROUPS_API_URL || 'http://localhost:8001';

// Example: Fetch groups
const response = await fetch(`${GROUPS_API}/api/groups`, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
});
```

Add to your `.env.local`:

```env
NEXT_PUBLIC_GROUPS_API_URL=http://localhost:8001
```

## Project Structure

```
groups-backend/
├── main.py              # FastAPI application entry
├── config.py            # Configuration settings
├── auth.py              # JWT authentication
├── database.py          # Supabase database operations
├── models.py            # Pydantic models
├── routes.py            # Group/member/message routes
├── media_routes.py      # File upload routes
├── stream_routes.py     # Stream sharing routes
├── storage.py           # Wasabi S3 client
├── websocket_manager.py # WebSocket connection manager
├── websocket_routes.py  # WebSocket endpoints
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Environment

For production, set:

```env
DEBUG=false
CORS_ORIGINS=["https://biodocs.ai"]
```
