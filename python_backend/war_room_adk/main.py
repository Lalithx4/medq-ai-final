"""
War Room ADK FastAPI Backend
Google ADK-powered multi-agent medical decision support
"""
import asyncio
import json
import time
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google.adk.sessions import Session

from .config import Config
from .models import (
    TeamDiscussionRequest,
    BrokerQueryRequest,
    FollowUpRequest,
    PatientCase,
)
from .coordinator import create_coordinator_agent, create_triage_agent
from .consensus import create_consensus_engine, create_emergency_fast_track
from .agents import SPECIALIST_AGENTS
from .agents import get_specialist


# Initialize FastAPI
app = FastAPI(
    title="War Room ADK",
    version="1.0.0",
    description="Google ADK-powered Medical Decision Support System"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Utility Functions
# ============================================================================

def format_patient_case(case: PatientCase) -> str:
    """Format patient case for agent consumption"""
    parts = [f"CHIEF COMPLAINT: {case.chiefComplaint}"]
    
    if case.history:
        parts.append(f"HISTORY: {case.history}")
    
    if case.vitals:
        vitals_str = ", ".join([
            f"{k}: {v}" for k, v in case.vitals.dict().items() if v
        ])
        parts.append(f"VITALS: {vitals_str}")
    
    if case.labs:
        labs_str = "\n".join([
            f"  - {lab.name}: {lab.value} {lab.unit} ({lab.status})"
            for lab in case.labs
        ])
        parts.append(f"LABS:\n{labs_str}")
    
    if case.imaging:
        parts.append(f"IMAGING: {case.imaging}")
    
    if case.medications:
        parts.append(f"MEDICATIONS: {', '.join(case.medications)}")
    
    if case.allergies:
        parts.append(f"ALLERGIES: {', '.join(case.allergies)}")
    
    if case.pmh:
        parts.append(f"PMH: {', '.join(case.pmh)}")
    
    return "\n\n".join(parts)


def send_sse_event(event_type: str, data: dict) -> str:
    """Format Server-Sent Event"""
    event_data = {
        "type": event_type,
        "data": data,
        "timestamp": int(time.time() * 1000)
    }
    return f"data: {json.dumps(event_data)}\n\n"


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "War Room ADK",
        "status": "operational",
        "adk_version": "1.20.0",
        "specialists": len(SPECIALIST_AGENTS),
        "specialist_list": list(SPECIALIST_AGENTS.keys()),
        "agents": {
            "coordinator": "LlmAgent with transfer_to_agent",
            "specialists": len(SPECIALIST_AGENTS),
            "consensus": "SequentialAgent pipeline (4 stages)",
            "emergency_fast_track": "enabled"
        }
    }


@app.post("/war-room/team-discussion")
async def team_discussion(request: TeamDiscussionRequest):
    """
    Main team discussion endpoint - uses ADK coordinator with delegation
    """
    async def generate_events() -> AsyncGenerator[str, None]:
        try:
            yield send_sse_event("status", {"message": "🏥 War Room session initiated..."})
            
            # Step 1: Triage
            yield send_sse_event("status", {"message": "🚨 Triaging case urgency..."})
            triage_agent = create_triage_agent()
            session = Session(
                id=f"war-room-{int(time.time())}",
                appName="WarRoomADK",
                userId="system"
            )
            
            case_text = format_patient_case(request.case)
            
            # Run triage
            triage_result = await triage_agent.run_async(
                case_text,
                session=session
            )
            
            # Extract urgency from triage response
            urgency = "ROUTINE"  # Default
            if "EMERGENCY" in triage_result.text:
                urgency = "EMERGENCY"
            elif "URGENT" in triage_result.text:
                urgency = "URGENT"
            
            yield send_sse_event("triage", {
                "urgency": urgency,
                "assessment": triage_result.text
            })
            
            # Step 2: Route to Coordinator
            if urgency == "EMERGENCY":
                yield send_sse_event("status", {"message": "⚡ EMERGENCY - Fast-tracking..."})
                # Use emergency fast-track agent
                emergency_agent = create_emergency_fast_track()
                result = await emergency_agent.run_async(
                    f"EMERGENCY CASE:\n{case_text}",
                    session=session
                )
                
                yield send_sse_event("emergency_response", {
                    "agent": "EmergencyFastTrack",
                    "response": result.text
                })
            else:
                # Use standard coordinator with delegation
                yield send_sse_event("status", {"message": "🎯 Routing to specialists..."})
                coordinator = create_coordinator_agent()
                
                # Run coordinator (will use transfer_to_agent internally)
                result = await coordinator.run_async(
                    f"CASE FOR REVIEW:\n{case_text}\n\nPlease analyze and transfer to appropriate specialists.",
                    session=session
                )
                
                yield send_sse_event("coordinator_response", {
                    "agent": "WarRoomCoordinator",
                    "response": result.text
                })
            
            # Step 3: Build Consensus (if multiple specialists involved)
            if urgency != "EMERGENCY":
                yield send_sse_event("status", {"message": "🤝 Building consensus..."})
                consensus_pipeline = create_consensus_engine()
                
                # Pass all specialist responses to consensus
                consensus_input = f"SPECIALIST RESPONSES:\n{result.text}"
                consensus_result = await consensus_pipeline.run_async(
                    consensus_input,
                    session=session
                )
                
                yield send_sse_event("consensus", {
                    "analysis": session.state.get("conflict_analysis", ""),
                    "diagnosis": session.state.get("unified_diagnosis", ""),
                    "action_plan": session.state.get("action_plan", ""),
                    "confidence": session.state.get("confidence_score", "")
                })
            
            yield send_sse_event("complete", {"message": "✅ War Room discussion complete"})
            
        except Exception as e:
            yield send_sse_event("error", {"message": str(e)})
    
    return StreamingResponse(generate_events(), media_type="text/event-stream")


@app.post("/war-room/broker-query")
async def broker_query(request: BrokerQueryRequest):
    """
    Direct query to a specific specialist
    """
    async def generate_events() -> AsyncGenerator[str, None]:
        try:
            yield send_sse_event("status", {"message": "🔍 Processing query..."})
            
            # Determine which specialist to use
            coordinator = create_coordinator_agent()
            session = Session(
                id=f"broker-{int(time.time())}",
                appName="WarRoomBroker",
                userId="system"
            )
            
            case_text = format_patient_case(request.context)
            query = f"PATIENT CONTEXT:\n{case_text}\n\nQUERY: {request.query}"
            
            result = await coordinator.run_async(query, session=session)
            
            yield send_sse_event("response", {
                "agent": "BrokerAgent",
                "response": result.text
            })
            
            yield send_sse_event("complete", {"message": "✅ Query complete"})
            
        except Exception as e:
            yield send_sse_event("error", {"message": str(e)})
    
    return StreamingResponse(generate_events(), media_type="text/event-stream")


@app.post("/war-room/follow-up")
async def follow_up(request: FollowUpRequest):
    """
    Follow-up question in ongoing discussion
    """
    async def generate_events() -> AsyncGenerator[str, None]:
        try:
            yield send_sse_event("status", {"message": "💬 Processing follow-up..."})
            
            # Use target agent if specified, otherwise use coordinator
            if request.targetAgent:
                agent = get_specialist(request.targetAgent)
            else:
                agent = create_coordinator_agent()
            
            session = Session(
                id=f"followup-{int(time.time())}",
                appName="WarRoomFollowUp",
                userId="system"
            )
            case_text = format_patient_case(request.context)
            
            # Build context with conversation history
            context = f"PATIENT CONTEXT:\n{case_text}\n\nPREVIOUS DISCUSSION:\n"
            for msg in request.conversationHistory[-3:]:  # Last 3 messages
                context += f"{msg.get('role', 'user')}: {msg.get('content', '')}\n"
            
            context += f"\nNEW QUESTION: {request.question}"
            
            result = await agent.run_async(context, session=session)
            
            yield send_sse_event("response", {
                "agent": agent.name,
                "response": result.text
            })
            
            yield send_sse_event("complete", {"message": "✅ Follow-up complete"})
            
        except Exception as e:
            yield send_sse_event("error", {"message": str(e)})
    
    return StreamingResponse(generate_events(), media_type="text/event-stream")


# ============================================================================
# Server Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "war_room_adk.main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=True
    )
