import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout failed:", err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
