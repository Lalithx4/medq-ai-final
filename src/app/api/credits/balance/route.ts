import { CreditService } from "@/lib/credits/credit-service";
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { db } from "@/server/db";

export async function GET() {
  try {
    const supabase = await getServerSupabase();
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    // MOCK USER FALLBACK (for development)
    if (!user && process.env.NODE_ENV === "development") {
      const mockUserId = "mock-user-id";
      console.log("[Credits API] Using mock user:", mockUserId);

      // Upsert mock user to ensure database integrity
      await db.user.upsert({
        where: { id: mockUserId },
        update: {},
        create: {
          id: mockUserId,
          email: "test@example.com",
          name: "Mock User",
          role: "USER",
          credits: 100,
          hasAccess: true // Grant access
        }
      });

      user = { id: mockUserId, email: "test@example.com" } as any;
    }

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
