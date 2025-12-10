import { NextResponse } from "next/server";
import { PayPalService } from "@/lib/payment/paypal-service";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await req.json();
    if (!planId) {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }

    // Build base URL from request to avoid invalid URLs
    const forwardedProto = (req.headers as any).get?.("x-forwarded-proto") || "https";
    const host = (req.headers as any).get?.("x-forwarded-host") || (req.headers as any).get?.("host");
    const baseUrl = host ? `${forwardedProto}://${host}` : undefined;

    const { orderId, approveUrl } = await PayPalService.createOrder({
      userId: user.id,
      planId,
      baseUrl,
    });

    return NextResponse.json({ orderId, approveUrl });
  } catch (error) {
    console.error("PayPal create-order error:", error);
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 }
    );
  }
}
