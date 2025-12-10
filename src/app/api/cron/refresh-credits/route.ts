import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/subscription/subscription-service";

// This endpoint should be called by a cron job daily
// For Vercel: Use Vercel Cron Jobs
// For other platforms: Use external cron service (e.g., cron-job.org, EasyCron)

export const maxDuration = 60; // 1 minute timeout
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "your-secret-key-here";
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("🔄 Starting daily credit refresh cron job...");
    
    const result = await SubscriptionService.refreshCreditsForDueUsers();
    
    return NextResponse.json({
      success: true,
      message: "Credit refresh completed",
      refreshed: result.refreshed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in credit refresh cron:", error);
    return NextResponse.json(
      {
        error: "Failed to refresh credits",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req);
}
