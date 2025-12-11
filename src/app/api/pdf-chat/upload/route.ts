import { getServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { CreditService } from "@/lib/credits/credit-service";
import { CREDIT_COSTS } from "@/lib/pricing/plans";

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const collectionId = formData.get("collectionId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 100MB limit" },
        { status: 400 }
      );
    }

    // Credits: compute cost by size (ceil MB)
    const sizeMb = Math.max(1, Math.ceil(file.size / (1024 * 1024)));
    const uploadCost = sizeMb * (CREDIT_COSTS["pdf-upload"] || 1);

    if (uploadCost > 0) {
      const hasCredits = await CreditService.hasEnoughCreditsForAmount(user.id, uploadCost);
      if (!hasCredits) {
        return NextResponse.json(
          { error: `Insufficient credits. Requires ${uploadCost} credits for a ${sizeMb}MB PDF.` },
          { status: 402 }
        );
      }
      // Deduct immediately for upload/storage & pre-processing cost
      const deducted = await CreditService.deductAmount(
        user.id,
        uploadCost,
        `PDF upload (${file.name}) - ${sizeMb}MB @ ${CREDIT_COSTS["pdf-upload"] || 1}/MB`,
        "pdf_upload_size"
      );
      if (!deducted.success) {
        return NextResponse.json(
          { error: deducted.error || "Failed to deduct credits" },
          { status: 402 }
        );
      }
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "data", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${user.id}_${timestamp}_${sanitizedFilename}`;
    const filePath = join(uploadsDir, filename);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create document record in database
    const newId = randomUUID();
    const nowIso = new Date().toISOString();

    console.log("📝 Creating document record:", {
      id: newId,
      user_id: user.id,
      collection_id: collectionId || null,
      filename: filename,
      original_filename: file.name,
      file_size: file.size,
    });

    const { data: document, error: dbError } = await supabase
      .from("pdf_documents")
      .insert({
        id: newId,
        user_id: user.id,
        collection_id: collectionId || null,
        filename: filename,
        original_filename: file.name,
        file_url: filePath,
        file_size: file.size,
        status: "uploading",
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .single();

    if (dbError) {
      console.error("❌ Database error creating document:", {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code,
        collection_id: collectionId,
      });
      return NextResponse.json(
        {
          error: "Failed to create document record",
          details: dbError.message,
          hint: dbError.hint,
          code: dbError.code
        },
        { status: 500 }
      );
    }

    console.log("✅ Document record created:", document.id);

    // Update status to ready for processing
    const targetId = document?.id ?? newId;

    await supabase
      .from("pdf_documents")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", targetId);

    return NextResponse.json({
      documentId: targetId,
      filename: file.name,
      status: "pending",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
