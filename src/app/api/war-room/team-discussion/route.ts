/**
 * War Room - Team Discussion API
 * Proxies requests to Python backend with your actual agents
 * Falls back to TypeScript implementation if Python backend unavailable
 */

import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { WarRoomService } from '@/lib/war-room/service';
import { MEDICAL_AGENTS, getAgentDisplayInfo } from '@/lib/war-room/agents';
import { 
  AgentMessage, 
  DiscussionPhase, 
  PatientCase, 
  TeamDiscussionRequest 
} from '@/lib/war-room/types';
import { generateId } from 'ai';

export const maxDuration = 180; // 3 minutes for discussion
export const runtime = 'nodejs';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  // Authenticate user
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Parse request
  let requestBody: TeamDiscussionRequest;
  try {
    requestBody = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!requestBody.case || !requestBody.case.chiefComplaint) {
    return new Response('Chief complaint is required', { status: 400 });
  }

  // Try Python backend first (uses your actual .py agents)
  try {
    const pythonResponse = await fetch(`${PYTHON_BACKEND_URL}/api/team-discussion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(120000), // 120 second timeout for AI response
    });

    if (pythonResponse.ok) {
      // Stream response from Python backend
      return new Response(pythonResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  } catch (error: any) {
    // Python backend not available - silently fall back to TypeScript
    // Only log if it's not the expected ECONNREFUSED or timeout error
    if (error?.cause?.code !== 'ECONNREFUSED' && error?.name !== 'TimeoutError') {
      console.warn('Python backend error:', error);
    }
  }

  // Fallback to TypeScript implementation with Gemini
  const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return new Response('Backend services unavailable', { status: 503 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const service = new WarRoomService(geminiApiKey);
      const messages: AgentMessage[] = [];
      
      const sendEvent = (type: string, data: any) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`
          )
        );
      };

      try {
        // Phase 1: Triage & Orchestration
        sendEvent('phase_change', { phase: 'triage', message: 'Analyzing case and identifying specialists...' });
        
        const orchestration = await service.runOrchestrator(
          requestBody.case,
          requestBody.urgency || 'routine'
        );

        sendEvent('orchestration_complete', {
          relevantAgents: orchestration.relevantAgents,
          urgencyLevel: orchestration.urgencyLevel,
          keyFindings: orchestration.keyFindings,
          initialAssessment: orchestration.initialAssessment,
        });

        // Parse labs if provided as text
        if (requestBody.case.labs && requestBody.case.labs.length > 0) {
          sendEvent('lab_parsed', { labs: requestBody.case.labs });
        }

        // Filter agents based on orchestration
        let agentsToConsult = orchestration.relevantAgents.filter(
          id => !requestBody.excludeAgents?.includes(id)
        );

        // Ensure we have at least 2 agents
        if (agentsToConsult.length < 2) {
          agentsToConsult = ['lab_interpreter', 'cardiologist', 'infectious_disease'];
        }

        // Cap at 5 agents for manageable discussion
        agentsToConsult = agentsToConsult.slice(0, 5);

        // Phase 2: Opening - Each agent gives initial impression
        sendEvent('phase_change', { phase: 'opening', message: 'Specialists providing initial impressions...' });
        
        for (const agentId of agentsToConsult) {
          const agentInfo = getAgentDisplayInfo(agentId);
          sendEvent('agent_thinking', { agentId, agentName: agentInfo.name });

          const response = await service.getAgentResponse(
            agentId,
            requestBody.case,
            messages,
            DiscussionPhase.OPENING
          );

          const message: AgentMessage = {
            id: generateId(),
            agentId,
            agentName: agentInfo.name,
            content: response.content,
            phase: DiscussionPhase.OPENING,
            timestamp: Date.now(),
            confidence: response.confidence,
          };
          messages.push(message);

          sendEvent('agent_message', {
            message,
            alerts: response.alerts,
            recommendations: response.recommendations,
          });

          // Small delay for readability
          await new Promise(r => setTimeout(r, 300));
        }

        // Phase 3: Analysis - Deeper dive
        sendEvent('phase_change', { phase: 'analysis', message: 'Specialists analyzing in detail...' });
        
        for (const agentId of agentsToConsult.slice(0, 3)) { // Top 3 agents for analysis
          const agentInfo = getAgentDisplayInfo(agentId);
          sendEvent('agent_thinking', { agentId, agentName: agentInfo.name });

          const response = await service.getAgentResponse(
            agentId,
            requestBody.case,
            messages,
            DiscussionPhase.ANALYSIS
          );

          const message: AgentMessage = {
            id: generateId(),
            agentId,
            agentName: agentInfo.name,
            content: response.content,
            phase: DiscussionPhase.ANALYSIS,
            timestamp: Date.now(),
            confidence: response.confidence,
            reasoning: response.reasoning,
          };
          messages.push(message);

          sendEvent('agent_message', {
            message,
            alerts: response.alerts,
            recommendations: response.recommendations,
            needsMoreInfo: response.needsMoreInfo,
          });

          await new Promise(r => setTimeout(r, 300));
        }

        // Phase 4: Debate - Check for conflicts
        sendEvent('phase_change', { phase: 'debate', message: 'Specialists discussing and resolving conflicts...' });

        // Have agents respond to each other (one round)
        for (const agentId of agentsToConsult.slice(0, 2)) {
          const agentInfo = getAgentDisplayInfo(agentId);
          sendEvent('agent_thinking', { agentId, agentName: agentInfo.name });

          const response = await service.getAgentResponse(
            agentId,
            requestBody.case,
            messages,
            DiscussionPhase.DEBATE
          );

          // Check if this is a disagreement
          const lastMessages = messages.slice(-3);
          const hasConflict = lastMessages.some(m => 
            m.agentId !== agentId && 
            response.content.toLowerCase().includes('disagree') ||
            response.content.toLowerCase().includes('however') ||
            response.content.toLowerCase().includes('alternative')
          );

          const message: AgentMessage = {
            id: generateId(),
            agentId,
            agentName: agentInfo.name,
            content: response.content,
            phase: DiscussionPhase.DEBATE,
            timestamp: Date.now(),
            confidence: response.confidence,
            isConflict: hasConflict,
          };
          messages.push(message);

          if (hasConflict) {
            sendEvent('conflict_detected', { agentId, content: response.content });
          }

          sendEvent('agent_message', {
            message,
            alerts: response.alerts,
          });

          await new Promise(r => setTimeout(r, 300));
        }

        // Phase 5: Consensus Building
        sendEvent('phase_change', { phase: 'consensus', message: 'Building consensus...' });
        sendEvent('consensus_building', { progress: 50 });

        const consensus = await service.buildConsensus(requestBody.case, messages);

        sendEvent('consensus_building', { progress: 100 });
        sendEvent('consensus_complete', { consensus });

        // Send final summary
        sendEvent('complete', {
          totalMessages: messages.length,
          agentsConsulted: agentsToConsult,
          consensus,
        });

        controller.close();
      } catch (error) {
        console.error('War Room error:', error);
        sendEvent('error', {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
