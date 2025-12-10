import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, title, content, htmlContent } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Get user from database
    const dbUser = await db.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let savedDocument;

    if (id) {
      // Update existing document
      // First check if document exists and belongs to user
      const existingDoc = await db.document.findFirst({
        where: { 
          id,
          userId: dbUser.id 
        },
      });

      if (!existingDoc) {
        return NextResponse.json(
          { error: "Document not found or access denied" },
          { status: 404 }
        );
      }

      savedDocument = await db.document.update({
        where: { id },
        data: {
          title,
          content,
          updatedAt: new Date(),
        },
      });
      console.log("✅ Document updated:", savedDocument.id);
    } else {
      // Create new document
      savedDocument = await db.document.create({
        data: {
          title,
          content,
          type: "document", // AI editor documents
          userId: dbUser.id,
        },
      });
      console.log("✅ Document created:", savedDocument.id);
    }

    return NextResponse.json({
      success: true,
      document: savedDocument,
      documentId: savedDocument.id,
    });
  } catch (error) {
    console.error("❌ Error saving document:", error);
    return NextResponse.json(
      { error: "Failed to save document" },
      { status: 500 }
    );
  }
}
