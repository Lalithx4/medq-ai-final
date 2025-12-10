import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client using Next.js App Router cookies
export async function getServerSupabase() {
  const cookieStore = await cookies();
  
  // Debug env presence (masked)
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    const masked = key ? `${key.slice(0, 6)}…len=${key.length}` : "MISSING";
    console.log("[SERVER SUPABASE ENV] URL:", url ? "SET" : "MISSING", " ANON_KEY:", masked);
  } catch {}
  
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie setting errors in middleware/server components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // Handle cookie removal errors in middleware/server components
          }
        },
      },
    }
  );
}

// Service Role Supabase client for admin operations (bypasses RLS)
// Use this only when you need to perform operations that require elevated privileges
export function getServiceRoleSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    console.warn("[SERVICE ROLE SUPABASE] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY, falling back to anon key");
    // Fallback to anon key if service role key is not available
    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }
  
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

