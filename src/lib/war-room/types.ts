/**
 * War Room - Clinical Decision Support System Types
 * Medical Multi-Agent Collaboration Platform
 */

// Agent identifiers
export type AgentId = 
  | 'gastroenterologist'
  | 'infectious_disease'
  | 'cardiologist'
  | 'pulmonologist'
  | 'nephrologist'
  | 'neurologist'
  | 'radiologist'
  | 'lab_interpreter'
  | 'pharmacologist'
  | 'oncologist'
  | 'endocrinologist'
  | 'hematologist'
  | 'orchestrator'
  | 'broker';

// Agent tiers for priority
export enum AgentTier {
  ORCHESTRATOR = 0,
  CORE = 1,
  ORGAN = 2,
  SYSTEM = 3,
  DIAGNOSTIC = 4,
  KNOWLEDGE = 5,
}

// Agent definition
export interface AgentDefinition {
  id: AgentId;
  name: string;
  specialty: string;
  emoji: string;
  color: string;
  tier: AgentTier;
  systemPrompt: string;
  keywords: string[]; // Keywords that trigger this agent
}

// Discussion phases
export enum DiscussionPhase {
  TRIAGE = 'triage',
  OPENING = 'opening',
  ANALYSIS = 'analysis',
  DEBATE = 'debate',
  SYNTHESIS = 'synthesis',
  CONSENSUS = 'consensus',
  CLOSING = 'closing',
}

// Agent message in discussion
export interface AgentMessage {
  id: string;
  agentId: AgentId;
  agentName: string;
  content: string;
  phase: DiscussionPhase;
  timestamp: number;
  confidence?: number;
  references?: string[];
  isConflict?: boolean;
  conflictWith?: AgentId;
  reasoning?: string;
}

// Lab value for ticker
export interface LabValue {
  name: string;
  value: string;
  unit: string;
  status: 'normal' | 'low' | 'high' | 'critical';
  reference?: string;
}

// Patient case input
export interface PatientCase {
  chiefComplaint: string;
  history?: string;
  vitals?: {
    bp?: string;
    hr?: string;
    temp?: string;
    rr?: string;
    spo2?: string;
  };
  labs?: LabValue[];
  imaging?: string;
  medications?: string[];
  allergies?: string[];
  pmh?: string[]; // Past medical history
}

// Team discussion request
export interface TeamDiscussionRequest {
  case: PatientCase;
  urgency?: 'routine' | 'urgent' | 'emergent';
  focusArea?: string;
  excludeAgents?: AgentId[];
}

// Broker query request
export interface BrokerQueryRequest {
  query: string;
  context: PatientCase;
  conversationHistory?: AgentMessage[];
}

// Consensus result
export interface ConsensusResult {
  primaryDiagnosis: string;
  differentialDiagnoses: Array<{
    diagnosis: string;
    probability: number;
    supportingAgents: AgentId[];
  }>;
  recommendedActions: string[];
  urgentAlerts?: string[];
  disagreements?: Array<{
    topic: string;
    positions: Array<{
      agentId: AgentId;
      position: string;
      reasoning: string;
    }>;
  }>;
  confidence: number;
  timestamp: number;
}

// Team discussion response (streaming)
export interface TeamDiscussionEvent {
  type: 
    | 'phase_change'
    | 'agent_thinking'
    | 'agent_message'
    | 'conflict_detected'
    | 'consensus_building'
    | 'consensus_complete'
    | 'lab_parsed'
    | 'error';
  data: any;
  timestamp: number;
}

// Follow-up question request
export interface FollowUpRequest {
  question: string;
  context: PatientCase;
  conversationHistory: AgentMessage[];
  targetAgent?: AgentId;
}

// Agent response format
export interface AgentResponse {
  agentId: AgentId;
  content: string;
  confidence: number;
  reasoning?: string;
  recommendations?: string[];
  alerts?: string[];
  needsMoreInfo?: string[];
  defer?: AgentId; // Defer to another agent
}
