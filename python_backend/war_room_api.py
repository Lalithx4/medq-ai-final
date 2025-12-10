"""
War Room Python Backend Service
FastAPI server that uses Gemini directly (simpler than integrating complex agent system)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import json
import sys
import time
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import Gemini
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

app = FastAPI(title="War Room Medical AI Backend", version="1.0.0")

# CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini
api_key = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_GENERATIVE_AI_API_KEY not found in environment")

gemini = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=api_key,
    temperature=0.3,
)


# Request/Response Models
class LabValue(BaseModel):
    name: str
    value: str
    unit: str
    status: str  # normal, low, high, critical


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
    excludeAgents: Optional[List[str]] = None


class BrokerQueryRequest(BaseModel):
    query: str
    context: PatientCase
    conversationHistory: Optional[List[Dict[str, Any]]] = None


class FollowUpRequest(BaseModel):
    question: str
    context: PatientCase
    conversationHistory: List[Dict[str, Any]]
    targetAgent: Optional[str] = None


# SSE Event Generator
async def generate_discussion_events(request: TeamDiscussionRequest):
    """Generate Server-Sent Events for team discussion."""
    import time
    
    def send_event(event_type: str, data: Any):
        """Format SSE event."""
        return f"data: {json.dumps({'type': event_type, 'data': data, 'timestamp': int(time.time() * 1000)})}\n\n"
    
    try:
        # Phase 1: Triage & Orchestration
        yield send_event("phase_change", {
            "phase": "triage",
            "message": "Analyzing case and identifying specialists..."
        })
        
        # Build patient context
        patient_data = {
            "chief_complaint": request.case.chiefComplaint,
            "history": request.case.history,
            "vitals": request.case.vitals.dict() if request.case.vitals else {},
            "labs": [lab.dict() for lab in request.case.labs] if request.case.labs else [],
            "imaging": request.case.imaging,
            "medications": request.case.medications or [],
            "allergies": request.case.allergies or [],
            "pmh": request.case.pmh or [],
        }
        
        # Use orchestrator to identify relevant specialists
        orchestrator = coordinator.agents.get("orchestrator")
        if orchestrator:
            orchestration = await orchestrator.process(
                query=request.case.chiefComplaint,
                patient_data=patient_data
            )
            
            # Parse orchestrator response to get recommended specialists
            relevant_agents = parse_orchestrator_response(orchestration.content)
            
            yield send_event("orchestration_complete", {
                "relevantAgents": relevant_agents,
                "urgencyLevel": request.urgency,
                "keyFindings": [],
                "initialAssessment": orchestration.content
            })
        else:
            # Fallback: use default specialists
            relevant_agents = ["cardiology", "infectious", "lab_interpreter"]
            yield send_event("orchestration_complete", {
                "relevantAgents": relevant_agents,
                "urgencyLevel": request.urgency,
                "keyFindings": [],
                "initialAssessment": "Analyzing case..."
            })
        
        # Filter excluded agents
        if request.excludeAgents:
            relevant_agents = [a for a in relevant_agents if a not in request.excludeAgents]
        
        # Limit to 5 agents for manageable discussion
        relevant_agents = relevant_agents[:5]
        
        # Phase 2: Team Discussion
        yield send_event("phase_change", {
            "phase": "opening",
            "message": "Specialists providing initial impressions..."
        })
        
        messages = []
        
        # Get responses from each specialist
        for agent_id in relevant_agents:
            agent = coordinator.agents.get(agent_id)
            if not agent:
                continue
            
            yield send_event("agent_thinking", {
                "agentId": agent_id,
                "agentName": agent.specialty
            })
            
            # Get agent response
            response = await agent.process(
                query=request.case.chiefComplaint,
                patient_data=patient_data,
                context={"phase": "opening", "previous_messages": messages}
            )
            
            message = {
                "id": f"msg_{len(messages)}",
                "agentId": agent_id,
                "agentName": agent.specialty,
                "content": response.content,
                "phase": "opening",
                "timestamp": int(time.time() * 1000),
                "confidence": response.confidence,
                "reasoning": response.reasoning
            }
            messages.append(message)
            
            yield send_event("agent_message", {
                "message": message,
                "alerts": [] if not response.is_emergency else ["EMERGENCY INDICATORS DETECTED"],
                "recommendations": response.recommendations
            })
            
            await asyncio.sleep(0.3)  # Small delay for readability
        
        # Phase 3: Analysis (top 3 agents go deeper)
        yield send_event("phase_change", {
            "phase": "analysis",
            "message": "Specialists analyzing in detail..."
        })
        
        for agent_id in relevant_agents[:3]:
            agent = coordinator.agents.get(agent_id)
            if not agent:
                continue
            
            yield send_event("agent_thinking", {
                "agentId": agent_id,
                "agentName": agent.specialty
            })
            
            response = await agent.process(
                query=request.case.chiefComplaint,
                patient_data=patient_data,
                context={"phase": "analysis", "previous_messages": messages}
            )
            
            message = {
                "id": f"msg_{len(messages)}",
                "agentId": agent_id,
                "agentName": agent.specialty,
                "content": response.content,
                "phase": "analysis",
                "timestamp": int(time.time() * 1000),
                "confidence": response.confidence,
                "reasoning": response.reasoning
            }
            messages.append(message)
            
            yield send_event("agent_message", {
                "message": message,
                "alerts": [],
                "recommendations": response.recommendations,
                "needsMoreInfo": []
            })
            
            await asyncio.sleep(0.3)
        
        # Phase 4: Consensus Building
        yield send_event("phase_change", {
            "phase": "consensus",
            "message": "Building consensus..."
        })
        
        yield send_event("consensus_building", {"progress": 50})
        
        # Build consensus from all responses
        consensus = build_consensus(messages, patient_data)
        
        yield send_event("consensus_building", {"progress": 100})
        yield send_event("consensus_complete", {"consensus": consensus})
        
        yield send_event("complete", {
            "totalMessages": len(messages),
            "agentsConsulted": relevant_agents,
            "consensus": consensus
        })
        
    except Exception as e:
        yield send_event("error", {"message": str(e)})


def parse_orchestrator_response(content: str) -> List[str]:
    """Parse orchestrator response to extract recommended specialists."""
    # Map common specialties to agent IDs
    specialty_map = {
        "cardiology": "cardiology",
        "cardiac": "cardiology",
        "heart": "cardiology",
        "neurology": "neurology",
        "neuro": "neurology",
        "brain": "neurology",
        "pulmonology": "pulmonology",
        "lung": "pulmonology",
        "respiratory": "pulmonology",
        "hepatology": "hepatology",
        "liver": "hepatology",
        "gastroenterology": "gastroenterology",
        "gi": "gastroenterology",
        "digestive": "gastroenterology",
        "nephrology": "nephrology",
        "kidney": "nephrology",
        "renal": "nephrology",
        "infectious": "infectious",
        "infection": "infectious",
        "lab": "lab_interpreter",
        "radiology": "radiology",
        "imaging": "radiology",
    }
    
    content_lower = content.lower()
    identified = set()
    
    for keyword, agent_id in specialty_map.items():
        if keyword in content_lower:
            identified.add(agent_id)
    
    return list(identified) if identified else ["cardiology", "infectious", "lab_interpreter"]


def build_consensus(messages: List[Dict], patient_data: Dict) -> Dict:
    """Build consensus from agent responses."""
    # Extract diagnoses and recommendations
    all_recommendations = []
    high_confidence_diagnoses = []
    
    for msg in messages:
        if msg.get("confidence", 0) > 0.7:
            # High confidence message
            content = msg.get("content", "")
            if any(word in content.lower() for word in ["diagnosis", "likely", "suggests", "indicates"]):
                high_confidence_diagnoses.append({
                    "diagnosis": content[:200],  # First 200 chars
                    "agent": msg.get("agentName"),
                    "confidence": msg.get("confidence")
                })
    
    # Primary diagnosis is the highest confidence one
    primary = high_confidence_diagnoses[0]["diagnosis"] if high_confidence_diagnoses else "Assessment pending"
    
    return {
        "primaryDiagnosis": primary,
        "differentialDiagnoses": [
            {
                "diagnosis": d["diagnosis"],
                "probability": d["confidence"],
                "supportingAgents": [d["agent"]]
            }
            for d in high_confidence_diagnoses[:3]
        ],
        "recommendedActions": all_recommendations[:5],
        "urgentAlerts": [],
        "disagreements": [],
        "confidence": sum(d["confidence"] for d in high_confidence_diagnoses) / len(high_confidence_diagnoses) if high_confidence_diagnoses else 0.5,
        "timestamp": asyncio.get_event_loop().time() * 1000
    }


# API Endpoints
@app.get("/")
async def root():
    return {
        "service": "War Room Medical AI Backend",
        "version": "1.0.0",
        "agents_loaded": len(coordinator.agents),
        "status": "operational"
    }


@app.post("/api/team-discussion")
async def team_discussion(request: TeamDiscussionRequest):
    """Stream team discussion using SSE."""
    return StreamingResponse(
        generate_discussion_events(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.post("/api/broker-query")
async def broker_query(request: BrokerQueryRequest):
    """Answer a knowledge query."""
    try:
        # Use research agent for broker queries
        research_agent = coordinator.agents.get("research_agent")
        if not research_agent:
            raise HTTPException(status_code=500, detail="Research agent not available")
        
        patient_data = {
            "chief_complaint": request.context.chiefComplaint,
            "history": request.context.history,
        }
        
        response = await research_agent.process(
            query=request.query,
            patient_data=patient_data
        )
        
        return {
            "success": True,
            "message": {
                "id": "broker_msg",
                "agentId": "broker",
                "agentName": "Knowledge Broker",
                "content": response.content,
                "phase": "analysis",
                "timestamp": int(time.time() * 1000),
                "confidence": response.confidence
            },
            "alerts": [],
            "recommendations": response.recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/follow-up")
async def follow_up(request: FollowUpRequest):
    """Handle follow-up question."""
    try:
        target_agent_id = request.targetAgent or "orchestrator"
        agent = coordinator.agents.get(target_agent_id)
        
        if not agent:
            raise HTTPException(status_code=400, detail="Invalid agent specified")
        
        patient_data = {
            "chief_complaint": request.context.chiefComplaint,
            "history": request.context.history,
        }
        
        response = await agent.process(
            query=request.question,
            patient_data=patient_data,
            context={"conversation_history": request.conversationHistory}
        )
        
        return {
            "success": True,
            "message": {
                "id": "followup_msg",
                "agentId": target_agent_id,
                "agentName": agent.specialty,
                "content": response.content,
                "phase": "analysis",
                "timestamp": int(time.time() * 1000),
                "confidence": response.confidence,
                "reasoning": response.reasoning
            },
            "alerts": [],
            "recommendations": response.recommendations,
            "needsMoreInfo": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
