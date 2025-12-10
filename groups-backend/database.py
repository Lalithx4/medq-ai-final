# Supabase Database Client
from supabase import create_client, Client
from config import settings
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)

DEBUG = True

def log_db(*args):
    if DEBUG:
        logger.debug(f"[DB] {' '.join(str(a) for a in args)}")


def get_supabase_client() -> Client:
    """Get Supabase client with anon key (respects RLS)"""
    return create_client(settings.supabase_url, settings.supabase_key)


def get_supabase_admin() -> Client:
    """Get Supabase client with service role key (bypasses RLS)"""
    return create_client(settings.supabase_url, settings.supabase_service_key)


def fetch_user_profiles(client: Client, user_ids: List[str]) -> Dict[str, dict]:
    """
    Safely fetch user profile info. 
    Returns a dict mapping user_id to profile data.
    Uses auth.users metadata if profiles table doesn't exist.
    """
    if not user_ids:
        return {}
    
    profile_map = {}
    
    # Try profiles table first (if it exists)
    try:
        profiles = client.table("profiles")\
            .select("id, full_name, avatar_url, email")\
            .in_("id", user_ids)\
            .execute()
        
        if profiles.data:
            for p in profiles.data:
                profile_map[p["id"]] = p
            log_db(f"Fetched {len(profiles.data)} profiles from profiles table")
    except Exception as e:
        log_db(f"profiles table not available: {e}")
    
    # For users not found in profiles, try to get from auth.users via admin API
    missing_user_ids = [uid for uid in user_ids if uid not in profile_map]
    
    if missing_user_ids:
        try:
            # Get admin client to access auth API
            admin_client = get_supabase_admin()
            
            for user_id in missing_user_ids:
                try:
                    # Use Supabase Auth Admin API to get user
                    user_response = admin_client.auth.admin.get_user_by_id(user_id)
                    if user_response and user_response.user:
                        user = user_response.user
                        user_metadata = user.user_metadata or {}
                        
                        # Extract name and avatar from user metadata
                        full_name = (
                            user_metadata.get("full_name") or 
                            user_metadata.get("name") or 
                            user.email.split("@")[0] if user.email else None
                        )
                        avatar_url = (
                            user_metadata.get("avatar_url") or 
                            user_metadata.get("picture")
                        )
                        
                        profile_map[user_id] = {
                            "id": user_id,
                            "full_name": full_name,
                            "avatar_url": avatar_url,
                            "email": user.email
                        }
                        log_db(f"Got user info from auth API: {full_name}")
                except Exception as user_err:
                    log_db(f"Could not get auth user {user_id}: {user_err}")
                    # Fallback
                    profile_map[user_id] = {
                        "id": user_id,
                        "full_name": None,
                        "avatar_url": None,
                        "email": None
                    }
        except Exception as e:
            log_db(f"Error accessing auth API: {e}")
            # Fallback for all missing users
            for user_id in missing_user_ids:
                if user_id not in profile_map:
                    profile_map[user_id] = {
                        "id": user_id,
                        "full_name": None,
                        "avatar_url": None,
                        "email": None
                    }
    
    return profile_map


class Database:
    """Database operations wrapper"""
    
    def __init__(self, user_id: Optional[str] = None):
        self.user_id = user_id
        # Use admin client for operations, apply user filtering manually
        self.client = get_supabase_admin()
        log_db("Database initialized for user:", user_id)
    
    # =====================================================
    # GROUPS
    # =====================================================
    
    async def get_user_groups(self, user_id: str):
        """Get all groups where user is a member"""
        log_db("get_user_groups for:", user_id)
        
        # Get group IDs where user is member
        memberships = self.client.table("group_members")\
            .select("group_id")\
            .eq("user_id", user_id)\
            .execute()
        
        log_db("Found memberships:", len(memberships.data) if memberships.data else 0)
        
        if not memberships.data:
            return []
        
        group_ids = [m["group_id"] for m in memberships.data]
        
        # Fetch groups
        groups = self.client.table("groups")\
            .select("*")\
            .in_("id", group_ids)\
            .order("updated_at", desc=True)\
            .execute()
        
        log_db("Fetched groups:", len(groups.data) if groups.data else 0)
        return groups.data
    
    async def get_group(self, group_id: str, user_id: str):
        """Get single group if user is member"""
        log_db("get_group:", group_id, "for user:", user_id)
        
        # Verify membership
        membership = self.client.table("group_members")\
            .select("*")\
            .eq("group_id", group_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not membership.data:
            log_db("User not a member of group")
            return None
        
        group = self.client.table("groups")\
            .select("*")\
            .eq("id", group_id)\
            .single()\
            .execute()
        
        log_db("Group data:", group.data)
        return group.data
    
    async def create_group(self, name: str, created_by: str, **kwargs):
        """Create a new group and add creator as admin"""
        log_db("create_group:", name, "by:", created_by)
        
        group_data = {
            "name": name,
            "created_by": created_by,
            **{k: v for k, v in kwargs.items() if v is not None}
        }
        log_db("Group data:", group_data)
        
        # Create group
        group = self.client.table("groups")\
            .insert(group_data)\
            .execute()
        
        if not group.data:
            log_db("Failed to create group")
            return None
        
        group_id = group.data[0]["id"]
        log_db("Group created with ID:", group_id)
        
        # Add creator as admin
        self.client.table("group_members").insert({
            "group_id": group_id,
            "user_id": created_by,
            "role": "admin",
            "added_by": created_by
        }).execute()
        log_db("Added creator as admin")
        
        # Add system message
        self.client.table("group_messages").insert({
            "group_id": group_id,
            "sender_id": created_by,
            "content": "created this group",
            "message_type": "system"
        }).execute()
        
        return group.data[0]
    
    async def update_group(self, group_id: str, user_id: str, **updates):
        """Update group settings (admin only)"""
        # Verify admin
        membership = self.client.table("group_members")\
            .select("role")\
            .eq("group_id", group_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not membership.data or membership.data["role"] != "admin":
            return None
        
        # Update
        result = self.client.table("groups")\
            .update({k: v for k, v in updates.items() if v is not None})\
            .eq("id", group_id)\
            .execute()
        
        return result.data[0] if result.data else None
    
    async def delete_group(self, group_id: str, user_id: str):
        """Delete group (creator only)"""
        group = self.client.table("groups")\
            .select("created_by")\
            .eq("id", group_id)\
            .single()\
            .execute()
        
        if not group.data or group.data["created_by"] != user_id:
            return False
        
        self.client.table("groups").delete().eq("id", group_id).execute()
        return True
    
    # =====================================================
    # MEMBERS
    # =====================================================
    
    async def get_members(self, group_id: str, user_id: str):
        """Get all members of a group"""
        # Verify membership
        membership = self.client.table("group_members")\
            .select("*")\
            .eq("group_id", group_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not membership.data:
            return None
        
        members = self.client.table("group_members")\
            .select("*")\
            .eq("group_id", group_id)\
            .order("joined_at")\
            .execute()
        
        # Fetch user profiles (safely - table may not exist)
        if members.data:
            user_ids = [m["user_id"] for m in members.data]
            profile_map = fetch_user_profiles(self.client, user_ids)
            
            for member in members.data:
                member["user"] = profile_map.get(member["user_id"])
        
        return members.data
    
    async def add_members(self, group_id: str, user_id: str, members_to_add: list):
        """Add members to group"""
        # Verify admin or check settings
        membership = self.client.table("group_members")\
            .select("role")\
            .eq("group_id", group_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not membership.data:
            return None
        
        group = self.client.table("groups")\
            .select("only_admins_can_add_members")\
            .eq("id", group_id)\
            .single()\
            .execute()
        
        if group.data["only_admins_can_add_members"] and membership.data["role"] != "admin":
            return None
        
        # Add members
        members_data = [
            {
                "group_id": group_id,
                "user_id": m["user_id"],
                "role": m.get("role", "member"),
                "added_by": user_id
            }
            for m in members_to_add
        ]
        
        result = self.client.table("group_members")\
            .upsert(members_data, on_conflict="group_id,user_id")\
            .execute()
        
        return result.data
    
    async def update_member(self, group_id: str, user_id: str, target_user_id: str, **updates):
        """Update member (self or admin)"""
        # If updating self, allow mute/notifications
        # If admin, allow role changes
        membership = self.client.table("group_members")\
            .select("role")\
            .eq("group_id", group_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not membership.data:
            return None
        
        # Filter allowed updates
        if user_id == target_user_id:
            # Self-update: only mute/notifications
            allowed = {k: v for k, v in updates.items() if k in ["is_muted", "notifications_enabled"]}
        elif membership.data["role"] == "admin":
            # Admin: can change role
            allowed = updates
        else:
            return None
        
        if not allowed:
            return None
        
        result = self.client.table("group_members")\
            .update(allowed)\
            .eq("group_id", group_id)\
            .eq("user_id", target_user_id)\
            .execute()
        
        return result.data[0] if result.data else None
    
    async def remove_member(self, group_id: str, user_id: str, target_user_id: str):
        """Remove member (self or admin)"""
        membership = self.client.table("group_members")\
            .select("role")\
            .eq("group_id", group_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not membership.data:
            return False
        
        # Can remove self or if admin
        if user_id != target_user_id and membership.data["role"] != "admin":
            return False
        
        self.client.table("group_members")\
            .delete()\
            .eq("group_id", group_id)\
            .eq("user_id", target_user_id)\
            .execute()
        
        return True
    
    # =====================================================
    # MESSAGES
    # =====================================================
    
    async def get_messages(self, group_id: str, user_id: str, limit: int = 50, before: str = None):
        """Get messages for a group"""
        # Verify membership
        membership = self.client.table("group_members")\
            .select("*")\
            .eq("group_id", group_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not membership.data:
            return None
        
        query = self.client.table("group_messages")\
            .select("*")\
            .eq("group_id", group_id)\
            .eq("is_deleted", False)\
            .order("created_at", desc=True)\
            .limit(limit + 1)  # +1 to check if there are more
        
        if before:
            query = query.lt("created_at", before)
        
        messages = query.execute()
        
        has_more = len(messages.data) > limit if messages.data else False
        result = messages.data[:limit] if messages.data else []
        
        # Fetch sender profiles (safely - table may not exist)
        if result:
            sender_ids = list(set(m["sender_id"] for m in result))
            profile_map = fetch_user_profiles(self.client, sender_ids)
            
            for msg in result:
                msg["sender"] = profile_map.get(msg["sender_id"])
        
        return result, has_more
    
    async def send_message(self, group_id: str, user_id: str, content: str, message_type: str = "text", **kwargs):
        """Send a message to group"""
        # Verify membership and check messaging permissions
        membership = self.client.table("group_members")\
            .select("role")\
            .eq("group_id", group_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not membership.data:
            return None
        
        group = self.client.table("groups")\
            .select("only_admins_can_message")\
            .eq("id", group_id)\
            .single()\
            .execute()
        
        if group.data["only_admins_can_message"] and membership.data["role"] != "admin":
            return None
        
        message_data = {
            "group_id": group_id,
            "sender_id": user_id,
            "content": content,
            "message_type": message_type,
            **{k: v for k, v in kwargs.items() if v is not None}
        }
        
        result = self.client.table("group_messages")\
            .insert(message_data)\
            .execute()
        
        # Update group updated_at
        self.client.table("groups")\
            .update({"updated_at": "now()"})\
            .eq("id", group_id)\
            .execute()
        
        if result.data:
            # Fetch sender profile using the fallback-aware function
            profile_map = fetch_user_profiles(self.client, [user_id])
            result.data[0]["sender"] = profile_map.get(user_id)
        
        return result.data[0] if result.data else None
    
    async def edit_message(self, message_id: str, user_id: str, content: str):
        """Edit own message"""
        result = self.client.table("group_messages")\
            .update({
                "content": content,
                "is_edited": True,
                "edited_at": "now()"
            })\
            .eq("id", message_id)\
            .eq("sender_id", user_id)\
            .execute()
        
        return result.data[0] if result.data else None
    
    async def delete_message(self, message_id: str, user_id: str, for_everyone: bool = False):
        """Delete message"""
        result = self.client.table("group_messages")\
            .update({
                "is_deleted": True,
                "deleted_at": "now()",
                "deleted_for_everyone": for_everyone
            })\
            .eq("id", message_id)\
            .eq("sender_id", user_id)\
            .execute()
        
        return bool(result.data)
    
    # =====================================================
    # INVITE LINKS
    # =====================================================
    
    async def get_invite_link(self, group_id: str, user_id: str):
        """Get invite link for group"""
        membership = self.client.table("group_members")\
            .select("role")\
            .eq("group_id", group_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not membership.data or membership.data["role"] != "admin":
            return None
        
        group = self.client.table("groups")\
            .select("invite_code, invite_link_enabled")\
            .eq("id", group_id)\
            .single()\
            .execute()
        
        if not group.data or not group.data["invite_link_enabled"]:
            return None
        
        return group.data["invite_code"]
    
    async def regenerate_invite(self, group_id: str, user_id: str):
        """Regenerate invite code"""
        membership = self.client.table("group_members")\
            .select("role")\
            .eq("group_id", group_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not membership.data or membership.data["role"] != "admin":
            return None
        
        # Generate new code
        import random
        import string
        chars = string.ascii_letters + string.digits
        new_code = ''.join(random.choices(chars, k=8))
        
        result = self.client.table("groups")\
            .update({"invite_code": new_code})\
            .eq("id", group_id)\
            .execute()
        
        return new_code if result.data else None
    
    async def join_via_invite(self, invite_code: str, user_id: str):
        """Join group via invite code"""
        group = self.client.table("groups")\
            .select("*")\
            .eq("invite_code", invite_code)\
            .eq("invite_link_enabled", True)\
            .single()\
            .execute()
        
        if not group.data:
            return None, "Invalid or disabled invite link"
        
        # Check if already member
        existing = self.client.table("group_members")\
            .select("id")\
            .eq("group_id", group.data["id"])\
            .eq("user_id", user_id)\
            .execute()
        
        if existing.data:
            return group.data, "already_member"
        
        # Check member limit
        count = self.client.table("group_members")\
            .select("id", count="exact")\
            .eq("group_id", group.data["id"])\
            .execute()
        
        if count.count >= group.data["max_members"]:
            return None, "Group is full"
        
        # Add member
        self.client.table("group_members").insert({
            "group_id": group.data["id"],
            "user_id": user_id,
            "role": "member"
        }).execute()
        
        # System message (get profile safely - table may not exist)
        profile_map = fetch_user_profiles(self.client, [user_id])
        profile = profile_map.get(user_id)
        
        name = profile.get("full_name") if profile else "Someone"
        
        self.client.table("group_messages").insert({
            "group_id": group.data["id"],
            "sender_id": user_id,
            "content": f"{name} joined via invite link",
            "message_type": "system"
        }).execute()
        
        return group.data, None
    
    # =====================================================
    # TYPING INDICATORS
    # =====================================================
    
    async def set_typing(self, group_id: str, user_id: str):
        """Set user as typing"""
        self.client.table("group_typing_indicators")\
            .upsert({
                "group_id": group_id,
                "user_id": user_id,
                "started_at": "now()"
            }, on_conflict="group_id,user_id")\
            .execute()
    
    async def clear_typing(self, group_id: str, user_id: str):
        """Clear typing indicator"""
        self.client.table("group_typing_indicators")\
            .delete()\
            .eq("group_id", group_id)\
            .eq("user_id", user_id)\
            .execute()
    
    async def get_typing_users(self, group_id: str, user_id: str):
        """Get users currently typing"""
        # Verify membership
        membership = self.client.table("group_members")\
            .select("*")\
            .eq("group_id", group_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not membership.data:
            return []
        
        # Get typing users (started within last 5 seconds)
        from datetime import datetime, timedelta
        cutoff = (datetime.utcnow() - timedelta(seconds=5)).isoformat()
        
        result = self.client.table("group_typing_indicators")\
            .select("user_id, started_at")\
            .eq("group_id", group_id)\
            .neq("user_id", user_id)\
            .gt("started_at", cutoff)\
            .execute()
        
        if not result.data:
            return []
        
        # Get user names (safely - table may not exist)
        user_ids = [t["user_id"] for t in result.data]
        profile_map = fetch_user_profiles(self.client, user_ids)
        
        return [
            {"user_id": t["user_id"], "full_name": profile_map.get(t["user_id"], {}).get("full_name", "Someone")}
            for t in result.data
        ]
    
    # =====================================================
    # USER SEARCH
    # =====================================================
    
    async def search_users(self, query: str, group_id: str = None, limit: int = 20):
        """Search users (for adding to groups)"""
        try:
            result = self.client.table("profiles")\
                .select("id, full_name, email, avatar_url")\
                .or_(f"full_name.ilike.%{query}%,email.ilike.%{query}%")\
                .limit(limit)\
                .execute()
            
            if not result.data:
                return []
            
            # If group_id provided, exclude existing members
            if group_id:
                members = self.client.table("group_members")\
                    .select("user_id")\
                    .eq("group_id", group_id)\
                    .execute()
                
                member_ids = {m["user_id"] for m in members.data} if members.data else set()
                result.data = [u for u in result.data if u["id"] not in member_ids]
            
            return result.data
        except Exception as e:
            # Profiles table may not exist
            error_str = str(e)
            if "PGRST205" in error_str or "Could not find" in error_str:
                print(f"Warning: profiles table not found - search will return empty")
                return []
            raise


# Dependency for routes
async def get_db(user_id: str = None):
    return Database(user_id)
