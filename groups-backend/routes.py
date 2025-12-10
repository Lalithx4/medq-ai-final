# Groups API Routes
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import List, Optional
from auth import get_current_user, AuthUser
from database import Database
from models import (
    GroupCreate, GroupUpdate, GroupResponse, GroupsResponse, GroupSummary,
    MemberAdd, MemberUpdate, MembersResponse,
    MessageCreate, MessageUpdate, MessagesResponse, MessageResponse,
    StreamShareCreate, InviteResponse
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/groups", tags=["groups"])


def get_db():
    return Database()


# =====================================================
# GROUP CRUD
# =====================================================

@router.get("", response_model=GroupsResponse)
async def list_groups(
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """List all groups for current user"""
    try:
        groups = await db.get_user_groups(user.id)
        
        # Format as summaries
        summaries = []
        for g in groups:
            summaries.append(GroupSummary(
                id=g["id"],
                name=g["name"],
                description=g.get("description"),
                avatar_url=g.get("avatar_url"),
                group_type=g.get("group_type", "private"),
                member_count=0,  # TODO: Add count
                unread_count=0
            ))
        
        return GroupsResponse(success=True, groups=summaries, total=len(summaries))
    
    except Exception as e:
        logger.error(f"List groups error: {e}")
        return GroupsResponse(success=False, error=str(e))


@router.post("", response_model=GroupResponse)
async def create_group(
    data: GroupCreate,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Create a new group"""
    try:
        group = await db.create_group(
            name=data.name,
            created_by=user.id,
            description=data.description,
            avatar_url=data.avatar_url,
            group_type=data.group_type.value,
            max_members=data.max_members,
            only_admins_can_message=data.only_admins_can_message,
            only_admins_can_add_members=data.only_admins_can_add_members
        )
        
        if not group:
            return GroupResponse(success=False, error="Failed to create group")
        
        return GroupResponse(success=True, group=group)
    
    except Exception as e:
        logger.error(f"Create group error: {e}")
        return GroupResponse(success=False, error=str(e))


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Get group details"""
    try:
        group = await db.get_group(group_id, user.id)
        
        if not group:
            raise HTTPException(status_code=404, detail="Group not found or access denied")
        
        return GroupResponse(success=True, group=group)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get group error: {e}")
        return GroupResponse(success=False, error=str(e))


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: str,
    data: GroupUpdate,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Update group settings (admin only)"""
    try:
        updates = data.model_dump(exclude_unset=True)
        if "group_type" in updates and updates["group_type"]:
            updates["group_type"] = updates["group_type"].value
        
        group = await db.update_group(group_id, user.id, **updates)
        
        if not group:
            raise HTTPException(status_code=403, detail="Not authorized to update group")
        
        return GroupResponse(success=True, group=group)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update group error: {e}")
        return GroupResponse(success=False, error=str(e))


@router.delete("/{group_id}")
async def delete_group(
    group_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Delete group (creator only)"""
    try:
        success = await db.delete_group(group_id, user.id)
        
        if not success:
            raise HTTPException(status_code=403, detail="Not authorized to delete group")
        
        return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete group error: {e}")
        return {"success": False, "error": str(e)}


# =====================================================
# MEMBERS
# =====================================================

@router.get("/{group_id}/members", response_model=MembersResponse)
async def list_members(
    group_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """List group members"""
    try:
        members = await db.get_members(group_id, user.id)
        
        if members is None:
            raise HTTPException(status_code=403, detail="Not a member of this group")
        
        return MembersResponse(success=True, members=members)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List members error: {e}")
        return MembersResponse(success=False, error=str(e))


@router.post("/{group_id}/members")
async def add_members(
    group_id: str,
    members: List[MemberAdd],
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Add members to group"""
    try:
        members_data = [{"user_id": m.user_id, "role": m.role.value} for m in members]
        result = await db.add_members(group_id, user.id, members_data)
        
        if result is None:
            raise HTTPException(status_code=403, detail="Not authorized to add members")
        
        return {"success": True, "added": len(result)}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add members error: {e}")
        return {"success": False, "error": str(e)}


@router.put("/{group_id}/members/{target_user_id}")
async def update_member(
    group_id: str,
    target_user_id: str,
    data: MemberUpdate,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Update member (role, mute, etc.)"""
    try:
        updates = data.model_dump(exclude_unset=True)
        if "role" in updates and updates["role"]:
            updates["role"] = updates["role"].value
        
        result = await db.update_member(group_id, user.id, target_user_id, **updates)
        
        if result is None:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return {"success": True, "member": result}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update member error: {e}")
        return {"success": False, "error": str(e)}


@router.delete("/{group_id}/members/{target_user_id}")
async def remove_member(
    group_id: str,
    target_user_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Remove member or leave group"""
    try:
        success = await db.remove_member(group_id, user.id, target_user_id)
        
        if not success:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Remove member error: {e}")
        return {"success": False, "error": str(e)}


# =====================================================
# MESSAGES
# =====================================================

@router.get("/{group_id}/messages", response_model=MessagesResponse)
async def list_messages(
    group_id: str,
    limit: int = Query(50, le=100),
    before: Optional[str] = None,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Get messages for a group"""
    try:
        result = await db.get_messages(group_id, user.id, limit=limit, before=before)
        
        if result is None:
            raise HTTPException(status_code=403, detail="Not a member of this group")
        
        messages, has_more = result
        return MessagesResponse(success=True, messages=messages, has_more=has_more)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List messages error: {e}")
        return MessagesResponse(success=False, error=str(e))


@router.post("/{group_id}/messages", response_model=MessageResponse)
async def send_message(
    group_id: str,
    data: MessageCreate,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Send a message"""
    try:
        message = await db.send_message(
            group_id=group_id,
            user_id=user.id,
            content=data.content,
            message_type=data.message_type.value,
            reply_to_id=data.reply_to_id,
            metadata=data.metadata
        )
        
        if not message:
            raise HTTPException(status_code=403, detail="Cannot send message")
        
        # Broadcast via WebSocket
        from websocket_manager import manager
        await manager.broadcast_message(group_id, message)
        
        return MessageResponse(success=True, message=message)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send message error: {e}")
        return MessageResponse(success=False, error=str(e))


@router.put("/{group_id}/messages/{message_id}")
async def edit_message(
    group_id: str,
    message_id: str,
    data: MessageUpdate,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Edit a message"""
    try:
        message = await db.edit_message(message_id, user.id, data.content)
        
        if not message:
            raise HTTPException(status_code=403, detail="Cannot edit message")
        
        # Broadcast edit
        from websocket_manager import manager
        await manager.broadcast_message_edit(group_id, message_id, data.content)
        
        return {"success": True, "message": message}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Edit message error: {e}")
        return {"success": False, "error": str(e)}


@router.delete("/{group_id}/messages/{message_id}")
async def delete_message(
    group_id: str,
    message_id: str,
    for_everyone: bool = False,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Delete a message"""
    try:
        success = await db.delete_message(message_id, user.id, for_everyone)
        
        if not success:
            raise HTTPException(status_code=403, detail="Cannot delete message")
        
        if for_everyone:
            from websocket_manager import manager
            await manager.broadcast_message_delete(group_id, message_id)
        
        return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete message error: {e}")
        return {"success": False, "error": str(e)}


# =====================================================
# INVITE LINKS
# =====================================================

@router.get("/{group_id}/invite", response_model=InviteResponse)
async def get_invite_link(
    group_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Get group invite link"""
    try:
        invite_code = await db.get_invite_link(group_id, user.id)
        
        if not invite_code:
            raise HTTPException(status_code=403, detail="Not authorized or invites disabled")
        
        # Construct full link
        invite_link = f"https://biodocs.ai/groups/join/{invite_code}"
        
        return InviteResponse(success=True, invite_link=invite_link, invite_code=invite_code)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get invite error: {e}")
        return InviteResponse(success=False, error=str(e))


@router.post("/{group_id}/invite", response_model=InviteResponse)
async def regenerate_invite(
    group_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Regenerate invite code"""
    try:
        new_code = await db.regenerate_invite(group_id, user.id)
        
        if not new_code:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        invite_link = f"https://biodocs.ai/groups/join/{new_code}"
        
        return InviteResponse(success=True, invite_link=invite_link, invite_code=new_code)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Regenerate invite error: {e}")
        return InviteResponse(success=False, error=str(e))


@router.get("/join/{invite_code}")
async def get_group_info_from_invite(invite_code: str):
    """Get group info from invite code (public)"""
    try:
        db = Database()
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        group = client.table("groups")\
            .select("id, name, description, avatar_url, group_type, max_members")\
            .eq("invite_code", invite_code)\
            .eq("invite_link_enabled", True)\
            .single()\
            .execute()
        
        if not group.data:
            raise HTTPException(status_code=404, detail="Invalid invite link")
        
        # Get member count
        count = client.table("group_members")\
            .select("id", count="exact")\
            .eq("group_id", group.data["id"])\
            .execute()
        
        return {
            "success": True,
            "group": {
                **group.data,
                "member_count": count.count or 0
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get invite info error: {e}")
        return {"success": False, "error": str(e)}


@router.post("/join/{invite_code}")
async def join_via_invite(
    invite_code: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Join group via invite code"""
    try:
        group, error = await db.join_via_invite(invite_code, user.id)
        
        if error and error != "already_member":
            raise HTTPException(status_code=400, detail=error)
        
        return {
            "success": True,
            "group": group,
            "already_member": error == "already_member"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Join via invite error: {e}")
        return {"success": False, "error": str(e)}


# =====================================================
# TYPING INDICATORS
# =====================================================

@router.post("/{group_id}/typing")
async def set_typing(
    group_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Set typing indicator"""
    try:
        await db.set_typing(group_id, user.id)
        
        # Broadcast via WebSocket
        from websocket_manager import manager
        await manager.set_typing(group_id, user.id, user.email or "Someone")
        
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Set typing error: {e}")
        return {"success": False, "error": str(e)}


@router.delete("/{group_id}/typing")
async def clear_typing(
    group_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Clear typing indicator"""
    try:
        await db.clear_typing(group_id, user.id)
        
        from websocket_manager import manager
        await manager.clear_typing(group_id, user.id)
        
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Clear typing error: {e}")
        return {"success": False, "error": str(e)}


# =====================================================
# USER SEARCH
# =====================================================

@router.get("/search/users")
async def search_users(
    q: str = Query(..., min_length=2),
    group_id: Optional[str] = None,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Search users (for adding to groups)"""
    try:
        users = await db.search_users(q, group_id)
        return {"success": True, "users": users}
    
    except Exception as e:
        logger.error(f"Search users error: {e}")
        return {"success": False, "error": str(e), "users": []}
