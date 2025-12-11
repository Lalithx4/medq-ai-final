"""
War Room Python Backend v2 - Robust SSE Streaming
Uses Cerebras Llama-3.3-70b for fast inference
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import time
import os
import asyncio
from dotenv import load_dotenv
import httpx

load_dotenv()

# Configure Cerebras
api_key = os.getenv("CEREBRAS_API_KEY")
if not api_key:
    raise ValueError("CEREBRAS_API_KEY not set")

CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
MODEL_NAME = "llama-3.3-70b"

async def call_cerebras(prompt: str, max_tokens: int = 2000) -> str:
    """Call Cerebras API with httpx."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                CEREBRAS_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": MODEL_NAME,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": 0.7
                }
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"] if data.get("choices") else "Analysis pending..."
    except Exception as e:
        print(f"Cerebras API Error: {e}")
        import traceback
        traceback.print_exc()
        return f"Error generating response: {str(e)}"

app = FastAPI(title="War Room Backend v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    conversationHistory: List[Dict[str, Any]] = []
    targetAgent: Optional[str] = None


# Medical Specialists with detailed prompts
SPECIALISTS = {
    "cardiology": {
        "name": "Cardiology Specialist",
        "prompt": "You are a board-certified Cardiologist. Analyze cardiac-related aspects: heart rhythm, cardiovascular risk, chest pain etiology, ECG implications, and cardiac enzyme interpretation."
    },
    "pulmonary": {
        "name": "Pulmonology Specialist", 
        "prompt": "You are a board-certified Pulmonologist. Analyze respiratory aspects: lung sounds, oxygen status, breathing patterns, chest imaging, pulmonary function, and respiratory infections."
    },
    "infectious": {
        "name": "Infectious Disease Specialist",
        "prompt": "You are a board-certified Infectious Disease specialist. Analyze infection markers: WBC, fever patterns, culture results, antibiotic selection, sepsis criteria, and source identification."
    },
    "gastro": {
        "name": "Gastroenterology Specialist",
        "prompt": "You are a board-certified Gastroenterologist. Analyze GI aspects: abdominal pain, liver function, biliary pathology, GI bleeding, and digestive disorders."
    },
    "lab_interpreter": {
        "name": "Laboratory Medicine Specialist",
        "prompt": "You are a Clinical Pathologist. Provide detailed lab interpretation: CBC, BMP, LFTs, inflammatory markers, coagulation studies, and their clinical significance."
    },
}


def build_case_summary(case: PatientCase) -> str:
    """Build comprehensive case summary for AI analysis."""
    summary = f"""
PATIENT CASE PRESENTATION
========================
Chief Complaint: {case.chiefComplaint}
"""
    if case.history:
        summary += f"\nHistory: {case.history}"
    
    if case.vitals:
        vitals_str = []
        if case.vitals.bp: vitals_str.append(f"BP: {case.vitals.bp}")
        if case.vitals.hr: vitals_str.append(f"HR: {case.vitals.hr}")
        if case.vitals.temp: vitals_str.append(f"Temp: {case.vitals.temp}")
        if case.vitals.rr: vitals_str.append(f"RR: {case.vitals.rr}")
        if case.vitals.spo2: vitals_str.append(f"SpO2: {case.vitals.spo2}")
        if vitals_str:
            summary += f"\nVitals: {', '.join(vitals_str)}"
    
    if case.labs:
        labs_str = [f"{lab.name}: {lab.value} {lab.unit} ({lab.status})" for lab in case.labs]
        summary += f"\nLaboratory Values:\n  " + "\n  ".join(labs_str)
    
    if case.imaging:
        summary += f"\nImaging: {case.imaging}"
    
    if case.medications:
        summary += f"\nMedications: {', '.join(case.medications)}"
    
    if case.allergies:
        summary += f"\nAllergies: {', '.join(case.allergies)}"
    
    if case.pmh:
        summary += f"\nPast Medical History: {', '.join(case.pmh)}"
    
    return summary


def select_specialists(case: PatientCase) -> List[str]:
    """Select relevant specialists based on case presentation."""
    specialists = []
    chief = case.chiefComplaint.lower()
    history = (case.history or "").lower()
    combined = chief + " " + history
    
    # Always include lab interpreter if labs present
    if case.labs:
        specialists.append("lab_interpreter")
    
    # Cardiac indicators
    if any(word in combined for word in ["chest pain", "cardiac", "heart", "palpitation", "ecg", "troponin", "mi", "angina"]):
        specialists.append("cardiology")
    
    # Pulmonary indicators
    if any(word in combined for word in ["cough", "breath", "dyspnea", "oxygen", "spo2", "lung", "pneumonia", "copd", "respiratory", "wheeze"]):
        specialists.append("pulmonary")
    
    # Infectious indicators
    if any(word in combined for word in ["fever", "infection", "sepsis", "wbc", "crp", "antibiotic", "culture", "bacteria"]):
        specialists.append("infectious")
    
    # GI indicators
    if any(word in combined for word in ["abdom", "nausea", "vomit", "liver", "bili", "ast", "alt", "gi", "gallbladder", "pancrea"]):
        specialists.append("gastro")
    
    # Default: at least 2 specialists
    if len(specialists) < 2:
        for spec in ["infectious", "pulmonary", "cardiology"]:
            if spec not in specialists:
                specialists.append(spec)
            if len(specialists) >= 3:
                break
    
    return specialists[:4]  # Max 4 specialists


def send_sse(event_type: str, data: Any) -> str:
    """Format SSE event."""
    payload = json.dumps({"type": event_type, "data": data, "timestamp": int(time.time() * 1000)})
    return f"data: {payload}\n\n"


async def generate_discussion(request: TeamDiscussionRequest):
    """Generate team discussion with real specialist analysis."""
    case_summary = build_case_summary(request.case)
    
    try:
        # Phase 1: Triage
        yield send_sse("phase_change", {"phase": "triage", "message": "Analyzing case severity..."})
        await asyncio.sleep(0.1)
        
        # Select specialists
        specialists = select_specialists(request.case)
        
        yield send_sse("orchestration_complete", {
            "relevantAgents": specialists,
            "urgencyLevel": request.urgency or "routine",
            "keyFindings": [],
        })
        await asyncio.sleep(0.1)
        
        # Phase 2: Opening statements
        yield send_sse("phase_change", {"phase": "opening", "message": "Specialists providing initial assessment..."})
        
        messages = []
        for idx, agent_id in enumerate(specialists):
            spec = SPECIALISTS.get(agent_id, SPECIALISTS["lab_interpreter"])
            
            yield send_sse("agent_thinking", {"agentId": agent_id, "agentName": spec["name"]})
            
            prompt = f"""{spec["prompt"]}

{case_summary}

Provide a focused clinical analysis (2-3 paragraphs):
1. Your key findings relevant to your specialty
2. Your differential diagnosis considerations
3. Recommended workup or interventions from your specialty perspective

Be specific and clinically actionable."""

            # Call Cerebras
            content = await call_cerebras(prompt)
            
            message = {
                "id": f"msg_{idx}_{int(time.time())}",
                "agentId": agent_id,
                "agentName": spec["name"],
                "content": content,
                "phase": "opening",
                "timestamp": int(time.time() * 1000),
                "confidence": 0.85,
                "reasoning": f"Based on {spec['name'].split()[0]} evaluation"
            }
            messages.append(message)
            
            yield send_sse("agent_message", {
                "message": message,
                "alerts": [],
                "recommendations": []
            })
            await asyncio.sleep(0.2)
        
        # Phase 3: Consensus
        yield send_sse("phase_change", {"phase": "consensus", "message": "Building interdisciplinary consensus..."})
        yield send_sse("consensus_building", {"progress": 50})
        
        # Build consensus prompt
        all_opinions = "\n\n".join([f"**{m['agentName']}:**\n{m['content']}" for m in messages])
        
        consensus_prompt = f"""You are the Chief Medical Officer synthesizing a multidisciplinary case review.

{case_summary}

SPECIALIST OPINIONS:
{all_opinions}

Provide a structured consensus:

1. **PRIMARY DIAGNOSIS** (most likely diagnosis with probability estimate)
2. **DIFFERENTIAL DIAGNOSES** (2-3 alternatives with reasoning)
3. **RISK ASSESSMENT** (Low/Moderate/High/Critical and why)
4. **IMMEDIATE ACTIONS** (prioritized next steps)
5. **KEY MONITORING PARAMETERS**

Be specific and actionable for the clinical team."""

        consensus_text = await call_cerebras(consensus_prompt)
        
        yield send_sse("consensus_building", {"progress": 100})
        
        # Parse for structured data
        risk_level = "moderate"
        if any(word in consensus_text.lower() for word in ["critical", "emergency", "immediate", "sepsis", "code"]):
            risk_level = "critical"
        elif any(word in consensus_text.lower() for word in ["high risk", "urgent", "serious"]):
            risk_level = "high"
        elif any(word in consensus_text.lower() for word in ["low risk", "stable", "benign"]):
            risk_level = "low"
        
        # Extract treatment actions from the response
        treatment_actions = []
        lines = consensus_text.split('\n')
        in_actions_section = False
        for line in lines:
            if 'IMMEDIATE ACTIONS' in line.upper() or 'TREATMENT PLAN' in line.upper():
                in_actions_section = True
                continue
            if in_actions_section and line.strip():
                # Extract numbered or bulleted items
                cleaned = line.strip().lstrip('0123456789.-*• ')
                if cleaned and len(cleaned) > 10:  # Reasonable action length
                    treatment_actions.append(cleaned)
                if len(treatment_actions) >= 5:  # Limit to 5 actions
                    break
        
        # If no actions found, create generic ones
        if not treatment_actions:
            treatment_actions = [
                "Review detailed consensus above",
                "Initiate immediate diagnostic workup",
                "Monitor vital signs closely",
                "Consult appropriate specialists"
            ]
        
        # Extract primary diagnosis
        primary_dx = "See detailed analysis"
        for line in lines:
            if 'PRIMARY DIAGNOSIS' in line.upper():
                idx = lines.index(line)
                if idx + 1 < len(lines):
                    primary_dx = lines[idx + 1].strip().lstrip('0123456789.-*• ')
                    if not primary_dx or len(primary_dx) < 10:
                        primary_dx = consensus_text.split('\n')[0][:200]
                break
        
        consensus = {
            "summary": consensus_text,
            "primaryDiagnosis": primary_dx,
            "differentialDiagnoses": [
                {"diagnosis": "See detailed analysis above", "probability": 0.75, "reasoning": "Based on specialist consensus"}
            ],
            "riskLevel": risk_level,
            "recommendedActions": treatment_actions,
            "confidence": 0.85,
            "participatingAgents": specialists,
        }
        
        yield send_sse("consensus_complete", {"consensus": consensus})
        yield send_sse("complete", {
            "totalMessages": len(messages),
            "agentsConsulted": specialists,
            "consensusReached": True
        })
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        yield send_sse("error", {"message": f"Error during consultation: {str(e)}"})


@app.post("/api/team-discussion")
async def team_discussion(request: TeamDiscussionRequest):
    """Stream team discussion."""
    return StreamingResponse(
        generate_discussion(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        }
    )


@app.post("/api/broker-query")
async def broker_query(request: BrokerQueryRequest):
    """Answer medical knowledge query."""
    case_summary = build_case_summary(request.context)
    
    prompt = f"""You are a medical research assistant with access to current clinical guidelines and literature.

Patient Context:
{case_summary}

Query: {request.query}

Provide an evidence-based response with:
1. Direct answer to the query
2. Relevant clinical guidelines or evidence
3. How this applies to the current case
4. Any important caveats or considerations"""

    content = await call_cerebras(prompt)
    
    return {
        "success": True,
        "message": {
            "id": f"broker_{int(time.time())}",
            "agentId": "broker",
            "agentName": "MedQ Research Broker",
            "content": content,
            "phase": "analysis",
            "timestamp": int(time.time() * 1000),
            "confidence": 0.85,
        }
    }


@app.post("/api/follow-up")
async def follow_up(request: FollowUpRequest):
    """Handle follow-up questions."""
    case_summary = build_case_summary(request.context)
    
    spec = SPECIALISTS.get(request.targetAgent, {"name": "Medical Specialist", "prompt": "You are a medical specialist."})
    
    prompt = f"""{spec["prompt"]}

Patient Context:
{case_summary}

Follow-up Question: {request.question}

Provide a detailed, clinically relevant response."""

    content = await call_cerebras(prompt)
    
    return {
        "success": True,
        "message": {
            "id": f"followup_{int(time.time())}",
            "agentId": request.targetAgent or "general",
            "agentName": spec["name"],
            "content": content,
            "phase": "analysis", 
            "timestamp": int(time.time() * 1000),
            "confidence": 0.85,
        }
    }


@app.get("/")
async def root():
    return {"status": "running", "version": "2.0", "model": "llama-3.3-70b"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    print("🏥 War Room Python Backend v2")
    print("📍 http://localhost:8000")
    print("🤖 Using Cerebras Llama-3.3-70b")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
