/**
 * War Room - Parse Labs API
 * Parses lab values from text input
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { WarRoomService } from '@/lib/war-room/service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Authenticate user
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request
  let body: { labText: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.labText) {
    return NextResponse.json({ error: 'Lab text is required' }, { status: 400 });
  }

  try {
    // Get Gemini API key (not strictly needed for parsing but we might use AI)
    const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
    const service = new WarRoomService(geminiApiKey);
    
    const parsedLabs = service.parseLabValues(body.labText);

    return NextResponse.json({
      success: true,
      labs: parsedLabs,
      rawText: body.labText,
    });
  } catch (error) {
    console.error('Lab parsing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse labs' },
      { status: 500 }
    );
  }
}
