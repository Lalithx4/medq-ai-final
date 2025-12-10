# Groups Backend Configuration
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from parent directory (main project)
parent_env = Path(__file__).parent.parent / ".env"
if parent_env.exists():
    load_dotenv(parent_env)
else:
    load_dotenv()  # Fallback to current directory


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra='ignore')  # Ignore extra env vars
    
    # Supabase
    supabase_url: str = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""))
    supabase_key: str = os.getenv("SUPABASE_ANON_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # JWT
    jwt_secret: str = os.getenv("SUPABASE_JWT_SECRET", "")
    jwt_algorithm: str = "HS256"
    
    # Wasabi S3
    wasabi_access_key: str = os.getenv("WASABI_ACCESS_KEY_ID", "")
    wasabi_secret_key: str = os.getenv("WASABI_SECRET_ACCESS_KEY", "")
    wasabi_bucket: str = os.getenv("WASABI_BUCKET_NAME", "dataextract")
    wasabi_region: str = os.getenv("WASABI_REGION", "ap-northeast-2")
    wasabi_endpoint: str = os.getenv("WASABI_ENDPOINT", "https://s3.ap-northeast-2.wasabisys.com")
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    
    # CORS
    cors_origins: list = ["http://localhost:3000", "http://localhost:3001", "https://biodocs.ai"]


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
