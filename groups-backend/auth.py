# Authentication Utilities
from fastapi import HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from config import settings
from typing import Optional
from supabase import create_client
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

DEBUG = True


class AuthUser:
    """Authenticated user from JWT"""
    def __init__(self, user_id: str, email: Optional[str] = None, role: str = "authenticated"):
        self.id = user_id
        self.email = email
        self.role = role
        if DEBUG:
            logger.debug(f"[AUTH] User authenticated: {user_id} ({email})")


def decode_token_with_supabase(token: str) -> dict:
    """Verify token using Supabase client"""
    try:
        if DEBUG:
            logger.debug(f"[AUTH] Verifying token with Supabase...")
        
        # Use Supabase client to verify the token
        supabase = create_client(settings.supabase_url, settings.supabase_key)
        
        # Get user from token
        user_response = supabase.auth.get_user(token)
        
        if user_response and user_response.user:
            user = user_response.user
            if DEBUG:
                logger.debug(f"[AUTH] Token verified, user: {user.id}")
            return {
                "sub": user.id,
                "email": user.email,
                "role": "authenticated"
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid token")
            
    except Exception as e:
        logger.error(f"[AUTH] Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


def decode_token(token: str) -> dict:
    """Decode and verify Supabase JWT - tries JWT secret first, then Supabase client"""
    # If JWT secret is available, use it for faster verification
    if settings.jwt_secret:
        try:
            if DEBUG:
                logger.debug(f"[AUTH] Decoding token with JWT secret...")
            
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
                audience="authenticated"
            )
            
            if DEBUG:
                logger.debug(f"[AUTH] Token decoded, sub: {payload.get('sub')}")
            
            return payload
        except JWTError as e:
            logger.warning(f"[AUTH] JWT decode failed, trying Supabase client: {e}")
    
    # Fallback to Supabase client verification
    return decode_token_with_supabase(token)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthUser:
    """Get current authenticated user from JWT"""
    token = credentials.credentials
    
    if DEBUG:
        logger.debug("[AUTH] get_current_user called")
    
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "authenticated")
        
        if not user_id:
            logger.error("[AUTH] No user_id in token payload")
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        return AuthUser(user_id=user_id, email=email, role=role)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[AUTH] Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


async def get_optional_user(
    authorization: Optional[str] = Header(None)
) -> Optional[AuthUser]:
    """Get user if authenticated, None otherwise"""
    if not authorization:
        return None
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "authenticated")
        
        if user_id:
            return AuthUser(user_id=user_id, email=email, role=role)
    except:
        pass
    
    return None
