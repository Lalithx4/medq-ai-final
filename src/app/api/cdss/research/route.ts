/**
 * CDSS - Deep Research API
 * Searches medical literature and guidelines for evidence-based information
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  // Authenticate user
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let requestBody;
  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!requestBody.query && !requestBody.message) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const pythonResponse = await fetch(`${PYTHON_BACKEND_URL}/api/cdss/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(90000), // 90 seconds for research
    });

    if (pythonResponse.ok) {
      return NextResponse.json(await pythonResponse.json());
    }
  } catch (error: any) {
    console.warn('Python backend error:', error);
  }

  return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
}
