"""
War Room Python Backend - Simplified Version
Uses Gemini directly instead of complex agent system
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import time
import os
import asyncio
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

app = FastAPI(title="War Room Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini
api_key = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")
gemini = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=api_key,
    temperature=0.3,
)


# Models
class LabValue(BaseModel):
    name: str
    value: str
    unit: str
    status: str


class Vitals(BaseModel):
    bp: Optional[str] = None
    hr: Optional[str] = None
    temp: Optional[str] = None
    rr: Optional[str] = None
    spo2: Optional[str] = None


class PatientCase(BaseModel):
    chiefComplaint: str
    history: Optional[str] = None
    vitals: Optional[Vitals] = None
    labs: Optional[List[LabValue]] = None
    imaging: Optional[str] = None
    medications: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    pmh: Optional[List[str]] = None


class TeamDiscussionRequest(BaseModel):
    case: PatientCase
    urgency: Optional[str] = "routine"
    focusArea: Optional[str] = None


class BrokerQueryRequest(BaseModel):
    query: str
    context: PatientCase


class FollowUpRequest(BaseModel):
    question: str
    context: PatientCase
    conversationHistory: List[Dict[str, Any]]
    targetAgent: Optional[str] = None


# Medical Specialists
SPECIALISTS = {
    "cardiology": "Cardiology Specialist - Expert in cardiovascular medicine",
    "infectious": "Infectious Disease Specialist - Expert in infections",
    "pulmonary": "Pulmonology Specialist - Expert in respiratory conditions",
    "neurology": "Neurology Specialist - Expert in neurological conditions",
    "lab_interpreter": "Lab Medicine Specialist - Expert in laboratory interpretation",
}


async def generate_events(request: TeamDiscussionRequest):
    """Generate SSE events for team discussion."""
    
    def send_event(event_type: str, data: Any):
        event_str = f"data: {json.dumps({'type': event_type, 'data': data, 'timestamp': int(time.time() * 1000)})}\n\n"
        return event_str.encode('utf-8')
    
    def send_heartbeat():
        return ": heartbeat\n\n".encode('utf-8')
    
    try:
        # Phase 1: Triage
        yield send_event("phase_change", {"phase": "triage", "message": "Analyzing case..."})
        yield send_heartbeat()
        
        # Build case summary
        case_text = f"Chief Complaint: {request.case.chiefComplaint}\n"
        if request.case.history:
            case_text += f"History: {request.case.history}\n"
        if request.case.vitals:
            case_text += f"Vitals: BP={request.case.vitals.bp}, HR={request.case.vitals.hr}\n"
        
        # Select specialists
        relevant_agents = ["cardiology", "infectious", "lab_interpreter"][:3]
        
        yield send_event("orchestration_complete", {
            "relevantAgents": relevant_agents,
            "urgencyLevel": request.urgency,
        })
        yield send_heartbeat()
        
        # Phase 2: Team Discussion
        yield send_event("phase_change", {"phase": "opening", "message": "Specialists analyzing..."})
        
        messages = []
        for idx, agent_id in enumerate(relevant_agents):
            specialist_name = SPECIALISTS[agent_id]
            
            yield send_event("agent_thinking", {"agentId": agent_id, "agentName": specialist_name})
            
            prompt = f"You are {specialist_name}. Analyze this patient case and provide your clinical opinion:\n\n{case_text}"
            
            # Synchronous call to avoid async issues
            response = await asyncio.to_thread(gemini.invoke, prompt)
            
            message = {
                "id": f"msg_{idx}",
                "agentId": agent_id,
                "agentName": specialist_name,
                "content": response.content,
                "phase": "opening",
                "timestamp": int(time.time() * 1000),
                "confidence": 0.85,
            }
            messages.append(message)
            
            yield send_event("agent_message", {"message": message, "alerts": [], "recommendations": []})
            yield send_heartbeat()
            await asyncio.sleep(0.1)  # Small delay
        
        # Phase 3: Consensus
        yield send_event("phase_change", {"phase": "consensus", "message": "Building consensus..."})
        yield send_heartbeat()
        
        consensus_prompt = f"Based on these specialist opinions, provide a consensus:\n"
        for msg in messages:
            consensus_prompt += f"\n{msg['agentName']}: {msg['content'][:200]}..."
        
        consensus_response = await asyncio.to_thread(gemini.invoke, consensus_prompt)
        
        consensus = {
            "summary": consensus_response.content,
            "differentialDiagnoses": [
                {"diagnosis": "Primary diagnosis (from AI)", "probability": 0.7, "reasoning": "Based on clinical presentation"}
            ],
            "riskLevel": "moderate",
            "recommendedActions": ["Further evaluation recommended"],
            "confidence": 0.8,
        }
        
        yield send_event("consensus_complete", {"consensus": consensus})
        yield send_heartbeat()
        yield send_event("complete", {"totalMessages": len(messages), "agentsConsulted": relevant_agents})
        
    except Exception as e:
        print(f"Error in generate_events: {e}")
        import traceback
        traceback.print_exc()
        yield send_event("error", {"message": str(e)})


@app.post("/api/team-discussion")
async def team_discussion(request: TeamDiscussionRequest):
    async def event_generator():
        try:
            async for event in generate_events(request):
                yield event
        except Exception as e:
            print(f"Stream error: {e}")
            error_event = f"data: {json.dumps({'type': 'error', 'data': {'message': str(e)}, 'timestamp': int(time.time() * 1000)})}\n\n"
            yield error_event.encode('utf-8')
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/broker-query")
async def broker_query(request: BrokerQueryRequest):
    prompt = f"Medical knowledge query: {request.query}\nContext: {request.context.chiefComplaint}"
    response = gemini.invoke(prompt)
    
    return {
        "success": True,
        "message": {
            "id": "broker_msg",
            "agentId": "broker",
            "agentName": "Knowledge Broker",
            "content": response.content,
            "phase": "analysis",
            "timestamp": int(time.time() * 1000),
            "confidence": 0.85,
        },
    }


@app.post("/api/follow-up")
async def follow_up(request: FollowUpRequest):
    agent_name = SPECIALISTS.get(request.targetAgent, "Medical Specialist")
    prompt = f"As {agent_name}, answer: {request.question}\nContext: {request.context.chiefComplaint}"
    response = gemini.invoke(prompt)
    
    return {
        "success": True,
        "message": {
            "id": "followup_msg",
            "agentId": request.targetAgent or "general",
            "agentName": agent_name,
            "content": response.content,
            "timestamp": int(time.time() * 1000),
            "confidence": 0.85,
        },
    }


@app.get("/")
async def root():
    return {"status": "running", "backend": "python-gemini", "specialists": len(SPECIALISTS)}


if __name__ == "__main__":
    import uvicorn
    print("🏥 War Room Python Backend (Gemini-powered)")
    print("📍 http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
