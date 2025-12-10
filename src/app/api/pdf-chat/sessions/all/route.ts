import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * GET /api/pdf-chat/sessions/all
 * Get all chat sessions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all sessions for this user with document info
    const { data: sessions, error: sessionsError } = await supabase
      .from("pdf_chat_sessions")
      .select(`
        *,
        pdf_documents(
          filename,
          original_filename
        )
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (sessionsError) {
      console.error("Failed to fetch sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Get all sessions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
