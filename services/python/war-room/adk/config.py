"""
Configuration for War Room ADK
"""
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


class Config:
    """War Room Configuration"""
    
    # API Keys
    GOOGLE_AI_API_KEY: str = os.getenv("GOOGLE_AI_API_KEY", os.getenv("GOOGLE_GENERATIVE_AI_API_KEY", ""))
    CEREBRAS_API_KEY: str = os.getenv("CEREBRAS_API_KEY", "")
    
    # Model Configuration
    USE_CEREBRAS: bool = bool(CEREBRAS_API_KEY)  # Auto-detect
    PRIMARY_MODEL: str = "cerebras/llama-3.3-70b" if USE_CEREBRAS else "gemini-2.5-flash"
    FALLBACK_MODEL: str = "gemini-2.5-flash"  # Gemini
    
    # Agent Settings
    TEMPERATURE: float = 0.3
    MAX_TOKENS: int = 8192
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    ALLOWED_ORIGINS: list = ["http://localhost:3000"]
    
    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration"""
        if not cls.CEREBRAS_API_KEY and not cls.GOOGLE_AI_API_KEY:
            raise ValueError("Either CEREBRAS_API_KEY or GOOGLE_AI_API_KEY must be set")
        return True


# Validate on import
Config.validate()
