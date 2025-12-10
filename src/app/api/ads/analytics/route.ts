/**
 * Ad Analytics API Route
 * 
 * GET /api/ads/analytics - Get overall ad analytics (admin only)
 * GET /api/ads/analytics?campaignId=xxx - Get campaign-specific analytics (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { adService } from "@/lib/ads/ad-service";
import { checkAdminAccess } from "@/lib/ads/admin-check";

export async function GET(request: NextRequest) {
  try {
    const { isAdmin, error } = await checkAdminAccess();
    if (!isAdmin) return error;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateRange: { from?: string; to?: string } = {};
    if (from) dateRange.from = from;
    if (to) dateRange.to = to;

    if (campaignId) {
      // Campaign-specific analytics
      const analytics = await adService.getCampaignAnalytics(campaignId, dateRange);
      return NextResponse.json({
        success: true,
        ...analytics,
      });
    } else {
      // Overall analytics
      const analytics = await adService.getOverallAnalytics(dateRange);
      return NextResponse.json({
        success: true,
        ...analytics,
      });
    }
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
