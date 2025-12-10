# Media Upload Routes
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from auth import get_current_user, AuthUser
from database import Database
from storage import get_storage, WasabiStorage
import logging
from PIL import Image
import io

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/groups", tags=["media"])


def get_db():
    return Database()


# Allowed file types
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOC_TYPES = {"application/pdf", "application/msword", 
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                     "text/plain", "text/csv"}
ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/ogg"}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


def get_file_type(mime_type: str) -> str:
    """Determine file type category"""
    if mime_type in ALLOWED_IMAGE_TYPES:
        return "image"
    elif mime_type in ALLOWED_DOC_TYPES:
        return "document"
    elif mime_type in ALLOWED_AUDIO_TYPES:
        return "audio"
    elif mime_type in ALLOWED_VIDEO_TYPES:
        return "video"
    return "document"


def create_thumbnail(image_data: bytes, max_size: tuple = (200, 200)) -> bytes:
    """Create thumbnail for image"""
    try:
        img = Image.open(io.BytesIO(image_data))
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=80)
        return output.getvalue()
    except Exception as e:
        logger.error(f"Thumbnail creation error: {e}")
        return None


@router.post("/{group_id}/media")
async def upload_media(
    group_id: str,
    file: UploadFile = File(...),
    message_id: Optional[str] = Form(None),
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db),
    storage: WasabiStorage = Depends(get_storage)
):
    """Upload media file to group"""
    try:
        # Verify membership
        members = await db.get_members(group_id, user.id)
        if members is None:
            raise HTTPException(status_code=403, detail="Not a member of this group")
        
        # Check storage configuration
        if not storage.is_configured():
            raise HTTPException(status_code=503, detail="Storage not configured")
        
        # Read file
        content = await file.read()
        file_size = len(content)
        
        # Validate file size
        content_type = file.content_type or "application/octet-stream"
        if content_type in ALLOWED_IMAGE_TYPES and file_size > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail="Image too large (max 10MB)")
        elif file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large (max 50MB)")
        
        # Validate file type
        all_allowed = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES | ALLOWED_AUDIO_TYPES | ALLOWED_VIDEO_TYPES
        if content_type not in all_allowed:
            raise HTTPException(status_code=415, detail=f"File type not allowed: {content_type}")
        
        # Upload to Wasabi
        file_key, file_url = await storage.upload_file(
            file_data=content,
            user_id=user.id,
            filename=file.filename or "file",
            content_type=content_type,
            folder=f"groups/{group_id}"
        )
        
        # Get image dimensions if image
        width, height = None, None
        thumbnail_url = None
        
        if content_type in ALLOWED_IMAGE_TYPES:
            try:
                img = Image.open(io.BytesIO(content))
                width, height = img.size
                
                # Create and upload thumbnail
                thumbnail_data = create_thumbnail(content)
                if thumbnail_data:
                    thumb_key, thumbnail_url = await storage.upload_file(
                        file_data=thumbnail_data,
                        user_id=user.id,
                        filename=f"thumb_{file.filename}",
                        content_type="image/jpeg",
                        folder=f"groups/{group_id}/thumbnails"
                    )
            except Exception as e:
                logger.error(f"Image processing error: {e}")
        
        # Save to database
        file_type = get_file_type(content_type)
        
        result = db.client.table("group_media").insert({
            "group_id": group_id,
            "message_id": message_id,
            "uploaded_by": user.id,
            "file_name": file.filename,
            "file_url": file_url,
            "file_key": file_key,
            "file_type": file_type,
            "mime_type": content_type,
            "file_size": file_size,
            "width": width,
            "height": height,
            "thumbnail_url": thumbnail_url
        }).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to save media record")
        
        return {
            "success": True,
            "media": result.data[0]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload media error: {e}")
        return {"success": False, "error": str(e)}


@router.get("/{group_id}/media")
async def list_media(
    group_id: str,
    file_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """List media files in group"""
    try:
        # Verify membership
        members = await db.get_members(group_id, user.id)
        if members is None:
            raise HTTPException(status_code=403, detail="Not a member of this group")
        
        query = db.client.table("group_media")\
            .select("*")\
            .eq("group_id", group_id)\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)
        
        if file_type:
            query = query.eq("file_type", file_type)
        
        result = query.execute()
        
        return {
            "success": True,
            "media": result.data or [],
            "has_more": len(result.data) == limit if result.data else False
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List media error: {e}")
        return {"success": False, "error": str(e), "media": []}


@router.delete("/{group_id}/media/{media_id}")
async def delete_media(
    group_id: str,
    media_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db),
    storage: WasabiStorage = Depends(get_storage)
):
    """Delete media file"""
    try:
        # Get media record
        media = db.client.table("group_media")\
            .select("*")\
            .eq("id", media_id)\
            .eq("group_id", group_id)\
            .single()\
            .execute()
        
        if not media.data:
            raise HTTPException(status_code=404, detail="Media not found")
        
        # Check ownership
        if media.data["uploaded_by"] != user.id:
            # Check if admin
            membership = db.client.table("group_members")\
                .select("role")\
                .eq("group_id", group_id)\
                .eq("user_id", user.id)\
                .single()\
                .execute()
            
            if not membership.data or membership.data["role"] != "admin":
                raise HTTPException(status_code=403, detail="Not authorized")
        
        # Delete from storage
        if media.data.get("file_key"):
            await storage.delete_file(media.data["file_key"])
        
        # Delete from database
        db.client.table("group_media")\
            .delete()\
            .eq("id", media_id)\
            .execute()
        
        return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete media error: {e}")
        return {"success": False, "error": str(e)}


@router.get("/{group_id}/media/{media_id}/download")
async def get_download_url(
    group_id: str,
    media_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Database = Depends(get_db),
    storage: WasabiStorage = Depends(get_storage)
):
    """Get signed download URL for media"""
    try:
        # Verify membership
        members = await db.get_members(group_id, user.id)
        if members is None:
            raise HTTPException(status_code=403, detail="Not a member of this group")
        
        # Get media record
        media = db.client.table("group_media")\
            .select("file_key, file_name")\
            .eq("id", media_id)\
            .eq("group_id", group_id)\
            .single()\
            .execute()
        
        if not media.data or not media.data.get("file_key"):
            raise HTTPException(status_code=404, detail="Media not found")
        
        # Get signed URL
        signed_url = await storage.get_signed_url(media.data["file_key"], expires_in=3600)
        
        return {
            "success": True,
            "download_url": signed_url,
            "file_name": media.data["file_name"],
            "expires_in": 3600
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get download URL error: {e}")
        return {"success": False, "error": str(e)}
