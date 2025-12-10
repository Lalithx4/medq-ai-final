"""
Clinical Decision Support System (CDSS) Python Backend
Enhanced with deep research, natural discussions, and specialist consultations
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

# Tavily API for deep research (optional)
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

async def call_cerebras(prompt: str, system_prompt: str = "", max_tokens: int = 2000) -> str:
    """Call Cerebras API with httpx."""
    try:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                CEREBRAS_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": MODEL_NAME,
                    "messages": messages,
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
        return f"I apologize, but I encountered an error processing this request. Please try again."


async def search_medical_literature(query: str) -> Dict[str, Any]:
    """Search medical literature using Tavily or fallback to AI knowledge."""
    try:
        if TAVILY_API_KEY:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": TAVILY_API_KEY,
                        "query": f"medical {query} clinical guidelines treatment",
                        "search_depth": "advanced",
                        "include_domains": ["pubmed.ncbi.nlm.nih.gov", "uptodate.com", "ncbi.nlm.nih.gov", "who.int", "cdc.gov"],
                        "max_results": 5
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "results": data.get("results", []),
                        "sources": [r.get("url", "") for r in data.get("results", [])]
                    }
    except Exception as e:
        print(f"Tavily search error: {e}")
    
    # Fallback: Use AI to provide evidence-based information
    research_prompt = f"""As a medical research assistant with access to current clinical guidelines and medical literature, provide evidence-based information on:

{query}

Include:
1. Current clinical guidelines and recommendations
2. Key evidence from major studies
3. Standard of care protocols
4. Important clinical pearls
5. Recent updates or changes in management

Be specific and cite guideline sources where applicable (e.g., ACC/AHA, IDSA, etc.)."""

    content = await call_cerebras(research_prompt)
    return {
        "success": True,
        "content": content,
        "sources": ["Clinical knowledge base", "Standard guidelines"]
    }


app = FastAPI(title="CDSS Backend")

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
    unit: str = ""
    status: str = "normal"


class PatientCase(BaseModel):
    chiefComplaint: str
    history: Optional[str] = None
    labs: Optional[List[LabValue]] = None
    imaging: Optional[str] = None
    medications: Optional[List[str]] = None
    allergies: Optional[List[str]] = None


class DiscussRequest(BaseModel):
    case: PatientCase
    specialists: List[str]
    type: str = "initial"


class ChatRequest(BaseModel):
    message: str
    case: PatientCase
    targetSpecialist: Optional[str] = None
    conversationHistory: List[Dict[str, Any]] = []
    differentials: List[Dict[str, Any]] = []


class ResearchRequest(BaseModel):
    query: Optional[str] = None
    message: Optional[str] = None
    case: Optional[PatientCase] = None


# Legacy war room request model for backward compatibility
class TeamDiscussionRequest(BaseModel):
    case: PatientCase
    urgency: Optional[str] = "routine"
    focusArea: Optional[str] = None


# Specialist definitions with detailed prompts
SPECIALISTS = {
    "gastro": {
        "name": "Dr. Maria Garcia",
        "title": "Gastroenterologist",
        "prompt": """You are Dr. Maria Garcia, a board-certified Gastroenterologist with 15 years of experience. 
You specialize in GI disorders, hepatology, biliary disease, and pancreatitis.
Communicate naturally as a colleague in a clinical discussion. Share your clinical reasoning, 
ask clarifying questions when needed, and provide differential diagnoses specific to your expertise.
Be conversational but professional. Don't give final recommendations - this is an ongoing discussion."""
    },
    "cardio": {
        "name": "Dr. Sarah Chen",
        "title": "Cardiologist",
        "prompt": """You are Dr. Sarah Chen, a board-certified Cardiologist specializing in ACS, heart failure, and arrhythmias.
You have extensive experience in interventional cardiology and critical care.
Engage naturally in clinical discussions, share your perspective on cardiac involvement,
and consider how cardiac conditions might interact with other organ systems.
Be conversational and collaborative. This is a professional discussion, not a final verdict."""
    },
    "pulmo": {
        "name": "Dr. James Wilson",
        "title": "Pulmonologist",
        "prompt": """You are Dr. James Wilson, a Pulmonologist with expertise in COPD, pneumonia, ARDS, and pulmonary embolism.
You have ICU experience and understand ventilator management.
Discuss respiratory aspects naturally, consider infection vs non-infectious etiologies,
and think about the interplay between respiratory and other systems.
Engage as a colleague sharing thoughts, not giving final orders."""
    },
    "infect": {
        "name": "Dr. Lisa Park",
        "title": "Infectious Disease Specialist",
        "prompt": """You are Dr. Lisa Park, an Infectious Disease specialist with expertise in sepsis, antimicrobial stewardship, and hospital infections.
Consider source control, antibiotic selection, and resistance patterns.
Discuss infection markers and help differentiate infectious from non-infectious presentations.
Be collaborative and think about empiric vs targeted therapy.
Share your reasoning as part of an ongoing team discussion."""
    },
    "nephro": {
        "name": "Dr. Ahmed Hassan",
        "title": "Nephrologist",
        "prompt": """You are Dr. Ahmed Hassan, a Nephrologist specializing in AKI, CKD, electrolyte disorders, and dialysis.
Evaluate renal function, drug dosing, and fluid/electrolyte management.
Consider pre-renal, intrinsic, and post-renal causes of kidney dysfunction.
Discuss your findings naturally as part of the clinical team.
This is a collaborative discussion, share your expertise conversationally."""
    },
    "neuro": {
        "name": "Dr. Robert Thompson",
        "title": "Neurologist",
        "prompt": """You are Dr. Robert Thompson, a Neurologist with expertise in stroke, seizures, encephalopathy, and neuromuscular disorders.
Evaluate neurological presentations, localize lesions, and consider metabolic vs structural causes.
Discuss altered mental status, focal deficits, and when imaging is indicated.
Engage as a colleague sharing clinical reasoning and differential considerations."""
    },
    "radio": {
        "name": "Dr. Emily Roberts",
        "title": "Radiologist",
        "prompt": """You are Dr. Emily Roberts, a Radiologist with expertise in CT, MRI, ultrasound, and interventional procedures.
Help interpret imaging findings and suggest appropriate imaging workup.
Consider radiation exposure, contrast risks, and imaging timing.
Discuss findings conversationally and suggest additional views or modalities when appropriate."""
    },
    "lab": {
        "name": "Dr. Kevin Wright",
        "title": "Laboratory Medicine Specialist",
        "prompt": """You are Dr. Kevin Wright, a Laboratory Medicine specialist with expertise in lab interpretation, biomarkers, and pathology.
Help interpret complex lab patterns, suggest additional tests, and identify critical values.
Consider pre-analytical factors, reference ranges, and trending values.
Share your interpretation as part of the clinical discussion, not as final diagnoses."""
    },
    "pharma": {
        "name": "Dr. Rachel Kim",
        "title": "Clinical Pharmacist",
        "prompt": """You are Dr. Rachel Kim, a Clinical Pharmacist with expertise in drug interactions, dosing, and antimicrobial stewardship.
Evaluate medication safety, renal/hepatic dosing, and potential interactions.
Suggest therapeutic drug monitoring and optimize regimens.
Engage as a team member providing pharmaceutical perspective in the discussion."""
    },
}


def build_case_summary(case: PatientCase) -> str:
    """Build comprehensive case summary."""
    summary = f"""
PATIENT PRESENTATION
====================
Chief Complaint: {case.chiefComplaint}
"""
    if case.history:
        summary += f"\nMedical History: {case.history}"
    
    if case.labs:
        labs_str = [f"{lab.name}: {lab.value} {lab.unit} ({lab.status})" for lab in case.labs]
        summary += f"\n\nLaboratory Values:\n  " + "\n  ".join(labs_str)
    
    if case.imaging:
        summary += f"\n\nImaging: {case.imaging}"
    
    if case.medications:
        summary += f"\n\nCurrent Medications: {', '.join(case.medications)}"
    
    if case.allergies:
        summary += f"\n\nAllergies: {', '.join(case.allergies)}"
    
    return summary


def send_sse(event_type: str, data: Any) -> str:
    """Format SSE event."""
    payload = json.dumps({"type": event_type, "data": data, "timestamp": int(time.time() * 1000)})
    return f"data: {payload}\n\n"


async def generate_discussion(request: DiscussRequest):
    """Generate initial multi-specialist discussion."""
    case_summary = build_case_summary(request.case)
    
    try:
        yield send_sse("system_message", {"message": "Starting clinical consultation..."})
        await asyncio.sleep(0.1)
        
        # Generate differential diagnoses first
        ddx_prompt = f"""Based on this patient presentation, provide 4-5 differential diagnoses with probability estimates.

{case_summary}

Format as JSON array:
[{{"diagnosis": "name", "probability": 0.X, "reasoning": "brief reasoning", "supportingFindings": ["finding1", "finding2"], "contraindicators": ["against1"]}}]

Only output the JSON array, nothing else."""

        ddx_response = await call_cerebras(ddx_prompt)
        try:
            # Try to parse JSON from response
            import re
            json_match = re.search(r'\[.*\]', ddx_response, re.DOTALL)
            if json_match:
                differentials = json.loads(json_match.group())
                yield send_sse("differential_update", {"differentials": differentials})
        except:
            pass

        await asyncio.sleep(0.1)

        # Generate suggested workup
        workup_prompt = f"""Based on this presentation, what diagnostic workup should be considered?

{case_summary}

List 5-7 specific tests or studies in order of priority. Just list them, one per line."""

        workup_response = await call_cerebras(workup_prompt, max_tokens=500)
        workup_items = [line.strip().lstrip('0123456789.-•* ') for line in workup_response.split('\n') if line.strip() and len(line.strip()) > 5]
        if workup_items:
            yield send_sse("workup_suggestion", {"workup": workup_items[:7]})

        # Each specialist provides natural input
        for specialist_id in request.specialists:
            spec = SPECIALISTS.get(specialist_id)
            if not spec:
                continue
            
            yield send_sse("specialist_thinking", {"specialistId": specialist_id})
            await asyncio.sleep(0.2)
            
            discussion_prompt = f"""{case_summary}

You're in a multidisciplinary team discussion about this patient. Share your initial thoughts and observations from your specialty's perspective.

Keep it conversational and natural - like you're thinking out loud with colleagues. 
- What catches your attention?
- What's your initial impression?
- What would you want to know more about?
- Any concerns from your specialty's viewpoint?

Be concise but thorough (2-3 paragraphs). Don't give final diagnoses - we're still discussing."""

            content = await call_cerebras(discussion_prompt, system_prompt=spec["prompt"])
            
            yield send_sse("specialist_message", {
                "specialistId": specialist_id,
                "content": content,
                "confidence": 0.75,
            })
            await asyncio.sleep(0.3)
        
        yield send_sse("system_message", {"message": "Initial assessments complete. You can now ask questions or discuss further with specific specialists."})
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        yield send_sse("system_message", {"message": f"Error during consultation: {str(e)}"})


@app.post("/api/cdss/discuss")
async def cdss_discuss(request: DiscussRequest):
    """Start multi-specialist discussion."""
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


@app.post("/api/cdss/chat")
async def cdss_chat(request: ChatRequest):
    """Handle ongoing chat with board or specific specialist."""
    case_summary = build_case_summary(request.case)
    
    # Build conversation context
    conv_context = ""
    if request.conversationHistory:
        recent = request.conversationHistory[-5:]  # Last 5 messages
        conv_lines = []
        for msg in recent:
            role = msg.get("specialistId", msg.get("type", "user"))
            content = msg.get("content", "")[:200]
            conv_lines.append(f"{role}: {content}")
        conv_context = "\n".join(conv_lines)
    
    # Build differential context
    ddx_context = ""
    if request.differentials:
        ddx_lines = [f"- {d['diagnosis']} ({d.get('probability', 0)*100:.0f}%)" for d in request.differentials[:4]]
        ddx_context = "Current working differentials:\n" + "\n".join(ddx_lines)
    
    if request.targetSpecialist:
        # Chat with specific specialist
        spec = SPECIALISTS.get(request.targetSpecialist, SPECIALISTS["lab"])
        
        prompt = f"""Patient Case:
{case_summary}

{ddx_context}

Recent Discussion:
{conv_context}

The attending physician asks: {request.message}

Respond naturally as {spec['name']}, addressing their question from your specialty's perspective.
Be conversational, share your reasoning, and feel free to ask clarifying questions if needed."""

        content = await call_cerebras(prompt, system_prompt=spec["prompt"])
        
        return {
            "success": True,
            "response": {
                "specialistId": request.targetSpecialist,
                "content": content,
                "confidence": 0.8,
            }
        }
    else:
        # Board discussion - moderator synthesizes or routes question
        prompt = f"""Patient Case:
{case_summary}

{ddx_context}

Recent Discussion:
{conv_context}

The attending asks the board: {request.message}

As the discussion moderator, either:
1. Synthesize what the team has discussed so far if they're asking for a summary
2. Provide a thoughtful response addressing their question
3. Suggest which specialist might best answer if it's specialty-specific

Be helpful and keep the discussion productive."""

        content = await call_cerebras(prompt, system_prompt="You are a clinical discussion moderator helping facilitate a multidisciplinary team discussion. Keep things focused and productive.")
        
        return {
            "success": True,
            "response": {
                "specialistId": "moderator",
                "content": content,
                "confidence": 0.75,
            }
        }


@app.post("/api/cdss/research")
async def cdss_research(request: ResearchRequest):
    """Deep research endpoint for evidence-based information."""
    query = request.query or request.message or ""
    query = query.replace("@research", "").strip()
    
    if not query:
        return {"success": False, "error": "No query provided"}
    
    # Add case context to query if available
    if request.case:
        context = f"Patient context: {request.case.chiefComplaint}"
        if request.case.history:
            context += f" History: {request.case.history}"
        query = f"{query} (Context: {context})"
    
    result = await search_medical_literature(query)
    
    if result.get("results"):
        # Format Tavily results
        formatted_content = []
        for r in result["results"][:5]:
            formatted_content.append(f"**{r.get('title', 'Source')}**\n{r.get('content', '')[:300]}...")
        content = "\n\n".join(formatted_content)
    else:
        content = result.get("content", "No results found")
    
    return {
        "success": True,
        "content": content,
        "sources": result.get("sources", [])
    }


# Keep existing war room endpoints for backward compatibility
@app.post("/api/team-discussion")
async def team_discussion(request: TeamDiscussionRequest):
    """Legacy endpoint - auto-detects relevant specialists and redirects to CDSS discuss."""
    # Auto-detect relevant specialists based on case content
    labs_str = ""
    if request.case.labs:
        labs_str = " ".join([f"{lab.name} {lab.value}" for lab in request.case.labs])
    case_text = f"{request.case.chiefComplaint} {request.case.history or ''} {labs_str} {request.case.imaging or ''}".lower()
    
    specialists_to_use = []
    
    # Smart specialist detection
    if any(word in case_text for word in ["heart", "cardiac", "chest pain", "palpitation", "ecg", "ekg", "arrhythmia", "hypertension"]):
        specialists_to_use.append("cardiologist")
    if any(word in case_text for word in ["stomach", "bowel", "gi ", "nausea", "vomiting", "diarrhea", "abdominal", "endoscopy"]):
        specialists_to_use.append("gastroenterologist")
    if any(word in case_text for word in ["liver", "hepat", "ast", "alt", "bilirubin", "cirrhosis", "jaundice"]):
        specialists_to_use.append("hepatologist")
    if any(word in case_text for word in ["kidney", "renal", "creatinine", "gfr", "dialysis", "proteinuria"]):
        specialists_to_use.append("nephrologist")
    if any(word in case_text for word in ["brain", "neuro", "headache", "seizure", "stroke", "paralysis", "mri brain"]):
        specialists_to_use.append("neurologist")
    if any(word in case_text for word in ["lung", "pulmon", "breath", "cough", "oxygen", "asthma", "copd", "chest xray", "ct chest"]):
        specialists_to_use.append("pulmonologist")
    if any(word in case_text for word in ["sugar", "glucose", "diabetes", "thyroid", "hormone", "a1c", "insulin"]):
        specialists_to_use.append("endocrinologist")
    if any(word in case_text for word in ["infection", "fever", "sepsis", "antibiotic", "bacteria", "virus", "wbc"]):
        specialists_to_use.append("infectious_disease")
    if any(word in case_text for word in ["xray", "ct", "mri", "imaging", "ultrasound", "scan", "radiology"]):
        specialists_to_use.append("radiologist")
    
    # Default to at least 3 specialists if none detected
    if len(specialists_to_use) < 3:
        default_specialists = ["cardiologist", "pulmonologist", "gastroenterologist", "neurologist", "infectious_disease"]
        for spec in default_specialists:
            if spec not in specialists_to_use:
                specialists_to_use.append(spec)
            if len(specialists_to_use) >= 3:
                break
    
    # Create DiscussRequest
    discuss_request = DiscussRequest(
        case=request.case,
        specialists=specialists_to_use[:5],  # Max 5 specialists
        type="team"
    )
    
    return StreamingResponse(
        generate_discussion(discuss_request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        }
    )


@app.get("/")
async def root():
    return {"status": "running", "version": "3.0", "name": "CDSS", "model": "llama-3.3-70b"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    print("🏥 Clinical Decision Support System (CDSS)")
    print("📍 http://localhost:8000")
    print("🤖 Using Cerebras Llama-3.3-70b")
    print("🔬 Deep research enabled")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
