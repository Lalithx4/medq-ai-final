"""
Minimal War Room ADK Server Test
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="War Room ADK - Minimal Test")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {
        "status": "ok",
        "service": "War Room ADK",
        "version": "1.0.0"
    }

@app.get("/test-imports")
async def test_imports():
    try:
        from war_room_adk.config import Config
        from war_room_adk.models import PatientCase
        return {
            "status": "success",
            "cerebras_enabled": Config.USE_CEREBRAS,
            "model": Config.PRIMARY_MODEL
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
