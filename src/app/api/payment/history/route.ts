import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status"); // Filter by status if provided

    const where: any = { userId: user.id };
    if (status) {
      where.status = status;
    }

    const payments = await db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        plan: true,
        creditsAdded: true,
        stripePaymentId: true,
        razorpayPaymentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}
