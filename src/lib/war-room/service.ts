/**
 * War Room - Clinical Decision Support Service
 * Multi-Agent Orchestration using Google Gemini
 */

import { GoogleGenAI } from '@google/genai';
import { 
  AgentId, 
  AgentMessage, 
  AgentResponse, 
  ConsensusResult, 
  DiscussionPhase, 
  PatientCase, 
  TeamDiscussionEvent 
} from './types';
import { MEDICAL_AGENTS, identifyRelevantAgents, getAgentDisplayInfo } from './agents';

export class WarRoomService {
  private gemini: GoogleGenAI;
  private model: string;

  constructor(geminiApiKey: string, model: string = 'gemini-2.5-flash') {
    this.gemini = new GoogleGenAI({ apiKey: geminiApiKey });
    this.model = model;
  }

  /**
   * Format patient case into a structured prompt
   */
  private formatCasePrompt(patientCase: PatientCase): string {
    let prompt = `PATIENT PRESENTATION:
Chief Complaint: ${patientCase.chiefComplaint}`;

    if (patientCase.history) {
      prompt += `\n\nHistory: ${patientCase.history}`;
    }

    if (patientCase.vitals) {
      const v = patientCase.vitals;
      prompt += `\n\nVitals:`;
      if (v.bp) prompt += `\n- Blood Pressure: ${v.bp}`;
      if (v.hr) prompt += `\n- Heart Rate: ${v.hr}`;
      if (v.temp) prompt += `\n- Temperature: ${v.temp}`;
      if (v.rr) prompt += `\n- Respiratory Rate: ${v.rr}`;
      if (v.spo2) prompt += `\n- SpO2: ${v.spo2}`;
    }

    if (patientCase.labs && patientCase.labs.length > 0) {
      prompt += `\n\nLaboratory Results:`;
      for (const lab of patientCase.labs) {
        const statusEmoji = lab.status === 'critical' ? '🚨' : 
                           lab.status === 'high' ? '⬆️' : 
                           lab.status === 'low' ? '⬇️' : '✓';
        prompt += `\n- ${lab.name}: ${lab.value} ${lab.unit} ${statusEmoji} (${lab.status})`;
      }
    }

    if (patientCase.imaging) {
      prompt += `\n\nImaging: ${patientCase.imaging}`;
    }

    if (patientCase.medications && patientCase.medications.length > 0) {
      prompt += `\n\nCurrent Medications: ${patientCase.medications.join(', ')}`;
    }

    if (patientCase.allergies && patientCase.allergies.length > 0) {
      prompt += `\n\nAllergies: ${patientCase.allergies.join(', ')}`;
    }

    if (patientCase.pmh && patientCase.pmh.length > 0) {
      prompt += `\n\nPast Medical History: ${patientCase.pmh.join(', ')}`;
    }

    return prompt;
  }

  /**
   * Generate a response from a specific agent
   */
  async getAgentResponse(
    agentId: AgentId,
    patientCase: PatientCase,
    conversationContext: AgentMessage[] = [],
    phase: DiscussionPhase = DiscussionPhase.ANALYSIS
  ): Promise<AgentResponse> {
    const agent = MEDICAL_AGENTS[agentId];
    const casePrompt = this.formatCasePrompt(patientCase);

    // Build conversation history for context
    let contextPrompt = '';
    if (conversationContext.length > 0) {
      contextPrompt = '\n\nPREVIOUS DISCUSSION:\n';
      for (const msg of conversationContext.slice(-6)) { // Last 6 messages for context
        contextPrompt += `[${msg.agentName}]: ${msg.content}\n`;
      }
    }

    const phaseInstructions: Record<DiscussionPhase, string> = {
      [DiscussionPhase.TRIAGE]: 'Provide initial assessment and urgency level.',
      [DiscussionPhase.OPENING]: 'Introduce your key concerns and initial impressions.',
      [DiscussionPhase.ANALYSIS]: 'Provide detailed analysis from your specialty perspective.',
      [DiscussionPhase.DEBATE]: 'If you disagree with other specialists, explain your reasoning. If you agree, add supporting evidence.',
      [DiscussionPhase.SYNTHESIS]: 'Help synthesize the findings into a cohesive assessment.',
      [DiscussionPhase.CONSENSUS]: 'State your final opinion and confidence level.',
      [DiscussionPhase.CLOSING]: 'Provide final recommendations and any outstanding concerns.',
    };

    const prompt = `${agent.systemPrompt}

${casePrompt}
${contextPrompt}

PHASE: ${phase.toUpperCase()}
INSTRUCTION: ${phaseInstructions[phase]}

Respond as ${agent.name} (${agent.specialty}). Be concise (2-4 sentences max). Focus on your specialty.

Format your response as JSON:
{
  "content": "Your analysis/opinion",
  "confidence": 0.0-1.0,
  "reasoning": "Brief reasoning (optional)",
  "recommendations": ["specific actions from your specialty"],
  "alerts": ["any urgent concerns"],
  "needsMoreInfo": ["additional info needed"],
  "defer": "agentId to defer to if outside expertise (optional)"
}`;

    try {
      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          temperature: 0.4, // More deterministic for medical
          maxOutputTokens: 1000,
        },
      });

      const text = response.text || '';
      
      // Parse JSON response
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            agentId,
            content: parsed.content || 'No analysis provided.',
            confidence: parsed.confidence || 0.7,
            reasoning: parsed.reasoning,
            recommendations: parsed.recommendations || [],
            alerts: parsed.alerts || [],
            needsMoreInfo: parsed.needsMoreInfo || [],
            defer: parsed.defer,
          };
        }
      } catch {
        // If JSON parsing fails, use raw text
      }

      return {
        agentId,
        content: text,
        confidence: 0.7,
        recommendations: [],
        alerts: [],
        needsMoreInfo: [],
      };
    } catch (error) {
      console.error(`Error from agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Run the orchestrator to coordinate the discussion
   */
  async runOrchestrator(
    patientCase: PatientCase,
    urgency: 'routine' | 'urgent' | 'emergent' = 'routine'
  ): Promise<{
    relevantAgents: AgentId[];
    urgencyLevel: 'routine' | 'urgent' | 'emergent';
    keyFindings: string[];
    initialAssessment: string;
  }> {
    const casePrompt = this.formatCasePrompt(patientCase);
    const caseText = `${patientCase.chiefComplaint} ${patientCase.history || ''} ${JSON.stringify(patientCase.labs || [])}`;
    
    // Auto-identify relevant agents
    const autoIdentified = identifyRelevantAgents(caseText);

    const prompt = `${MEDICAL_AGENTS.orchestrator.systemPrompt}

${casePrompt}

TASK: Analyze this case and determine:
1. Urgency level (routine, urgent, emergent)
2. Which specialist agents should be consulted
3. Key findings that need attention
4. Initial case assessment

Available specialists: ${Object.entries(MEDICAL_AGENTS)
  .filter(([id]) => id !== 'orchestrator' && id !== 'broker')
  .map(([id, agent]) => `${agent.name} (${id})`)
  .join(', ')}

Auto-identified relevant specialists based on keywords: ${autoIdentified.join(', ')}

Respond in JSON:
{
  "urgencyLevel": "routine|urgent|emergent",
  "relevantAgents": ["agentId1", "agentId2", ...],
  "keyFindings": ["finding1", "finding2", ...],
  "initialAssessment": "Brief initial assessment"
}`;

    const response = await this.gemini.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      },
    });

    const text = response.text || '';
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          relevantAgents: parsed.relevantAgents || autoIdentified,
          urgencyLevel: parsed.urgencyLevel || urgency,
          keyFindings: parsed.keyFindings || [],
          initialAssessment: parsed.initialAssessment || '',
        };
      }
    } catch {
      // Fallback
    }

    return {
      relevantAgents: autoIdentified.length > 0 ? autoIdentified : ['lab_interpreter', 'cardiologist', 'infectious_disease'],
      urgencyLevel: urgency,
      keyFindings: [],
      initialAssessment: 'Initial assessment pending specialist input.',
    };
  }

  /**
   * Build consensus from agent responses
   */
  async buildConsensus(
    patientCase: PatientCase,
    messages: AgentMessage[]
  ): Promise<ConsensusResult> {
    const casePrompt = this.formatCasePrompt(patientCase);
    
    const discussionSummary = messages
      .map(m => `[${m.agentName}] (confidence: ${m.confidence || 'N/A'}): ${m.content}`)
      .join('\n\n');

    const prompt = `You are synthesizing a multi-specialist medical discussion into a consensus.

${casePrompt}

SPECIALIST DISCUSSION:
${discussionSummary}

Create a consensus summary that:
1. Identifies the most likely primary diagnosis
2. Lists differential diagnoses with probabilities and supporting specialists
3. Highlights any disagreements between specialists
4. Compiles recommended actions
5. Flags any urgent alerts

Respond in JSON:
{
  "primaryDiagnosis": "Most likely diagnosis",
  "differentialDiagnoses": [
    {"diagnosis": "Dx1", "probability": 0.0-1.0, "supportingAgents": ["agentId1", "agentId2"]},
    ...
  ],
  "recommendedActions": ["Action 1", "Action 2", ...],
  "urgentAlerts": ["Alert 1", ...],
  "disagreements": [
    {"topic": "Topic", "positions": [{"agentId": "id", "position": "view", "reasoning": "why"}]}
  ],
  "confidence": 0.0-1.0
}`;

    const response = await this.gemini.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
    });

    const text = response.text || '';
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          primaryDiagnosis: parsed.primaryDiagnosis || 'Assessment pending',
          differentialDiagnoses: parsed.differentialDiagnoses || [],
          recommendedActions: parsed.recommendedActions || [],
          urgentAlerts: parsed.urgentAlerts || [],
          disagreements: parsed.disagreements || [],
          confidence: parsed.confidence || 0.7,
          timestamp: Date.now(),
        };
      }
    } catch {
      // Fallback
    }

    return {
      primaryDiagnosis: 'Unable to reach consensus',
      differentialDiagnoses: [],
      recommendedActions: ['Review case with attending physician'],
      urgentAlerts: [],
      disagreements: [],
      confidence: 0.5,
      timestamp: Date.now(),
    };
  }

  /**
   * Answer a broker query (knowledge question)
   */
  async answerBrokerQuery(
    query: string,
    patientCase: PatientCase,
    conversationHistory: AgentMessage[] = []
  ): Promise<AgentResponse> {
    const casePrompt = this.formatCasePrompt(patientCase);
    
    let historyContext = '';
    if (conversationHistory.length > 0) {
      historyContext = '\n\nRECENT DISCUSSION:\n';
      for (const msg of conversationHistory.slice(-4)) {
        historyContext += `[${msg.agentName}]: ${msg.content}\n`;
      }
    }

    const prompt = `${MEDICAL_AGENTS.broker.systemPrompt}

PATIENT CONTEXT:
${casePrompt}
${historyContext}

USER QUESTION: ${query}

Provide a helpful, evidence-based answer relevant to this patient's context. Be educational but concise.

Respond in JSON:
{
  "content": "Your answer",
  "confidence": 0.0-1.0,
  "recommendations": ["any relevant recommendations"],
  "alerts": ["any safety concerns"]
}`;

    const response = await this.gemini.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 1500,
      },
    });

    const text = response.text || '';
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          agentId: 'broker',
          content: parsed.content || text,
          confidence: parsed.confidence || 0.7,
          recommendations: parsed.recommendations || [],
          alerts: parsed.alerts || [],
          needsMoreInfo: [],
        };
      }
    } catch {
      // Fallback
    }

    return {
      agentId: 'broker',
      content: text,
      confidence: 0.7,
      recommendations: [],
      alerts: [],
      needsMoreInfo: [],
    };
  }

  /**
   * Parse lab values from text input
   */
  parseLabValues(labText: string): Array<{
    name: string;
    value: string;
    unit: string;
    status: 'normal' | 'low' | 'high' | 'critical';
  }> {
    // Common lab value patterns and their reference ranges
    const labPatterns: Record<string, { regex: RegExp; unit: string; low: number; high: number; criticalLow?: number; criticalHigh?: number }> = {
      'WBC': { regex: /wbc[:\s]*([0-9.]+)/i, unit: 'K/uL', low: 4.5, high: 11.0, criticalLow: 2.0, criticalHigh: 30.0 },
      'Hemoglobin': { regex: /h(?:e)?(?:mo)?(?:globin)?[:\s]*([0-9.]+)/i, unit: 'g/dL', low: 12.0, high: 17.5, criticalLow: 7.0, criticalHigh: 20.0 },
      'Platelets': { regex: /plt|platelets?[:\s]*([0-9]+)/i, unit: 'K/uL', low: 150, high: 400, criticalLow: 50, criticalHigh: 1000 },
      'Sodium': { regex: /na[:\s]*([0-9]+)/i, unit: 'mEq/L', low: 136, high: 145, criticalLow: 120, criticalHigh: 160 },
      'Potassium': { regex: /k[:\s]*([0-9.]+)/i, unit: 'mEq/L', low: 3.5, high: 5.0, criticalLow: 2.5, criticalHigh: 6.5 },
      'Creatinine': { regex: /cr(?:eatinine)?[:\s]*([0-9.]+)/i, unit: 'mg/dL', low: 0.7, high: 1.3, criticalHigh: 10.0 },
      'BUN': { regex: /bun[:\s]*([0-9]+)/i, unit: 'mg/dL', low: 7, high: 20 },
      'Glucose': { regex: /glucose|glu[:\s]*([0-9]+)/i, unit: 'mg/dL', low: 70, high: 100, criticalLow: 40, criticalHigh: 500 },
      'AST': { regex: /ast[:\s]*([0-9]+)/i, unit: 'U/L', low: 10, high: 40 },
      'ALT': { regex: /alt[:\s]*([0-9]+)/i, unit: 'U/L', low: 7, high: 56 },
      'Bilirubin': { regex: /bili(?:rubin)?[:\s]*([0-9.]+)/i, unit: 'mg/dL', low: 0.1, high: 1.2 },
      'Troponin': { regex: /trop(?:onin)?[:\s]*([0-9.]+)/i, unit: 'ng/mL', low: 0, high: 0.04, criticalHigh: 0.4 },
      'Lactate': { regex: /lactate[:\s]*([0-9.]+)/i, unit: 'mmol/L', low: 0.5, high: 2.0, criticalHigh: 4.0 },
      'Procalcitonin': { regex: /procal(?:citonin)?[:\s]*([0-9.]+)/i, unit: 'ng/mL', low: 0, high: 0.5, criticalHigh: 10.0 },
    };

    const results: Array<{
      name: string;
      value: string;
      unit: string;
      status: 'normal' | 'low' | 'high' | 'critical';
    }> = [];

    for (const [name, config] of Object.entries(labPatterns)) {
      const match = labText.match(config.regex);
      if (match && match[1]) {
        const valueStr = match[1];
        const value = parseFloat(valueStr);
        let status: 'normal' | 'low' | 'high' | 'critical' = 'normal';

        if (config.criticalLow && value <= config.criticalLow) {
          status = 'critical';
        } else if (config.criticalHigh && value >= config.criticalHigh) {
          status = 'critical';
        } else if (value < config.low) {
          status = 'low';
        } else if (value > config.high) {
          status = 'high';
        }

        results.push({
          name,
          value: valueStr,
          unit: config.unit,
          status,
        });
      }
    }

    return results;
  }
}
