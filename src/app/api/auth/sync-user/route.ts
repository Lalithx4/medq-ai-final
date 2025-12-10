import { NextResponse } from "next/server";
import { ensurePrismaUser } from "@/lib/auth/ensure-prisma-user";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    // Verify the request is authenticated
    const supabase = await getServerSupabase();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, email, name, image } = body;

    console.log("[SYNC USER] Syncing user:", { id, email, name: name ? "SET" : "MISSING" });

    // Ensure user exists in Prisma database
    const prismaUser = await ensurePrismaUser({
      id: id || supabaseUser.id,
      email: email || supabaseUser.email,
      name,
      image,
    });

    if (!prismaUser) {
      console.error("[SYNC USER] Failed to create/find user");
      return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
    }

    console.log("[SYNC USER] User synced successfully:", prismaUser.id);

    return NextResponse.json({ 
      success: true, 
      user: {
        id: prismaUser.id,
        email: prismaUser.email,
        name: prismaUser.name,
      }
    });
  } catch (error) {
    console.error("[SYNC USER] Error:", error);
    return NextResponse.json(
      { error: "Failed to sync user" },
      { status: 500 }
    );
  }
}
