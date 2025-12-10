import { NextResponse } from "next/server";
import { RazorpayService } from "@/lib/payment/razorpay-service";
import { CreditService } from "@/lib/credits/credit-service";
import { SubscriptionService } from "@/lib/subscription/subscription-service";
import { db } from "@/server/db";
import { getPlanById } from "@/lib/pricing/plans";
import { getServerSupabase } from "@/lib/supabase/server";
import { generateId } from "ai";

export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, paymentId, signature, planId } = await req.json();

    // Verify payment signature
    const isValid = RazorpayService.verifyPaymentSignature(
      orderId,
      paymentId,
      signature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    const plan = getPlanById(planId);
    
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get payment details
    const payment = await RazorpayService.getPayment(paymentId);

    // Create payment record
    const now = new Date();
    await db.payment.create({
      data: {
        id: generateId(),
        userId: user.id,
        amount: Number(payment.amount) / 100, // Convert paise to rupees
        currency: "INR",
        status: "completed",
        plan: plan.id,
        creditsAdded: plan.credits,
        razorpayPaymentId: paymentId,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Set up subscription with credit refresh
    await SubscriptionService.createSubscription(user.id, plan.id);

    // Create transaction record
    await db.creditTransaction.create({
      data: {
        id: generateId(),
        userId: user.id,
        amount: plan.credits,
        type: "purchase",
        description: `Purchased ${plan.name} plan - Monthly subscription`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified and credits added",
      credits: plan.credits,
    });
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
