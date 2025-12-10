/**
 * Targeted Ad Selection API Route
 * 
 * POST /api/ads/targeted - Get a targeted ad for a user context
 * 
 * This endpoint is called when generating meeting URLs to embed ad data
 * Can also be called by MiroTalk SFU to fetch ads dynamically
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
    const body = await request.json();

    const { userId, userEmail, specialty, location, roomType, roomId } = body;

    const ad = await adService.selectTargetedAd({
      userId,
      userEmail,
      specialty,
      location,
      roomType,
      roomId,
    });

    return NextResponse.json(
      { success: true, ad },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error selecting targeted ad:", error);
    return NextResponse.json(
      { success: false, error: "Failed to select ad" },
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
