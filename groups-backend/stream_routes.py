# Stream Share Routes
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user, AuthUser
from database import Database
from models import StreamShareCreate
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/groups", tags=["stream-share"])


def get_db():
    return Database()


@router.post("/{group_id}/stream-share")
async def share_stream(
    group_id: str,
    data: StreamShareCreate,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Share a video stream to group"""
    try:
        # Verify membership
        members = await db.get_members(group_id, user.id)
        if members is None:
            raise HTTPException(status_code=403, detail="Not a member of this group")
        
        # Create message for stream share
        message = await db.send_message(
            group_id=group_id,
            user_id=user.id,
            content=f"shared a video stream: {data.stream_title or 'Live Stream'}",
            message_type="stream_share",
            metadata={
                "stream_room_id": data.stream_room_id,
                "room_code": data.room_code,
                "stream_title": data.stream_title
            }
        )
        
        if not message:
            raise HTTPException(status_code=403, detail="Cannot share stream")
        
        # Create stream share record
        result = db.client.table("group_stream_shares").insert({
            "group_id": group_id,
            "message_id": message["id"],
            "stream_room_id": data.stream_room_id,
            "shared_by": user.id,
            "stream_title": data.stream_title,
            "stream_description": data.stream_description,
            "room_code": data.room_code
        }).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create stream share")
        
        # Broadcast via WebSocket
        from websocket_manager import manager
        await manager.broadcast_message(group_id, message)
        
        return {
            "success": True,
            "stream_share": result.data[0],
            "message": message
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Share stream error: {e}")
        return {"success": False, "error": str(e)}


@router.get("/{group_id}/stream-shares")
async def list_stream_shares(
    group_id: str,
    limit: int = 20,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """List stream shares in group"""
    try:
        # Verify membership
        members = await db.get_members(group_id, user.id)
        if members is None:
            raise HTTPException(status_code=403, detail="Not a member of this group")
        
        result = db.client.table("group_stream_shares")\
            .select("*")\
            .eq("group_id", group_id)\
            .order("shared_at", desc=True)\
            .limit(limit)\
            .execute()
        
        # Fetch sharer profiles (safely - table may not exist)
        shares = result.data or []
        if shares:
            sharer_ids = list(set(s["shared_by"] for s in shares))
            from database import fetch_user_profiles
            profile_map = fetch_user_profiles(db.client, sharer_ids)
            
            for share in shares:
                share["sharer"] = profile_map.get(share["shared_by"])
        
        return {
            "success": True,
            "stream_shares": shares
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List stream shares error: {e}")
        return {"success": False, "error": str(e), "stream_shares": []}
