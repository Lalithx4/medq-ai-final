/**
 * Ad Campaign by ID API Routes
 * 
 * GET /api/ads/campaigns/[id] - Get campaign with analytics (admin only)
 * PUT /api/ads/campaigns/[id] - Update campaign (admin only)
 * DELETE /api/ads/campaigns/[id] - Delete campaign (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { adService } from "@/lib/ads/ad-service";
import { checkAdminAccess } from "@/lib/ads/admin-check";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { isAdmin, error } = await checkAdminAccess();
    if (!isAdmin) return error;

    const { id } = await params;
    const campaign = await adService.getCampaignWithAnalytics(id);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...campaign,
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { isAdmin, error } = await checkAdminAccess();
    if (!isAdmin) return error;

    const { id } = await params;
    const body = await request.json();

    const campaign = await adService.updateCampaign(id, body);

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { isAdmin, error } = await checkAdminAccess();
    if (!isAdmin) return error;

    const { id } = await params;
    await adService.deleteCampaign(id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
