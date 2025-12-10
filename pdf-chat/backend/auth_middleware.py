"""
API Key Authentication Middleware for FastAPI
Ensures only authorized Next.js app can communicate with the backend
"""

import os
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Load API secret key from environment
API_SECRET_KEY = os.getenv("API_SECRET_KEY")

class APIKeyMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate API key in request headers
    """
    
    async def dispatch(self, request: Request, call_next):
        # Skip auth for health check and docs endpoints
        if request.url.path in ["/health", "/", "/docs", "/openapi.json", "/redoc"]:
            return await call_next(request)
        
        # Get API key from header
        api_key = request.headers.get("X-API-Key")
        
        # Validate API key
        if not api_key:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "Missing API key. Include X-API-Key header."}
            )
        
        if api_key != API_SECRET_KEY:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"error": "Invalid API key"}
            )
        
        # API key is valid, proceed with request
        response = await call_next(request)
        return response
