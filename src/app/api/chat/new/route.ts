import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/lib/chat/chat-service";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

import { db } from "@/server/db";

export async function POST(req: NextRequest) {
    try {
        const supabase = await getServerSupabase();
        let { data: { user } } = await supabase.auth.getUser();

        // MOCK USER FALLBACK (for development)
        if (!user && process.env.NODE_ENV === "development") {
            const mockUserId = "mock-user-id";
            console.log("[API] Using mock user:", mockUserId);

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
                    hasAccess: true
                }
            });

            user = { id: mockUserId, email: "test@example.com" } as any;
        }

        if (!user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { context, title } = await req.json();

        if (!context || !context.type) {
            return NextResponse.json({ error: "Context type is required" }, { status: 400 });
        }

        const id = await chatService.createConversation(
            user.id,
            context,
            title
        );

        return NextResponse.json({ id });
    } catch (error) {
        console.error("Create Chat API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
