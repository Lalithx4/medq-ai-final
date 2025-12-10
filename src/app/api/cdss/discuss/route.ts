/**
 * CDSS - Initial Discussion API
 * Starts a multi-specialist discussion with deep research capabilities
 */

import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export const maxDuration = 180;
export const runtime = 'nodejs';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  // Authenticate user
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let requestBody;
  try {
    requestBody = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!requestBody.case?.chiefComplaint) {
    return new Response('Chief complaint is required', { status: 400 });
  }

  try {
    const pythonResponse = await fetch(`${PYTHON_BACKEND_URL}/api/cdss/discuss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(120000),
    });

    if (pythonResponse.ok) {
      return new Response(pythonResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  } catch (error: any) {
    console.warn('Python backend error:', error);
  }

  return new Response('Backend unavailable', { status: 503 });
}
