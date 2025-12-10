# Enhanced Groups API Routes
# Features: Reactions, Pinning, Polls, Mentions, Link Previews, Read Receipts
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from auth import get_current_user, AuthUser
from database import Database
import logging
import re
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/groups", tags=["groups-enhanced"])


def get_db():
    return Database()


# =====================================================
# PYDANTIC MODELS
# =====================================================

class ReactionToggle(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=10)


class PollCreate(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    options: List[str] = Field(..., min_items=2, max_items=10)
    is_multiple_choice: bool = False
    is_anonymous: bool = False
    allow_add_options: bool = False
    ends_at: Optional[str] = None


class PollVoteInput(BaseModel):
    option_ids: List[str] = Field(..., min_items=1)


class AnnotationCreate(BaseModel):
    media_id: Optional[str] = None
    content: str = Field(..., min_length=1)
    annotation_type: str = "comment"
    position_data: Optional[Dict[str, Any]] = None
    color: str = "#FFEB3B"
    parent_id: Optional[str] = None


class LinkPreviewRequest(BaseModel):
    url: str


# =====================================================
# MESSAGE REACTIONS
# =====================================================

@router.get("/{group_id}/messages/{message_id}/reactions")
async def get_message_reactions(
    group_id: str,
    message_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Get all reactions for a message with counts and users"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # Verify membership
        member = client.table("group_members")\
            .select("id")\
            .eq("group_id", group_id)\
            .eq("user_id", user.id)\
            .single()\
            .execute()
        
        if not member.data:
            raise HTTPException(status_code=403, detail="Not a member")
        
        # Get reactions with user info
        reactions = client.table("group_message_reactions")\
            .select("id, emoji, user_id, created_at")\
            .eq("message_id", message_id)\
            .execute()
        
        # Group by emoji
        reaction_counts = {}
        for r in reactions.data or []:
            emoji = r["emoji"]
            if emoji not in reaction_counts:
                reaction_counts[emoji] = {
                    "emoji": emoji,
                    "count": 0,
                    "users": [],
                    "hasReacted": False
                }
            reaction_counts[emoji]["count"] += 1
            reaction_counts[emoji]["users"].append({"id": r["user_id"]})
            if r["user_id"] == user.id:
                reaction_counts[emoji]["hasReacted"] = True
        
        return {
            "success": True,
            "reactions": list(reaction_counts.values())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get reactions error: {e}")
        return {"success": False, "error": str(e)}


@router.post("/{group_id}/messages/{message_id}/reactions")
async def toggle_reaction(
    group_id: str,
    message_id: str,
    data: ReactionToggle,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Add or remove a reaction on a message"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # Check if reaction exists
        existing = client.table("group_message_reactions")\
            .select("id")\
            .eq("message_id", message_id)\
            .eq("user_id", user.id)\
            .eq("emoji", data.emoji)\
            .execute()
        
        if existing.data and len(existing.data) > 0:
            # Remove reaction
            client.table("group_message_reactions")\
                .delete()\
                .eq("id", existing.data[0]["id"])\
                .execute()
            action = "removed"
        else:
            # Add reaction
            client.table("group_message_reactions").insert({
                "message_id": message_id,
                "user_id": user.id,
                "emoji": data.emoji
            }).execute()
            action = "added"
        
        # Broadcast via WebSocket
        try:
            from websocket_manager import manager
            await manager.broadcast_reaction(group_id, message_id, data.emoji, user.id, action)
        except:
            pass
        
        return {"success": True, "action": action}
        
    except Exception as e:
        logger.error(f"Toggle reaction error: {e}")
        return {"success": False, "error": str(e)}


# =====================================================
# MESSAGE PINNING
# =====================================================

@router.get("/{group_id}/pinned")
async def get_pinned_messages(
    group_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Get all pinned messages in a group"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # Verify membership
        member = client.table("group_members")\
            .select("id")\
            .eq("group_id", group_id)\
            .eq("user_id", user.id)\
            .single()\
            .execute()
        
        if not member.data:
            raise HTTPException(status_code=403, detail="Not a member")
        
        # Get pinned messages
        messages = client.table("group_messages")\
            .select("*, sender:sender_id(id, email, raw_user_meta_data)")\
            .eq("group_id", group_id)\
            .eq("is_pinned", True)\
            .order("pinned_at", desc=True)\
            .execute()
        
        return {
            "success": True,
            "messages": messages.data or []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get pinned messages error: {e}")
        return {"success": False, "error": str(e)}


@router.post("/{group_id}/messages/{message_id}/pin")
async def pin_message(
    group_id: str,
    message_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Pin a message (admins only)"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # Verify admin
        member = client.table("group_members")\
            .select("role")\
            .eq("group_id", group_id)\
            .eq("user_id", user.id)\
            .single()\
            .execute()
        
        if not member.data or member.data["role"] not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="Admin only")
        
        # Pin the message
        from datetime import datetime
        client.table("group_messages")\
            .update({
                "is_pinned": True,
                "pinned_at": datetime.utcnow().isoformat(),
                "pinned_by": user.id
            })\
            .eq("id", message_id)\
            .eq("group_id", group_id)\
            .execute()
        
        # Broadcast
        try:
            from websocket_manager import manager
            await manager.broadcast_pin(group_id, message_id, True, user.id)
        except:
            pass
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pin message error: {e}")
        return {"success": False, "error": str(e)}


@router.delete("/{group_id}/messages/{message_id}/pin")
async def unpin_message(
    group_id: str,
    message_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Unpin a message (admins only)"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # Verify admin
        member = client.table("group_members")\
            .select("role")\
            .eq("group_id", group_id)\
            .eq("user_id", user.id)\
            .single()\
            .execute()
        
        if not member.data or member.data["role"] not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="Admin only")
        
        # Unpin
        client.table("group_messages")\
            .update({
                "is_pinned": False,
                "pinned_at": None,
                "pinned_by": None
            })\
            .eq("id", message_id)\
            .eq("group_id", group_id)\
            .execute()
        
        # Broadcast
        try:
            from websocket_manager import manager
            await manager.broadcast_pin(group_id, message_id, False, user.id)
        except:
            pass
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unpin message error: {e}")
        return {"success": False, "error": str(e)}


# =====================================================
# POLLS
# =====================================================

@router.post("/{group_id}/polls")
async def create_poll(
    group_id: str,
    data: PollCreate,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Create a poll in a group"""
    try:
        from supabase import create_client
        from config import settings
        import uuid
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # Verify membership
        member = client.table("group_members")\
            .select("id")\
            .eq("group_id", group_id)\
            .eq("user_id", user.id)\
            .single()\
            .execute()
        
        if not member.data:
            raise HTTPException(status_code=403, detail="Not a member")
        
        # Create poll options with IDs
        options = [{"id": str(uuid.uuid4()), "text": opt} for opt in data.options]
        
        # Create a message first (type: poll)
        message = client.table("group_messages").insert({
            "group_id": group_id,
            "sender_id": user.id,
            "content": f"📊 Poll: {data.question}",
            "message_type": "text",
            "metadata": {"is_poll": True}
        }).execute()
        
        if not message.data:
            raise HTTPException(status_code=500, detail="Failed to create message")
        
        message_id = message.data[0]["id"]
        
        # Create the poll
        poll = client.table("group_polls").insert({
            "group_id": group_id,
            "message_id": message_id,
            "created_by": user.id,
            "question": data.question,
            "options": options,
            "is_multiple_choice": data.is_multiple_choice,
            "is_anonymous": data.is_anonymous,
            "allow_add_options": data.allow_add_options,
            "ends_at": data.ends_at
        }).execute()
        
        if not poll.data:
            raise HTTPException(status_code=500, detail="Failed to create poll")
        
        poll_id = poll.data[0]["id"]
        
        # Update message metadata with poll_id
        client.table("group_messages")\
            .update({"metadata": {"is_poll": True, "poll_id": poll_id}})\
            .eq("id", message_id)\
            .execute()
        
        # Broadcast
        try:
            from websocket_manager import manager
            await manager.broadcast_poll(group_id, poll.data[0], "created")
        except:
            pass
        
        return {
            "success": True,
            "poll": poll.data[0],
            "message": message.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create poll error: {e}")
        return {"success": False, "error": str(e)}


@router.get("/{group_id}/polls/{poll_id}")
async def get_poll(
    group_id: str,
    poll_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Get poll with results"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # Get poll
        poll = client.table("group_polls")\
            .select("*")\
            .eq("id", poll_id)\
            .single()\
            .execute()
        
        if not poll.data:
            raise HTTPException(status_code=404, detail="Poll not found")
        
        # Get votes
        votes = client.table("group_poll_votes")\
            .select("option_id, user_id")\
            .eq("poll_id", poll_id)\
            .execute()
        
        # Calculate results
        vote_counts = {}
        user_votes = []
        total_votes = 0
        
        for v in votes.data or []:
            opt_id = v["option_id"]
            if opt_id not in vote_counts:
                vote_counts[opt_id] = {"count": 0, "voters": []}
            vote_counts[opt_id]["count"] += 1
            total_votes += 1
            
            if not poll.data["is_anonymous"]:
                vote_counts[opt_id]["voters"].append({"id": v["user_id"]})
            
            if v["user_id"] == user.id:
                user_votes.append(opt_id)
        
        # Calculate percentages
        results = []
        for opt in poll.data["options"]:
            opt_id = opt["id"]
            count = vote_counts.get(opt_id, {"count": 0, "voters": []})["count"]
            results.append({
                "option_id": opt_id,
                "vote_count": count,
                "percentage": round((count / total_votes * 100) if total_votes > 0 else 0, 1),
                "voters": vote_counts.get(opt_id, {"voters": []})["voters"] if not poll.data["is_anonymous"] else []
            })
        
        return {
            "success": True,
            "poll": {
                **poll.data,
                "total_votes": total_votes,
                "results": results,
                "user_votes": user_votes
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get poll error: {e}")
        return {"success": False, "error": str(e)}


@router.post("/{group_id}/polls/{poll_id}/vote")
async def vote_on_poll(
    group_id: str,
    poll_id: str,
    data: PollVoteInput,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Vote on a poll"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # Get poll
        poll = client.table("group_polls")\
            .select("*")\
            .eq("id", poll_id)\
            .single()\
            .execute()
        
        if not poll.data:
            raise HTTPException(status_code=404, detail="Poll not found")
        
        if poll.data["is_closed"]:
            raise HTTPException(status_code=400, detail="Poll is closed")
        
        # If not multiple choice, remove existing votes
        if not poll.data["is_multiple_choice"]:
            client.table("group_poll_votes")\
                .delete()\
                .eq("poll_id", poll_id)\
                .eq("user_id", user.id)\
                .execute()
        
        # Add new votes
        for opt_id in data.option_ids:
            # Validate option exists
            valid = any(o["id"] == opt_id for o in poll.data["options"])
            if not valid:
                continue
            
            try:
                client.table("group_poll_votes").insert({
                    "poll_id": poll_id,
                    "option_id": opt_id,
                    "user_id": user.id
                }).execute()
            except:
                pass  # Might be duplicate
        
        # Broadcast
        try:
            from websocket_manager import manager
            await manager.broadcast_poll_vote(group_id, poll_id, user.id)
        except:
            pass
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Vote error: {e}")
        return {"success": False, "error": str(e)}


@router.delete("/{group_id}/polls/{poll_id}/vote")
async def remove_vote(
    group_id: str,
    poll_id: str,
    option_id: str = Query(...),
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Remove a vote from a poll"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        client.table("group_poll_votes")\
            .delete()\
            .eq("poll_id", poll_id)\
            .eq("option_id", option_id)\
            .eq("user_id", user.id)\
            .execute()
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Remove vote error: {e}")
        return {"success": False, "error": str(e)}


@router.post("/{group_id}/polls/{poll_id}/close")
async def close_poll(
    group_id: str,
    poll_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Close a poll (creator or admin only)"""
    try:
        from supabase import create_client
        from config import settings
        from datetime import datetime
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # Get poll
        poll = client.table("group_polls")\
            .select("created_by")\
            .eq("id", poll_id)\
            .single()\
            .execute()
        
        if not poll.data:
            raise HTTPException(status_code=404, detail="Poll not found")
        
        # Check if creator or admin
        if poll.data["created_by"] != user.id:
            member = client.table("group_members")\
                .select("role")\
                .eq("group_id", group_id)\
                .eq("user_id", user.id)\
                .single()\
                .execute()
            
            if not member.data or member.data["role"] not in ["admin", "owner"]:
                raise HTTPException(status_code=403, detail="Not authorized")
        
        # Close poll
        client.table("group_polls")\
            .update({
                "is_closed": True,
                "closed_at": datetime.utcnow().isoformat()
            })\
            .eq("id", poll_id)\
            .execute()
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Close poll error: {e}")
        return {"success": False, "error": str(e)}


# =====================================================
# MENTIONS
# =====================================================

@router.get("/{group_id}/mentions")
async def get_my_mentions(
    group_id: str,
    limit: int = Query(20, le=50),
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Get messages where current user is mentioned"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # Get mentions
        mentions = client.table("group_message_mentions")\
            .select("message_id")\
            .eq("mentioned_user_id", user.id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        if not mentions.data:
            return {"success": True, "messages": []}
        
        message_ids = [m["message_id"] for m in mentions.data]
        
        # Get messages
        messages = client.table("group_messages")\
            .select("*, sender:sender_id(id, email, raw_user_meta_data)")\
            .in_("id", message_ids)\
            .eq("group_id", group_id)\
            .execute()
        
        return {
            "success": True,
            "messages": messages.data or []
        }
        
    except Exception as e:
        logger.error(f"Get mentions error: {e}")
        return {"success": False, "error": str(e)}


# Helper function to extract and save mentions from message content
async def process_mentions(client, message_id: str, content: str, group_id: str):
    """Extract @mentions from content and save them"""
    # Pattern: @username or @[full name]
    mention_pattern = r'@(\w+)|@\[([^\]]+)\]'
    matches = re.findall(mention_pattern, content)
    
    if not matches:
        return
    
    # Get group members
    members = client.table("group_members")\
        .select("user_id, user:user_id(email, raw_user_meta_data)")\
        .eq("group_id", group_id)\
        .execute()
    
    member_map = {}
    for m in members.data or []:
        user = m.get("user", {})
        name = user.get("raw_user_meta_data", {}).get("name", "").lower()
        email = (user.get("email") or "").split("@")[0].lower()
        member_map[name] = m["user_id"]
        member_map[email] = m["user_id"]
    
    # Save mentions
    for match in matches:
        name = (match[0] or match[1]).lower()
        if name in member_map:
            try:
                client.table("group_message_mentions").insert({
                    "message_id": message_id,
                    "mentioned_user_id": member_map[name]
                }).execute()
            except:
                pass  # Duplicate


# =====================================================
# LINK PREVIEWS
# =====================================================

@router.post("/{group_id}/link-preview")
async def get_link_preview(
    group_id: str,
    data: LinkPreviewRequest,
    user: AuthUser = Depends(get_current_user)
):
    """Fetch Open Graph data for a URL"""
    try:
        url = data.url
        parsed = urlparse(url)
        
        preview = {
            "url": url,
            "type": "website"
        }
        
        # Check for specific types
        if "youtube.com" in parsed.netloc or "youtu.be" in parsed.netloc:
            preview["type"] = "youtube"
            # Extract video ID
            if "youtube.com" in parsed.netloc:
                if "v=" in url:
                    preview["video_id"] = url.split("v=")[1].split("&")[0]
            else:
                preview["video_id"] = parsed.path.strip("/")
        
        elif "doi.org" in parsed.netloc or url.startswith("10."):
            preview["type"] = "doi"
            preview["doi"] = url.replace("https://doi.org/", "").replace("http://doi.org/", "")
            # Could fetch from CrossRef API here
        
        elif "github.com" in parsed.netloc:
            preview["type"] = "github"
        
        elif "twitter.com" in parsed.netloc or "x.com" in parsed.netloc:
            preview["type"] = "twitter"
        
        # Fetch Open Graph data
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, follow_redirects=True, headers={
                "User-Agent": "Mozilla/5.0 (compatible; BioDocs/1.0)"
            })
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                
                # Get OG tags
                og_title = soup.find("meta", property="og:title")
                og_desc = soup.find("meta", property="og:description")
                og_image = soup.find("meta", property="og:image")
                og_site = soup.find("meta", property="og:site_name")
                
                preview["title"] = og_title["content"] if og_title else soup.title.string if soup.title else None
                preview["description"] = og_desc["content"] if og_desc else None
                preview["image_url"] = og_image["content"] if og_image else None
                preview["site_name"] = og_site["content"] if og_site else parsed.netloc
                
                # Get favicon
                favicon = soup.find("link", rel=lambda x: x and "icon" in x.lower())
                if favicon and favicon.get("href"):
                    href = favicon["href"]
                    if href.startswith("//"):
                        preview["favicon_url"] = f"https:{href}"
                    elif href.startswith("/"):
                        preview["favicon_url"] = f"{parsed.scheme}://{parsed.netloc}{href}"
                    else:
                        preview["favicon_url"] = href
        
        return {"success": True, "preview": preview}
        
    except Exception as e:
        logger.error(f"Link preview error: {e}")
        return {"success": False, "error": str(e), "preview": {"url": data.url, "type": "website"}}


# =====================================================
# READ RECEIPTS
# =====================================================

@router.get("/{group_id}/messages/{message_id}/reads")
async def get_read_receipts(
    group_id: str,
    message_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Get who has read a message"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        reads = client.table("group_message_reads")\
            .select("user_id, read_at, user:user_id(email, raw_user_meta_data)")\
            .eq("message_id", message_id)\
            .execute()
        
        return {
            "success": True,
            "receipts": reads.data or [],
            "count": len(reads.data or [])
        }
        
    except Exception as e:
        logger.error(f"Get read receipts error: {e}")
        return {"success": False, "error": str(e)}


@router.post("/{group_id}/messages/{message_id}/read")
async def mark_as_read(
    group_id: str,
    message_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Mark a message as read"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        # Upsert read receipt
        client.table("group_message_reads").upsert({
            "message_id": message_id,
            "user_id": user.id
        }, on_conflict="message_id,user_id").execute()
        
        # Also update last_read_at on member
        from datetime import datetime
        client.table("group_members")\
            .update({"last_read_at": datetime.utcnow().isoformat()})\
            .eq("group_id", group_id)\
            .eq("user_id", user.id)\
            .execute()
        
        # Broadcast read receipt
        try:
            from websocket_manager import manager
            await manager.broadcast_read(group_id, message_id, user.id)
        except:
            pass
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Mark read error: {e}")
        return {"success": False, "error": str(e)}


@router.post("/{group_id}/messages/read-all")
async def mark_all_as_read(
    group_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Mark all messages in a group as read (update last_read_at)"""
    try:
        from supabase import create_client
        from config import settings
        from datetime import datetime
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        client.table("group_members")\
            .update({"last_read_at": datetime.utcnow().isoformat()})\
            .eq("group_id", group_id)\
            .eq("user_id", user.id)\
            .execute()
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Mark all read error: {e}")
        return {"success": False, "error": str(e)}


# =====================================================
# ANNOTATIONS
# =====================================================

@router.get("/{group_id}/annotations")
async def get_annotations(
    group_id: str,
    media_id: Optional[str] = None,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Get annotations for a group or specific media"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        query = client.table("group_annotations")\
            .select("*, creator:created_by(id, email, raw_user_meta_data)")\
            .eq("group_id", group_id)\
            .is_("parent_id", "null")\
            .order("created_at", desc=True)
        
        if media_id:
            query = query.eq("media_id", media_id)
        
        annotations = query.execute()
        
        # Get replies for each annotation
        result = []
        for ann in annotations.data or []:
            replies = client.table("group_annotations")\
                .select("*, creator:created_by(id, email, raw_user_meta_data)")\
                .eq("parent_id", ann["id"])\
                .order("created_at")\
                .execute()
            
            ann["replies"] = replies.data or []
            result.append(ann)
        
        return {"success": True, "annotations": result}
        
    except Exception as e:
        logger.error(f"Get annotations error: {e}")
        return {"success": False, "error": str(e)}


@router.post("/{group_id}/annotations")
async def create_annotation(
    group_id: str,
    data: AnnotationCreate,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Create a new annotation"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        annotation = client.table("group_annotations").insert({
            "group_id": group_id,
            "media_id": data.media_id,
            "created_by": user.id,
            "content": data.content,
            "annotation_type": data.annotation_type,
            "position_data": data.position_data,
            "color": data.color,
            "parent_id": data.parent_id
        }).execute()
        
        if not annotation.data:
            raise HTTPException(status_code=500, detail="Failed to create annotation")
        
        return {"success": True, "annotation": annotation.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create annotation error: {e}")
        return {"success": False, "error": str(e)}


@router.put("/{group_id}/annotations/{annotation_id}")
async def update_annotation(
    group_id: str,
    annotation_id: str,
    content: str = Body(..., embed=True),
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Update an annotation"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        annotation = client.table("group_annotations")\
            .update({"content": content})\
            .eq("id", annotation_id)\
            .eq("created_by", user.id)\
            .execute()
        
        return {"success": True, "annotation": annotation.data[0] if annotation.data else None}
        
    except Exception as e:
        logger.error(f"Update annotation error: {e}")
        return {"success": False, "error": str(e)}


@router.delete("/{group_id}/annotations/{annotation_id}")
async def delete_annotation(
    group_id: str,
    annotation_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Delete an annotation"""
    try:
        from supabase import create_client
        from config import settings
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        client.table("group_annotations")\
            .delete()\
            .eq("id", annotation_id)\
            .eq("created_by", user.id)\
            .execute()
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Delete annotation error: {e}")
        return {"success": False, "error": str(e)}


@router.post("/{group_id}/annotations/{annotation_id}/resolve")
async def resolve_annotation(
    group_id: str,
    annotation_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """Mark annotation as resolved"""
    try:
        from supabase import create_client
        from config import settings
        from datetime import datetime
        
        client = create_client(settings.supabase_url, settings.supabase_service_key)
        
        client.table("group_annotations")\
            .update({
                "is_resolved": True,
                "resolved_at": datetime.utcnow().isoformat(),
                "resolved_by": user.id
            })\
            .eq("id", annotation_id)\
            .execute()
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Resolve annotation error: {e}")
        return {"success": False, "error": str(e)}
