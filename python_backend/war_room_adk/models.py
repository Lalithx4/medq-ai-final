"""
Pydantic models for War Room ADK
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class LabValue(BaseModel):
    """Laboratory test result"""
    name: str
    value: str
    unit: str
    status: str  # "normal", "high", "low", "critical"


class Vitals(BaseModel):
    """Patient vital signs"""
    bp: Optional[str] = None  # Blood pressure
    hr: Optional[str] = None  # Heart rate
    temp: Optional[str] = None  # Temperature
    rr: Optional[str] = None  # Respiratory rate
    spo2: Optional[str] = None  # Oxygen saturation


class PatientCase(BaseModel):
    """Complete patient case information"""
    chiefComplaint: str = Field(..., description="Primary reason for visit")
    history: Optional[str] = None
    vitals: Optional[Vitals] = None
    labs: Optional[List[LabValue]] = None
    imaging: Optional[str] = None
    medications: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    pmh: Optional[List[str]] = None  # Past medical history


class TeamDiscussionRequest(BaseModel):
    """Request for team discussion"""
    case: PatientCase
    urgency: Optional[str] = "routine"  # "routine", "urgent", "emergency"
    focusArea: Optional[str] = None


class BrokerQueryRequest(BaseModel):
    """Request for broker agent query"""
    query: str
    context: PatientCase


class FollowUpRequest(BaseModel):
    """Follow-up question request"""
    question: str
    context: PatientCase
    conversationHistory: List[Dict[str, Any]]
    targetAgent: Optional[str] = None


class AgentResponse(BaseModel):
    """Response from an agent"""
    agent: str
    specialty: str
    response: str
    confidence: Optional[float] = None
    reasoning: Optional[str] = None
    recommendations: Optional[List[str]] = None


class ConsensusResponse(BaseModel):
    """Final consensus from all agents"""
    primaryDiagnosis: str
    differentialDiagnoses: List[str]
    recommendedActions: List[str]
    urgencyLevel: str
    confidence: float
    agentContributions: List[AgentResponse]
