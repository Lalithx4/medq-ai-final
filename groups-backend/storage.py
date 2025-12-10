# Wasabi S3 Storage Client
import boto3
from botocore.config import Config
from config import settings
from typing import Optional, Tuple
import uuid
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class WasabiStorage:
    """Wasabi S3-compatible storage client"""
    
    def __init__(self):
        self.client = boto3.client(
            's3',
            endpoint_url=settings.wasabi_endpoint,
            aws_access_key_id=settings.wasabi_access_key,
            aws_secret_access_key=settings.wasabi_secret_key,
            region_name=settings.wasabi_region,
            config=Config(signature_version='s3v4')
        )
        self.bucket = settings.wasabi_bucket
    
    def is_configured(self) -> bool:
        """Check if Wasabi is properly configured"""
        return bool(
            settings.wasabi_access_key and 
            settings.wasabi_secret_key and 
            settings.wasabi_bucket
        )
    
    def generate_key(self, user_id: str, filename: str, folder: str = "groups") -> str:
        """Generate unique storage key"""
        now = datetime.utcnow()
        unique_id = str(uuid.uuid4())[:8]
        # Sanitize filename
        safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in filename)
        return f"{folder}/{user_id}/{now.year}/{now.month:02d}/{unique_id}_{safe_name}"
    
    async def upload_file(
        self, 
        file_data: bytes, 
        user_id: str, 
        filename: str,
        content_type: str = "application/octet-stream",
        folder: str = "groups"
    ) -> Tuple[str, str]:
        """
        Upload file to Wasabi
        Returns: (file_key, file_url)
        """
        key = self.generate_key(user_id, filename, folder)
        
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_data,
                ContentType=content_type,
                Metadata={
                    "user-id": user_id,
                    "original-filename": filename,
                    "uploaded-at": datetime.utcnow().isoformat()
                }
            )
            
            url = f"{settings.wasabi_endpoint}/{self.bucket}/{key}"
            return key, url
            
        except Exception as e:
            logger.error(f"Wasabi upload error: {e}")
            raise
    
    async def get_signed_url(self, key: str, expires_in: int = 3600) -> str:
        """Get presigned URL for private file access"""
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': key},
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            logger.error(f"Signed URL error: {e}")
            raise
    
    async def delete_file(self, key: str) -> bool:
        """Delete file from Wasabi"""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception as e:
            logger.error(f"Wasabi delete error: {e}")
            return False
    
    async def get_file_info(self, key: str) -> Optional[dict]:
        """Get file metadata"""
        try:
            response = self.client.head_object(Bucket=self.bucket, Key=key)
            return {
                "size": response.get("ContentLength", 0),
                "content_type": response.get("ContentType", "application/octet-stream"),
                "last_modified": response.get("LastModified"),
                "metadata": response.get("Metadata", {})
            }
        except Exception as e:
            logger.error(f"File info error: {e}")
            return None


# Singleton
storage = WasabiStorage()


def get_storage() -> WasabiStorage:
    return storage
