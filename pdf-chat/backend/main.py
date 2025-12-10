"""
FastAPI Backend for Medical RAG System
Integrates with existing medicalrag.py
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Import the medical RAG system (FastAPI version)
from medicalrag_fastapi import MedicalDocumentChat, Citation
from auth_middleware import APIKeyMiddleware

# Initialize FastAPI app
app = FastAPI(
    title="Medical RAG API",
    description="Medical Document Intelligence System with RAG",
    version="1.0.0"
)

# API Key Authentication Middleware (FIRST - before CORS)
app.add_middleware(APIKeyMiddleware)

# CORS middleware for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global RAG system instance
rag_system: Optional[MedicalDocumentChat] = None

# =====================================================
# Pydantic Models
# =====================================================

class ChatRequest(BaseModel):
    query: str
    document_id: Optional[str] = None
    user_id: Optional[str] = None  # ✓ Add user_id
    k: int = 5

class ProcessRequest(BaseModel):
    document_id: str
    file_path: str  # Local file path instead of URL
    filename: str
    user_id: str

class ChatResponse(BaseModel):
    answer: str
    citations: List[Dict[str, Any]]
    confidence: float
    processing_time: float

class DocumentInfo(BaseModel):
    document_id: str
    filename: str
    file_type: str
    file_size: int
    upload_date: str
    num_chunks: int
    num_entities: int

class SupabaseConfig(BaseModel):
    url: str
    key: str

# =====================================================
# Startup/Shutdown Events
# =====================================================

@app.on_event("startup")
async def startup_event():
    """Initialize RAG system on startup - lightweight for Railway"""
    global rag_system
    
    print("🚀 Starting Medical RAG API...")
    print("⚡ Using lazy-loading for ML models to reduce startup memory")
    
    try:
        # Create RAG system but DON'T load models yet
        rag_system = MedicalDocumentChat()
        
        # Only initialize Supabase connection (lightweight)
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if supabase_url and supabase_key:
            print(f"✅ Supabase URL configured: {supabase_url[:30]}...")
            # Initialize Supabase only (no ML models yet)
            rag_system._initialize_supabase()
        else:
            print("⚠️ No Supabase credentials - local mode only")
        
        print("✅ API ready! Models will load on first request.")
            
    except Exception as e:
        print(f"❌ Startup error: {e}")
        import traceback
        traceback.print_exc()
        # Create empty system to prevent crashes
        rag_system = MedicalDocumentChat()

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("Shutting down Medical RAG System...")

# =====================================================
# API Endpoints
# =====================================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Medical RAG API",
        "version": "1.0.0",
        "status": "running",
        "supabase_connected": rag_system.supabase is not None if rag_system else False
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "rag_initialized": rag_system is not None,
        "supabase_connected": rag_system.supabase is not None if rag_system else False,
        "embedding_model_loaded": rag_system.embedding_model is not None if rag_system else False
    }

@app.post("/api/pdf-chat/configure-supabase")
async def configure_supabase(config: SupabaseConfig):
    """Configure Supabase connection"""
    if not rag_system:
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    try:
        success = rag_system.initialize_supabase(config.url, config.key)
        return {
            "success": success,
            "message": "Supabase configured successfully" if success else "Failed to connect to Supabase"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Configuration error: {str(e)}")

@app.post("/api/pdf-chat/process")
async def process_document(request: ProcessRequest):
    """Process a document from local file path"""
    if not rag_system:
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    try:
        import time
        
        start_time = time.time()
        
        # Lazy load models on first request (saves startup memory)
        if not rag_system.embedding_model:
            print("🔄 First request detected - loading ML models...")
            success = rag_system.initialize_models()
            if not success:
                raise HTTPException(status_code=500, detail="Failed to initialize ML models")
            print("✅ Models loaded successfully!")
        
        # Read PDF from local file path
        try:
            with open(request.file_path, 'rb') as f:
                file_content = f.read()
        except FileNotFoundError:
            raise HTTPException(status_code=400, detail=f"File not found: {request.file_path}")
        
        # Process the document with the provided document_id
        result = rag_system.process_document_from_supabase(
            document_id=request.document_id,
            file_content=file_content,
            filename=request.filename,
            user_id=request.user_id
        )
        
        processing_time = time.time() - start_time
        
        if result['success']:
            return {
                "success": True,
                "document_id": request.document_id,
                "filename": request.filename,
                "num_chunks": result['num_chunks'],
                "num_entities": result.get('num_entities', 0),
                "processing_time": round(processing_time, 2),
                "message": "Document processed successfully"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=result.get('error', 'Unknown error during processing')
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Process error: {str(e)}")

@app.post("/api/pdf-chat/chat", response_model=ChatResponse)
async def chat_with_documents(request: ChatRequest):
    """Chat with uploaded documents"""
    if not rag_system:
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    try:
        import time
        start_time = time.time()
        
        # Perform hybrid search
        search_results = rag_system.hybrid_search(
            query=request.query,
            k=request.k,
            user_id=request.user_id,  # ✓ Pass user_id
            document_id=request.document_id  # ✓ Pass document_id
        )
        
        if not search_results:
            return ChatResponse(
                answer="I couldn't find relevant information in the uploaded documents. Please try rephrasing your question or upload more relevant documents.",
                citations=[],
                confidence=0.0,
                processing_time=round(time.time() - start_time, 2)
            )
        
        # Generate answer with citations
        answer, citations, confidence = rag_system.generate_answer_with_citations(
            query=request.query,
            search_results=search_results
        )
        
        processing_time = time.time() - start_time
        
        # Convert Citation objects to dicts
        citations_dict = [
            {
                "source_id": c.source_id,
                "document_name": c.document_name,
                "page_number": c.page_number,
                "confidence_score": c.confidence_score,
                "text_excerpt": c.text_excerpt
            }
            for c in citations
        ]
        
        return ChatResponse(
            answer=answer,
            citations=citations_dict,
            confidence=confidence,
            processing_time=round(processing_time, 2)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@app.get("/api/pdf-chat/documents")
async def list_documents():
    """List all uploaded documents"""
    if not rag_system:
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    try:
        documents = rag_system.get_user_documents()
        
        # If Supabase not available, return from session state
        if not documents:
            # Try to get from local storage
            import streamlit as st
            if hasattr(st, 'session_state') and 'local_documents' in st.session_state:
                documents = list(st.session_state.local_documents.values())
        
        return {
            "documents": documents,
            "count": len(documents)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching documents: {str(e)}")

@app.delete("/api/pdf-chat/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document"""
    if not rag_system:
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    try:
        success = rag_system.delete_document(document_id)
        
        if success:
            return {"message": "Document deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete error: {str(e)}")

@app.get("/api/pdf-chat/stats")
async def get_statistics():
    """Get database statistics"""
    if not rag_system:
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    try:
        stats = rag_system.get_database_stats()
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")

@app.get("/api/pdf-chat/system-info")
async def get_system_info():
    """Get system information"""
    if not rag_system:
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    return {
        "embedding_model": "NeuML/pubmedbert-base-embeddings",
        "chunk_size": rag_system.chunk_size,
        "chunk_overlap": rag_system.chunk_overlap,
        "supabase_connected": rag_system.supabase is not None,
        "local_storage_path": rag_system.local_storage_path,
        "models_initialized": rag_system.embedding_model is not None
    }

# =====================================================
# Error Handlers
# =====================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "path": str(request.url)
        }
    )

# =====================================================
# Run with: uvicorn main:app --reload --port 8000
# =====================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
