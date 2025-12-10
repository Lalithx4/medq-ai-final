import { NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/subscription/subscription-service";
import { db } from "@/server/db";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await getServerSupabase();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current subscription
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: {
        subscriptionPlan: true,
        subscriptionEnd: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.subscriptionPlan === "free") {
      return NextResponse.json(
        { error: "You are already on the free plan" },
        { status: 400 }
      );
    }

    // Cancel subscription (will take effect at end of billing period)
    // For now, we'll mark it for cancellation by setting a flag
    // In a real implementation, you'd also cancel with Stripe/Razorpay
    
    const result = await SubscriptionService.cancelSubscription(authUser.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to cancel subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully. You will retain access until the end of your billing period.",
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
