import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "@/env";

const razorpay =
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      })
    : null;

export class RazorpayService {
  static async createOrder(
    amount: number, // in paise (smallest currency unit)
    planId: string,
    planName: string,
    credits: number
  ) {
    if (!razorpay) {
      throw new Error("Razorpay is not configured");
    }

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `order_${Date.now()}`,
      notes: {
        planId,
        planName,
        credits: credits.toString(),
      },
    });

    return order;
  }

  static verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    if (!env.RAZORPAY_KEY_SECRET) {
      return false;
    }

    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    return generatedSignature === signature;
  }

  static verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    return expectedSignature === signature;
  }

  static async getPayment(paymentId: string) {
    if (!razorpay) {
      throw new Error("Razorpay is not configured");
    }

    return razorpay.payments.fetch(paymentId);
  }
}
