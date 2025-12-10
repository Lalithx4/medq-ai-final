import { NextResponse } from "next/server";

import { DiscoverService, type DiscoverSource } from "@/lib/discover/discover-service";

const service = new DiscoverService();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const typeParam = (searchParams.get("type") || "all").toLowerCase();
    const specialtyParam = (searchParams.get("specialty") || "all").trim();
    const sourceParam = (searchParams.get("source") || "web").toLowerCase();
    const cursor = searchParams.get("cursor");

    const type = ["all", "news", "journal", "trial", "guideline", "innovation"].includes(
      typeParam,
    )
      ? (typeParam as any)
      : "all";

    const source: DiscoverSource = sourceParam === "pubmed" ? "pubmed" : "web";

    const result = await service.getFeed({
      type,
      specialty: specialtyParam || "all",
      source,
      cursor: cursor || null,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[Discover] Failed to get feed", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load discover feed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
