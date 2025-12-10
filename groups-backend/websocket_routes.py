# WebSocket Endpoint for Real-time Chat
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from websocket_manager import manager
from database import Database, fetch_user_profiles
from auth import decode_token
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


# Simple test endpoint to verify WebSocket is working
@router.websocket("/ws/test")
async def test_websocket(websocket: WebSocket):
    """Simple test websocket endpoint"""
    logger.info("Test WebSocket connection attempt")
    await websocket.accept()
    logger.info("Test WebSocket accepted")
    await websocket.send_text("Hello from server!")
    await websocket.close()


@router.websocket("/ws/groups/{group_id}")
async def group_chat_websocket(
    websocket: WebSocket,
    group_id: str,
    token: str = Query(None)
):
    """
    WebSocket endpoint for real-time group chat
    
    Message types from client:
    - {"type": "message", "content": "...", "reply_to_id": "..."}
    - {"type": "typing"}
    - {"type": "stop_typing"}
    - {"type": "read", "message_id": "..."}
    
    Message types to client:
    - {"type": "new_message", "message": {...}}
    - {"type": "message_edited", "message_id": "...", "content": "..."}
    - {"type": "message_deleted", "message_id": "..."}
    - {"type": "typing_start", "user_id": "...", "user_name": "..."}
    - {"type": "typing_stop", "user_id": "..."}
    - {"type": "user_online", "user_id": "..."}
    - {"type": "user_offline", "user_id": "..."}
    - {"type": "member_joined", "user": {...}}
    - {"type": "member_left", "user_id": "..."}
    """
    logger.info(f"WebSocket connection attempt for group: {group_id}")
    logger.debug(f"WebSocket token present: {bool(token)}")
    
    # Must accept connection first before any auth checks
    await websocket.accept()
    
    # Authenticate
    if not token:
        logger.warning("WebSocket connection without token")
        await websocket.close(code=4001, reason="Missing token")
        return
        
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        user_email = payload.get("email")
        
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception as e:
        logger.error(f"WebSocket auth error: {e}")
        await websocket.close(code=4001, reason="Authentication failed")
        return
    
    # Verify group membership
    db = Database()
    group = await db.get_group(group_id, user_id)
    if not group:
        await websocket.close(code=4003, reason="Not a member of this group")
        return
    
    # Get user profile (safely - table may not exist)
    try:
        profile = db.client.table("profiles")\
            .select("full_name")\
            .eq("id", user_id)\
            .single()\
            .execute()
        user_name = profile.data.get("full_name", "Someone") if profile.data else "Someone"
    except Exception as e:
        error_str = str(e)
        if "PGRST205" in error_str or "Could not find" in error_str:
            user_name = user_email.split("@")[0] if user_email else "Someone"
        else:
            user_name = "Someone"
    
    # Connect
    await manager.connect(websocket, group_id, user_id)
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                
                if msg_type == "message":
                    # Send a new message
                    # Handle both formats: { content: '...' } or { data: { content: '...' } }
                    msg_data = message.get("data", message)
                    content = (msg_data.get("content") or "").strip()
                    if content:
                        new_msg = await db.send_message(
                            group_id=group_id,
                            user_id=user_id,
                            content=content,
                            message_type=msg_data.get("message_type", "text"),
                            reply_to_id=msg_data.get("reply_to_id")
                        )
                        
                        if new_msg:
                            await manager.broadcast_message(group_id, new_msg)
                            # Clear typing
                            await manager.clear_typing(group_id, user_id)
                
                elif msg_type == "typing":
                    await manager.set_typing(group_id, user_id, user_name)
                
                elif msg_type == "stop_typing":
                    await manager.clear_typing(group_id, user_id)
                
                elif msg_type == "read":
                    # Mark message as read
                    message_id = message.get("message_id")
                    if message_id:
                        db.client.table("group_message_reads").upsert({
                            "message_id": message_id,
                            "user_id": user_id
                        }, on_conflict="message_id,user_id").execute()
                        
                        # Update last_read_at
                        db.client.table("group_members")\
                            .update({"last_read_at": "now()"})\
                            .eq("group_id", group_id)\
                            .eq("user_id", user_id)\
                            .execute()
                
                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
                
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
            except Exception as e:
                logger.error(f"Message handling error: {e}")
    
    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected from group {group_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await manager.disconnect(websocket)


@router.get("/ws/groups/{group_id}/online")
async def get_online_users(group_id: str):
    """Get list of online users in group (for HTTP fallback)"""
    online_users = manager.get_online_users(group_id)
    typing_users = manager.get_typing_users(group_id)
    
    return {
        "online": online_users,
        "typing": typing_users
    }
