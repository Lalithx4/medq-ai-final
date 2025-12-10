/**
 * Ad Campaigns API Routes
 * 
 * GET /api/ads/campaigns - List all campaigns (admin only)
 * POST /api/ads/campaigns - Create a new campaign (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { adService } from "@/lib/ads/ad-service";
import { checkAdminAccess } from "@/lib/ads/admin-check";

export async function GET(request: NextRequest) {
  try {
    const { isAdmin, error } = await checkAdminAccess();
    if (!isAdmin) return error;

    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");
    const approved = searchParams.get("approved");
    const sponsorName = searchParams.get("sponsorName");

    const filters: {
      active?: boolean;
      approved?: boolean;
      sponsorName?: string;
    } = {};

    if (active !== null) filters.active = active === "true";
    if (approved !== null) filters.approved = approved === "true";
    if (sponsorName) filters.sponsorName = sponsorName;

    const campaigns = await adService.getCampaigns(filters);

    return NextResponse.json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { isAdmin, userId, error } = await checkAdminAccess();
    if (!isAdmin) return error;

    const body = await request.json();

    // Validate required fields
    if (!body.sponsorName || !body.url || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: sponsorName, url, startDate, endDate" },
        { status: 400 }
      );
    }

    const campaign = await adService.createCampaign({
      ...body,
      createdBy: userId,
    });

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
