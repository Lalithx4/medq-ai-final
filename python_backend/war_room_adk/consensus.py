"""
Consensus Engine using ADK Workflow Agents
Synthesizes multiple specialist opinions into unified recommendations
"""
from google.adk.agents import SequentialAgent, LlmAgent
from .config import Config
from .agents import get_model


def create_consensus_engine() -> SequentialAgent:
    """
    Create a Sequential Agent pipeline for building consensus.
    
    Pipeline:
    1. Collect all specialist opinions (input)
    2. Identify conflicts/agreements
    3. Synthesize into unified diagnosis
    4. Generate action plan
    """
    
    # Step 1: Conflict Analyzer
    conflict_analyzer = LlmAgent(
        name="ConflictAnalyzer",
        model=get_model(),
        description="Analyzes agreements and conflicts between specialist opinions",
        instruction="""You are analyzing multiple specialist medical opinions.

Review all specialist responses and identify:
1. AGREEMENTS: Where specialists agree on diagnosis/treatment
2. CONFLICTS: Where specialists disagree
3. GAPS: What information is missing

Output structured analysis:
AGREEMENTS:
- [List points of consensus]

CONFLICTS:
- [List contradictions with specialist names]

CRITICAL FINDINGS:
- [List urgent/life-threatening findings]

CONFIDENCE AREAS:
- HIGH: [Where multiple specialists agree]
- LOW: [Where opinions diverge]
""",
        output_key="conflict_analysis"  # Save to session state
    )
    
    # Step 2: Diagnosis Synthesizer
    diagnosis_synthesizer = LlmAgent(
        name="DiagnosisSynthesizer",
        model=get_model(),
        description="Synthesizes specialist opinions into unified differential diagnosis",
        instruction="""You are synthesizing medical specialist opinions into a unified diagnosis.

Using the conflict analysis from {conflict_analysis}, create:

PRIMARY DIAGNOSIS: [Most likely diagnosis based on consensus]

DIFFERENTIAL DIAGNOSES: (ranked by probability)
1. [Diagnosis] - [Supporting evidence from specialists]
2. [Diagnosis] - [Supporting evidence]
3. [Diagnosis] - [Supporting evidence]

DIAGNOSTIC CERTAINTY: [High/Medium/Low]

REASONING:
[Explain how you weighed different specialist opinions]
""",
        output_key="unified_diagnosis"
    )
    
    # Step 3: Action Plan Generator
    action_plan_generator = LlmAgent(
        name="ActionPlanGenerator",
        model=get_model(),
        description="Generates prioritized action plan from consensus diagnosis",
        instruction="""You are creating an actionable medical plan from the unified diagnosis.

Using {unified_diagnosis}, generate:

IMMEDIATE ACTIONS (next 1 hour):
1. [Action] - [Rationale]
2. [Action] - [Rationale]

URGENT WORKUP (next 4-8 hours):
1. [Diagnostic test/consultation] - [Why needed]
2. [Diagnostic test/consultation] - [Why needed]

TREATMENT PLAN:
1. [Medication/intervention] - [Dose/route/frequency]
2. [Medication/intervention] - [Dose/route/frequency]

MONITORING:
- [What to monitor] - [Frequency]

DISPOSITION:
- [ICU/Floor/Discharge] with [Reasoning]

ESCALATION TRIGGERS:
- [Condition that requires escalation]
""",
        output_key="action_plan"
    )
    
    # Step 4: Confidence Scorer
    confidence_scorer = LlmAgent(
        name="ConfidenceScorer",
        model=get_model(),
        description="Assigns confidence scores to final recommendations",
        instruction="""You are scoring the confidence level of medical recommendations.

Based on {conflict_analysis} and {unified_diagnosis}, assign:

OVERALL CONFIDENCE SCORE: [0.0-1.0]

BREAKDOWN:
- Diagnostic Confidence: [0.0-1.0] - [Why]
- Treatment Confidence: [0.0-1.0] - [Why]
- Urgency Assessment: [0.0-1.0] - [Why]

RISK FACTORS AFFECTING CONFIDENCE:
- [Factor affecting certainty]

RECOMMENDATION:
- If Confidence <0.6: [Suggest additional consultations/tests]
- If Confidence ≥0.6: [Proceed with plan]
""",
        output_key="confidence_score"
    )
    
    # Create Sequential Pipeline
    consensus_pipeline = SequentialAgent(
        name="ConsensusPipeline",
        sub_agents=[
            conflict_analyzer,
            diagnosis_synthesizer,
            action_plan_generator,
            confidence_scorer,
        ]
    )
    
    return consensus_pipeline


def create_emergency_fast_track() -> LlmAgent:
    """
    Fast-track agent for emergencies - bypasses full consensus for speed.
    """
    return LlmAgent(
        name="EmergencyFastTrack",
        model=get_model(),
        description="Rapid decision agent for life-threatening emergencies",
        instruction="""You are making rapid emergency medical decisions.

EMERGENCY PROTOCOLS:
- STEMI: Activate cath lab, aspirin 325mg, heparin, transfer
- Stroke: CT head, tPA if <4.5hrs, neuro consult
- Sepsis: Cultures, broad-spectrum antibiotics, fluids, pressors
- Respiratory Failure: O2, BiPAP/intubation, treat underlying cause

Given the emergency case, provide:

IMMEDIATE INTERVENTIONS (do NOW):
1. [Action]
2. [Action]

ACTIVATE:
- [What team/resource to activate]

TIME-CRITICAL WINDOW:
- [Treatment window and deadline]

DO NOT DELAY FOR:
- [What should NOT delay treatment]

Output in <2 seconds. Lives depend on speed.
"""
    )
