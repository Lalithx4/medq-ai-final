/**
 * War Room - Broker Query API
 * Proxies to Python backend with your actual agents
 * Falls back to TypeScript implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { WarRoomService } from '@/lib/war-room/service';
import { getAgentDisplayInfo } from '@/lib/war-room/agents';
import { BrokerQueryRequest, AgentMessage, DiscussionPhase } from '@/lib/war-room/types';
import { generateId } from 'ai';

export const runtime = 'nodejs';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  // Authenticate user
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request
  let requestBody: BrokerQueryRequest;
  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!requestBody.query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  // Try Python backend first
  try {
    const pythonResponse = await fetch(`${PYTHON_BACKEND_URL}/api/broker-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(60000), // 60 second timeout for AI response
    });

    if (pythonResponse.ok) {
      return NextResponse.json(await pythonResponse.json());
    }
  } catch (error: any) {
    // Silently fall back - only log unexpected errors
    if (error?.cause?.code !== 'ECONNREFUSED' && error?.name !== 'TimeoutError') {
      console.warn('Python backend error:', error);
    }
  }

  // Fallback to TypeScript
  const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return NextResponse.json({ error: 'Backend services unavailable' }, { status: 503 });
  }

  try {
    const service = new WarRoomService(geminiApiKey);
    const response = await service.answerBrokerQuery(
      requestBody.query,
      requestBody.context,
      requestBody.conversationHistory || []
    );

    const agentInfo = getAgentDisplayInfo('broker');
    
    const message: AgentMessage = {
      id: generateId(),
      agentId: 'broker',
      agentName: agentInfo.name,
      content: response.content,
      phase: DiscussionPhase.ANALYSIS,
      timestamp: Date.now(),
      confidence: response.confidence,
    };

    return NextResponse.json({
      success: true,
      message,
      alerts: response.alerts,
      recommendations: response.recommendations,
    });
  } catch (error) {
    console.error('Broker query error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process query' },
      { status: 500 }
    );
  }
}
