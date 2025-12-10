import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

function maskKey(key: string | undefined) {
  if (!key) return "MISSING";
  if (key.length <= 8) return `${key.slice(0, 4)}…len=${key.length}`;
  return `${key.slice(0, 4)}…${key.slice(-4)} len=${key.length}`;
}

// Client-side Supabase instance for use in client components
export function getBrowserSupabase() {
  // Return cached instance if it exists
  if (browserClient) {
    return browserClient;
  }

  // Only create client in browser environment
  if (typeof window === "undefined") {
    // During SSR/build, return a dummy client that will be replaced in browser
    return createBrowserClient("https://placeholder.supabase.co", "placeholder-key");
  }

  // In browser, prefer build-time env and fall back to runtime-injected window.__ENV
  const runtimeEnv = (window as any).__ENV ?? {};
  const url: string | undefined =
    process.env.NEXT_PUBLIC_SUPABASE_URL || runtimeEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key: string | undefined =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || runtimeEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Extensive debug logging to diagnose production issues
  try {
    // eslint-disable-next-line no-console
    console.log("[SUPABASE CLIENT] Resolving env", {
      hasWindowEnv: !!runtimeEnv && Object.keys(runtimeEnv).length > 0,
      windowEnvKeys: Object.keys(runtimeEnv || {}),
      nextPublicEnvKeys: Object.keys(process.env || {}).filter((k) =>
        k.startsWith("NEXT_PUBLIC")
      ),
      urlPresent: !!url,
      anonKeyPresent: !!key,
      urlPreview: url ? `${url.slice(0, 30)}…` : "MISSING",
      anonKeyMasked: maskKey(key),
    });
  } catch (_err) {
    // ignore logging errors
  }

  if (!url || !key) {
    // eslint-disable-next-line no-console
    console.error("[SUPABASE CLIENT] Missing env for Supabase", {
      url: url || "MISSING",
      anonKey: key ? "SET" : "MISSING",
    });
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Railway and redeploy."
    );
  }

  // eslint-disable-next-line no-console
  console.log("[SUPABASE CLIENT] Creating browser client with URL", url);

  browserClient = createBrowserClient(url, key);
  return browserClient;
}


