/**
 * Admin check utility for ads API routes
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function checkAdminAccess(): Promise<{
  isAdmin: boolean;
  userId?: string;
  error?: NextResponse;
}> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isAdmin: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("User")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "ADMIN") {
    return {
      isAdmin: false,
      userId: user.id,
      error: NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 }),
    };
  }

  return {
    isAdmin: true,
    userId: user.id,
  };
}
