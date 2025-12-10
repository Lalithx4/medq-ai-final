import Stripe from "stripe";
import { env } from "@/env";

function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-09-30.clover",
  });
}

export class StripeService {
  static async createCheckoutSession(
    userId: string,
    planId: string,
    planName: string,
    amount: number, // in cents
    credits: number,
    baseUrl?: string
  ) {
    const stripe = getStripe();

    const appUrl = (baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://www.biodocs.ai") as string;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${planName} Plan`,
              description: `${credits.toLocaleString()} credits`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      metadata: {
        userId,
        planId,
        credits: credits.toString(),
      },
    });

    return session;
  }

  static async verifyWebhookSignature(
    payload: string,
    signature: string
  ): Promise<Stripe.Event | null> {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      return null;
    }

    try {
      const stripe = getStripe();
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error("Stripe webhook signature verification failed:", error);
      return null;
    }
  }

  static async getSession(sessionId: string) {
    const stripe = getStripe();
    return stripe.checkout.sessions.retrieve(sessionId);
  }
}
