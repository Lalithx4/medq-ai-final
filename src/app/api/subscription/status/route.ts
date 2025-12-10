import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { SubscriptionService } from "@/lib/subscription/subscription-service";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to get subscription details, but handle missing fields gracefully
    let details;
    try {
      details = await SubscriptionService.getSubscriptionDetails(user.id);
    } catch (error) {
      // If new fields don't exist yet, or DB is unavailable, return a safe default
      console.warn("[SUBSCRIPTION] Fallback due to error, using default plan:", error);
      try {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: {
            subscriptionPlan: true,
            subscriptionEnd: true,
            credits: true,
          },
        });

        if (dbUser) {
          const { getPlanById } = await import("@/lib/pricing/plans");
          const plan = getPlanById(dbUser.subscriptionPlan);
          return NextResponse.json({
            success: true,
            subscription: {
              plan: dbUser.subscriptionPlan,
              planName: plan?.name || "Free",
              credits: dbUser.credits,
              monthlyCredits: plan?.credits || 100,
              isActive: dbUser.subscriptionEnd ? dbUser.subscriptionEnd > new Date() : dbUser.subscriptionPlan !== "free",
              startDate: null,
              endDate: dbUser.subscriptionEnd,
              lastRefresh: null,
              daysUntilRefresh: null,
            },
          });
        }
      } catch (dbErr) {
        console.warn("[SUBSCRIPTION] DB unavailable, returning default free plan.", dbErr);
      }

      // Default when DB is down
      return NextResponse.json({
        success: true,
        subscription: {
          plan: "free",
          planName: "Free",
          credits: 0,
          monthlyCredits: 100,
          isActive: true,
          startDate: null,
          endDate: null,
          lastRefresh: null,
          daysUntilRefresh: null,
        },
      });
    }
    
    if (!details) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      subscription: {
        plan: details.subscriptionPlan,
        planName: details.planDetails?.name || "Free",
        credits: details.credits,
        monthlyCredits: details.planDetails?.credits || 100,
        isActive: details.isActive,
        startDate: details.subscriptionStart || null,
        endDate: details.subscriptionEnd,
        lastRefresh: details.lastCreditRefresh || null,
        daysUntilRefresh: details.lastCreditRefresh 
          ? Math.max(0, 30 - Math.floor((Date.now() - new Date(details.lastCreditRefresh).getTime()) / (1000 * 60 * 60 * 24)))
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
}
