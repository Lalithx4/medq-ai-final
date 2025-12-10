# WebSocket Manager for Real-time Features
from fastapi import WebSocket
from typing import Dict, Set, List, Optional
import json
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time chat"""
    
    def __init__(self):
        # group_id -> set of WebSocket connections
        self.group_connections: Dict[str, Set[WebSocket]] = {}
        # websocket -> (user_id, group_id)
        self.connection_info: Dict[WebSocket, tuple] = {}
        # group_id -> set of user_ids currently typing
        self.typing_users: Dict[str, Set[str]] = {}
        # Lock for thread safety
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, group_id: str, user_id: str):
        """Register a WebSocket connection (should already be accepted)"""
        async with self._lock:
            if group_id not in self.group_connections:
                self.group_connections[group_id] = set()
            
            self.group_connections[group_id].add(websocket)
            self.connection_info[websocket] = (user_id, group_id)
        
        logger.info(f"User {user_id} connected to group {group_id}")
        
        # Notify others that user came online
        await self.broadcast_to_group(group_id, {
            "type": "user_online",
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }, exclude=websocket)
    
    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        async with self._lock:
            info = self.connection_info.pop(websocket, None)
            
            if info:
                user_id, group_id = info
                
                if group_id in self.group_connections:
                    self.group_connections[group_id].discard(websocket)
                    
                    if not self.group_connections[group_id]:
                        del self.group_connections[group_id]
                
                # Clear typing status
                if group_id in self.typing_users:
                    self.typing_users[group_id].discard(user_id)
                
                logger.info(f"User {user_id} disconnected from group {group_id}")
                
                # Notify others
                await self.broadcast_to_group(group_id, {
                    "type": "user_offline",
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat()
                })
    
    async def broadcast_to_group(
        self, 
        group_id: str, 
        message: dict, 
        exclude: Optional[WebSocket] = None
    ):
        """Send message to all connections in a group"""
        if group_id not in self.group_connections:
            return
        
        dead_connections = []
        message_json = json.dumps(message)
        
        for connection in self.group_connections[group_id]:
            if connection == exclude:
                continue
            
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.error(f"Broadcast error: {e}")
                dead_connections.append(connection)
        
        # Clean up dead connections
        for conn in dead_connections:
            await self.disconnect(conn)
    
    async def send_to_user(self, group_id: str, user_id: str, message: dict):
        """Send message to specific user in group"""
        if group_id not in self.group_connections:
            return
        
        message_json = json.dumps(message)
        
        for connection in self.group_connections[group_id]:
            info = self.connection_info.get(connection)
            if info and info[0] == user_id:
                try:
                    await connection.send_text(message_json)
                except Exception as e:
                    logger.error(f"Send to user error: {e}")
    
    async def broadcast_message(self, group_id: str, message_data: dict):
        """Broadcast a new message to group"""
        await self.broadcast_to_group(group_id, {
            "type": "new_message",
            "message": message_data,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def broadcast_message_edit(self, group_id: str, message_id: str, content: str):
        """Broadcast message edit"""
        await self.broadcast_to_group(group_id, {
            "type": "message_edited",
            "message_id": message_id,
            "content": content,
            "edited_at": datetime.utcnow().isoformat()
        })
    
    async def broadcast_message_delete(self, group_id: str, message_id: str):
        """Broadcast message deletion"""
        await self.broadcast_to_group(group_id, {
            "type": "message_deleted",
            "message_id": message_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def set_typing(self, group_id: str, user_id: str, user_name: str):
        """Set user as typing and broadcast"""
        async with self._lock:
            if group_id not in self.typing_users:
                self.typing_users[group_id] = set()
            self.typing_users[group_id].add(user_id)
        
        await self.broadcast_to_group(group_id, {
            "type": "typing_start",
            "user_id": user_id,
            "user_name": user_name,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def clear_typing(self, group_id: str, user_id: str):
        """Clear typing status"""
        async with self._lock:
            if group_id in self.typing_users:
                self.typing_users[group_id].discard(user_id)
        
        await self.broadcast_to_group(group_id, {
            "type": "typing_stop",
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def broadcast_member_joined(self, group_id: str, user_data: dict):
        """Broadcast new member joined"""
        await self.broadcast_to_group(group_id, {
            "type": "member_joined",
            "user": user_data,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def broadcast_member_left(self, group_id: str, user_id: str):
        """Broadcast member left/removed"""
        await self.broadcast_to_group(group_id, {
            "type": "member_left",
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    # =====================================================
    # ENHANCED FEATURES - Real-time broadcasts
    # =====================================================
    
    async def broadcast_reaction(
        self, 
        group_id: str, 
        message_id: str, 
        emoji: str, 
        user_id: str, 
        action: str
    ):
        """Broadcast reaction added/removed"""
        await self.broadcast_to_group(group_id, {
            "type": "reaction_update",
            "message_id": message_id,
            "emoji": emoji,
            "user_id": user_id,
            "action": action,  # 'added' or 'removed'
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def broadcast_pin(
        self, 
        group_id: str, 
        message_id: str, 
        is_pinned: bool, 
        user_id: str
    ):
        """Broadcast message pin/unpin"""
        await self.broadcast_to_group(group_id, {
            "type": "message_pinned" if is_pinned else "message_unpinned",
            "message_id": message_id,
            "pinned_by": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def broadcast_poll(self, group_id: str, poll_data: dict, action: str):
        """Broadcast poll created/closed"""
        await self.broadcast_to_group(group_id, {
            "type": f"poll_{action}",  # poll_created, poll_closed
            "poll": poll_data,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def broadcast_poll_vote(self, group_id: str, poll_id: str, user_id: str):
        """Broadcast that someone voted on a poll"""
        await self.broadcast_to_group(group_id, {
            "type": "poll_vote",
            "poll_id": poll_id,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def broadcast_read(self, group_id: str, message_id: str, user_id: str):
        """Broadcast read receipt"""
        await self.broadcast_to_group(group_id, {
            "type": "message_read",
            "message_id": message_id,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def broadcast_mention(
        self, 
        group_id: str, 
        message_id: str, 
        mentioned_user_id: str
    ):
        """Send notification to mentioned user"""
        await self.send_to_user(group_id, mentioned_user_id, {
            "type": "mention",
            "message_id": message_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def get_online_users(self, group_id: str) -> List[str]:
        """Get list of online user IDs in group"""
        if group_id not in self.group_connections:
            return []
        
        return [
            self.connection_info[conn][0]
            for conn in self.group_connections[group_id]
            if conn in self.connection_info
        ]
    
    def get_typing_users(self, group_id: str) -> List[str]:
        """Get list of typing user IDs"""
        return list(self.typing_users.get(group_id, set()))


# Singleton manager
manager = ConnectionManager()


def get_manager() -> ConnectionManager:
    return manager
