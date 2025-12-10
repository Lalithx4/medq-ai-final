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

    const { orderId, planId } = await req.json();
    if (!orderId || !planId) {
      return NextResponse.json({ error: "Missing orderId or planId" }, { status: 400 });
    }

    const result = await PayPalService.captureOrder({
      orderId,
      userId: user.id,
      planId,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("PayPal capture error:", error);
    return NextResponse.json(
      { error: "Failed to capture PayPal order" },
      { status: 500 }
    );
  }
}
