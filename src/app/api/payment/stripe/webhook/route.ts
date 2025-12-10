import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { StripeService } from "@/lib/payment/stripe-service";
import { db } from "@/server/db";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    const event = await StripeService.verifyWebhookSignature(body, signature);

    if (!event) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session.metadata.userId;
        const planId = session.metadata.planId;
        const credits = parseInt(session.metadata.credits);

        // Add credits to user account
        await db.$transaction([
          db.payment.create({
            data: {
              userId,
              amount: session.amount_total / 100, // Convert cents to dollars
              currency: "USD",
              status: "completed",
              plan: planId,
              creditsAdded: credits,
              stripePaymentId: session.payment_intent as string,
            },
          }),
          db.user.update({
            where: { id: userId },
            data: {
              credits: { increment: credits },
              subscriptionPlan: planId,
              subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              stripeCustomerId: session.customer as string,
            },
          }),
          db.creditTransaction.create({
            data: {
              userId,
              amount: credits,
              type: "purchase",
              description: `Purchased ${planId} plan via Stripe`,
            },
          }),
        ]);

        console.log(`Payment successful for user ${userId}, added ${credits} credits`);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as any;
        console.log(`Checkout session expired: ${session.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
