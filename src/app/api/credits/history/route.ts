import { CreditService } from "@/lib/credits/credit-service";
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log("[Credits History API] User ID:", user?.id);
    
    if (!user?.id) {
      console.warn("[Credits History API] Unauthorized - no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    
    console.log("[Credits History API] Fetching history for user:", user.id, "limit:", limit);

    const history = await CreditService.getTransactionHistory(user.id, limit);
    
    console.log("[Credits History API] Found transactions:", history.length);
    console.log("[Credits History API] Transactions:", JSON.stringify(history, null, 2));

    return NextResponse.json({ transactions: history });
  } catch (error) {
    console.error("[Credits History API] Error fetching transaction history:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction history" },
      { status: 500 }
    );
  }
}
