import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * DELETE /api/pdf-chat/sessions/[id]
 * Delete a chat session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = params.id;

    // Verify ownership
    const { data: session, error: sessionError } = await supabase
      .from("pdf_chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Delete messages first (due to foreign key constraint)
    await supabase
      .from("pdf_chat_messages")
      .delete()
      .eq("session_id", sessionId);

    // Delete session
    const { error: deleteError } = await supabase
      .from("pdf_chat_sessions")
      .delete()
      .eq("id", sessionId);

    if (deleteError) {
      console.error("Failed to delete session:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
