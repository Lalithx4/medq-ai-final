/**
 * Ad Tracking API Route
 * 
 * POST /api/ads/track - Track ad events (click, dismiss, impression)
 * 
 * This endpoint is called by the MiroTalk SFU client when users interact with ads
 */

import { NextRequest, NextResponse } from "next/server";
import { adService } from "@/lib/ads/ad-service";

// CORS headers for cross-origin requests from video.biodocs.ai
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(request: NextRequest) {
  try {
    // Handle both JSON body and query params (fallback)
    let event, impressionId;
    
    try {
      const body = await request.json();
      event = body.event;
      impressionId = body.impressionId;
    } catch {
      // If JSON parse fails, try query params
      const url = new URL(request.url);
      event = url.searchParams.get("event");
      impressionId = url.searchParams.get("impressionId");
    }

    if (!event || !impressionId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await adService.trackEvent({ event, impressionId });

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error("Error tracking ad event:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track event" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const event = url.searchParams.get("event");
  const impressionId = url.searchParams.get("impressionId");

  if (!event || !impressionId) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    await adService.trackEvent({ event, impressionId });
    
    // Return a 1x1 transparent pixel or just success JSON
    return NextResponse.json(
      { success: true }, 
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error tracking ad event (GET):", error);
    return NextResponse.json(
      { success: false, error: "Failed to track event" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
