import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getServerSupabase } from "@/lib/supabase/server";
import { ensurePrismaUser } from "@/lib/auth/ensure-prisma-user";

export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      console.log("[Profile API] No user session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Profile API] Fetching profile for user:", user.id);

    let dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        credits: true,
        subscriptionPlan: true,
        subscriptionEnd: true,
      },
    });

    // If user doesn't exist in Prisma, create them
    if (!dbUser) {
      console.log("[Profile API] User not found in database, creating:", user.id);
      const newUser = await ensurePrismaUser({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        image: user.user_metadata?.avatar_url,
      });

      if (!newUser) {
        console.error("[Profile API] Failed to create user");
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }

      // Fetch the newly created user
      dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          credits: true,
          subscriptionPlan: true,
          subscriptionEnd: true,
        },
      });
    }

    if (!dbUser) {
      console.log("[Profile API] User still not found after creation attempt");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("[Profile API] Successfully fetched profile");
    return NextResponse.json({ user: dbUser });
  } catch (error) {
    console.error("[Profile API] Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    // Only allow updating name for now (email changes require verification)
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Invalid name provided" },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}
