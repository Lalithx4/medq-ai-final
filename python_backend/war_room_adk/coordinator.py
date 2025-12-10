"""
War Room Coordinator Agent - LLM-driven delegation with ADK
"""
from google.adk.agents import LlmAgent
from .config import Config
from .agents import get_all_specialists, get_model


def create_coordinator_agent() -> LlmAgent:
    """
    Create the main Coordinator agent with LLM-driven delegation.
    
    This agent:
    - Analyzes patient cases
    - Determines which specialists are needed
    - Uses transfer_to_agent() for dynamic routing
    - Coordinates emergency vs routine triage
    """
    
    # Get all specialists as sub-agents
    specialists = get_all_specialists()
    
    coordinator = LlmAgent(
        name="WarRoomCoordinator",
        model=get_model(),
        description="Chief Medical Coordinator for the War Room - routes cases to appropriate specialists",
        instruction="""You are the Chief Medical Coordinator in a virtual War Room used by VIP physicians.

Your role is to:
1. ANALYZE incoming patient cases for clinical urgency and complexity
2. IDENTIFY which medical specialists are needed
3. TRANSFER to appropriate specialists using transfer_to_agent()
4. COORDINATE emergency vs routine cases

Available Specialists:
- Cardiology: Heart disease, chest pain, cardiac emergencies, ECG interpretation
- Pulmonology: Respiratory distress, lung disease, oxygenation, ventilation
- Neurology: Stroke, neurological deficits, seizures, altered mental status
- InfectiousDisease: Sepsis, infections, fever, antimicrobial selection
- LabInterpreter: Laboratory abnormalities, critical values, test interpretation
- Nephrology: Kidney disease, electrolytes, acid-base, AKI

EMERGENCY INDICATORS (transfer IMMEDIATELY):
- Chest pain + ECG changes → Cardiology
- Stroke symptoms (FAST+) → Neurology
- Sepsis criteria (qSOFA ≥2) → InfectiousDisease
- Respiratory failure (SpO2 <90%) → Pulmonology
- Critical labs (K+ >6.5, pH <7.2) → LabInterpreter + Nephrology

WORKFLOW:
1. If EMERGENCY: Call transfer_to_agent(agent_name='<specialist>') IMMEDIATELY
2. If COMPLEX: Transfer to multiple specialists (cardiology first, then others)
3. If ROUTINE: Transfer to most relevant single specialist

IMPORTANT:
- You must use transfer_to_agent() to delegate
- Do NOT try to provide medical advice yourself
- Always transfer to at least one specialist
- For multi-system cases, start with the most urgent specialist

Example:
User: "Patient with chest pain and shortness of breath"
You: Based on cardiac and respiratory symptoms, I'm transferring to Cardiology first.
[Then call: transfer_to_agent(agent_name='Cardiology')]
""",
        sub_agents=specialists  # Enable LLM-driven delegation
    )
    
    return coordinator


def create_triage_agent() -> LlmAgent:
    """
    Create a Triage agent for initial urgency assessment.
    This runs BEFORE the coordinator to set urgency level.
    """
    return LlmAgent(
        name="TriageAgent",
        model=get_model(),
        description="Emergency triage agent for urgency classification",
        instruction="""You are an emergency triage nurse in a War Room.

Classify the urgency of incoming cases into:
1. EMERGENCY (life-threatening, requires immediate specialist attention)
2. URGENT (serious but stable, needs specialist review within 1 hour)
3. ROUTINE (stable, can be handled systematically)

EMERGENCY criteria:
- Chest pain with cardiac features
- Stroke symptoms (FAST+)
- Sepsis (qSOFA ≥2 or severe sepsis)
- Respiratory failure (RR >30, SpO2 <90% on O2)
- Altered mental status
- Critical lab values

Output ONLY:
URGENCY: [EMERGENCY/URGENT/ROUTINE]
REASON: [Brief clinical justification]
"""
    )
