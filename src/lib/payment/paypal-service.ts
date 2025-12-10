// Use require to avoid ESM/CJS interop issues in Next.js server routes
// eslint-disable-next-line @typescript-eslint/no-var-requires
const paypal: any = require('@paypal/checkout-server-sdk');
import { db } from '@/server/db';
import { getPlanById } from '@/lib/pricing/plans';

const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const FALLBACK_BASE_URL = 'http://localhost:3000';

function getClient() {
  const env = PAYPAL_ENV === 'live'
    ? new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);
  return new paypal.core.PayPalHttpClient(env);
}

export const PayPalService = {
  async createOrder({ userId, planId, baseUrl }: { userId: string; planId: string; baseUrl?: string }) {
    const plan = getPlanById(planId);
    if (!plan) throw new Error('Invalid plan');

    // USD only for PayPal in this implementation
    const amount = plan.priceUSD.toFixed(2);

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    const appBaseUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : FALLBACK_BASE_URL);

    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `${userId}-${planId}`,
          amount: {
            currency_code: 'USD',
            value: amount,
          },
          description: `${plan.name} - ${plan.credits} credits`,
        },
      ],
      application_context: {
        brand_name: 'BioDocsAI',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: `${appBaseUrl}/payment/success?planId=${planId}`,
        cancel_url: `${appBaseUrl}/payment/cancel`,
      },
    });

    const client = getClient();
    const order = await client.execute(request);

    const approveUrl = order.result.links?.find((l: any) => l.rel === 'approve')?.href as string | undefined;
    const orderId = order.result.id as string;

    if (!approveUrl) throw new Error('Unable to get PayPal approval URL');

    return { orderId, approveUrl };
  },

  async captureOrder({ orderId, userId, planId }: { orderId: string; userId: string; planId: string }) {
    const plan = getPlanById(planId);
    if (!plan) throw new Error('Invalid plan');

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const client = getClient();
    const capture = await client.execute(request);

    const status = capture.result.status;
    if (status !== 'COMPLETED') {
      throw new Error(`Capture failed with status ${status}`);
    }

    // Persist payment + subscription updates
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await db.$transaction(async (tx) => {
      // Credit transaction history
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: plan.credits,
          type: 'purchase',
          operation: 'paypal',
          description: `${plan.name} plan via PayPal` ,
        },
      });

      // Update user plan and credits
      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionPlan: plan.id,
          subscriptionEnd: nextMonth,
          credits: plan.credits,
        },
      });

      // Optional: save payment row if you keep a table
      // await tx.payment.create({...})
    });

    return { success: true, capture: capture.result };
  },
};
