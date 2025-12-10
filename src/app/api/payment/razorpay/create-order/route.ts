import { NextResponse } from "next/server";
import { RazorpayService } from "@/lib/payment/razorpay-service";
import { getPlanById } from "@/lib/pricing/plans";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await req.json();

    const plan = getPlanById(planId);
    
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (plan.priceINR === 0) {
      return NextResponse.json(
        { error: "Cannot purchase free plan" },
        { status: 400 }
      );
    }

    // Create Razorpay order
    const order = await RazorpayService.createOrder(
      Math.round(plan.priceINR * 100), // Convert to paise
      plan.id,
      plan.name,
      plan.credits
    );

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planId: plan.id,
      credits: plan.credits,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
