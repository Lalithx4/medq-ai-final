# Groups Backend - FastAPI Main Application
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import time

from config import settings
from routes import router as groups_router
from media_routes import router as media_router
from stream_routes import router as stream_router
from websocket_routes import router as websocket_router
from enhanced_routes import router as enhanced_router

# Configure logging with DEBUG level
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("🚀 Groups Backend starting up...")
    logger.info(f"   Supabase URL: {settings.supabase_url[:30]}...")
    logger.info(f"   Wasabi configured: {bool(settings.wasabi_access_key)}")
    yield
    logger.info("👋 Groups Backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title="BioDocs AI - Groups Backend",
    description="WhatsApp-like group management system with real-time chat",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Skip logging for WebSocket upgrades
    if request.headers.get("upgrade", "").lower() == "websocket":
        return await call_next(request)
    
    start_time = time.time()
    logger.debug(f"➡️  {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    logger.debug(f"⬅️  {request.method} {request.url.path} - {response.status_code} ({duration:.3f}s)")
    
    return response


# Include routers
app.include_router(groups_router)
app.include_router(media_router)
app.include_router(stream_router)
app.include_router(websocket_router)
app.include_router(enhanced_router)


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "groups-backend",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    return {
        "message": "BioDocs AI Groups Backend",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )
