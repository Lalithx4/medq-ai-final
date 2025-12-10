import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
      SUPABASE_URL: process.env.SUPABASE_URL ? "SET" : "MISSING",
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? "SET" : "MISSING",
      CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY ? "SET" : "MISSING",
      NCBI_API_KEY: process.env.NCBI_API_KEY ? "SET" : "MISSING",
    },
    deepResearch: {
      status: "unknown",
      error: null,
    },
    database: {
      status: "unknown",
      error: null,
    },
    supabase: {
      url: process.env.SUPABASE_URL || "MISSING",
      keyPresent: !!process.env.SUPABASE_ANON_KEY,
    },
  };

  // Test deep research imports
  try {
    const { PubMedService } = await import("@/lib/deep-research/pubmed-service");
    const { FallbackResearchService } = await import("@/lib/deep-research/fallback-sources");
    const { RateLimiterManager } = await import("@/lib/deep-research/rate-limiter");
    checks.deepResearch.status = "imports_ok";
    checks.deepResearch.modules = {
      PubMedService: typeof PubMedService,
      FallbackResearchService: typeof FallbackResearchService,
      RateLimiterManager: typeof RateLimiterManager,
    };
  } catch (error) {
    checks.deepResearch.status = "import_error";
    checks.deepResearch.error = error instanceof Error ? error.message : String(error);
    console.error("[HEALTH] Deep research import failed:", error);
  }

  // Test database connection
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database.status = "connected";
  } catch (error) {
    checks.database.status = "error";
    checks.database.error = error instanceof Error ? error.message : String(error);
    console.error("[HEALTH] Database connection failed:", error);
  }

  const hasIssues = 
    checks.database.status !== "connected" ||
    checks.deepResearch.status === "import_error" ||
    checks.env.DATABASE_URL === "MISSING" ||
    checks.env.SUPABASE_URL === "MISSING" ||
    checks.env.SUPABASE_ANON_KEY === "MISSING" ||
    checks.env.CEREBRAS_API_KEY === "MISSING";

  return NextResponse.json(
    {
      healthy: !hasIssues,
      checks,
    },
    { status: hasIssues ? 503 : 200 }
  );
}
