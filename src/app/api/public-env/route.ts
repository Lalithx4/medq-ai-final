import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const maskedKey = key ? `${key.slice(0, 6)}…len=${key.length}` : "MISSING";
  console.log("[API/public-env] Returning public env: ", {
    url: url ? "SET" : "MISSING",
    anonKey: maskedKey,
    appUrl: appUrl ? "SET" : "MISSING",
  });

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
    NEXT_PUBLIC_APP_URL: appUrl,
  });
}
