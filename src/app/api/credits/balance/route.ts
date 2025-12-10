import { CreditService } from "@/lib/credits/credit-service";
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log("[Credits API] Auth check:", { 
      hasUser: !!user, 
      userId: user?.id?.slice(0, 8), 
      authError: authError?.message 
    });
    
    if (!user?.id) {
      console.log("[Credits API] No user found, returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const balance = await CreditService.getBalance(user.id);
    console.log(`[Credits API] User ${user.id} balance: ${balance}`);

    return NextResponse.json({ credits: balance });
  } catch (error) {
    console.error("[Credits API] Error fetching credit balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit balance", credits: 0 },
      { status: 500 }
    );
  }
}
