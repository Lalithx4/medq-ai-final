// Server-side auth callback handler
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ensurePrismaUser } from "@/lib/auth/ensure-prisma-user";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const callbackUrl = requestUrl.searchParams.get("callbackUrl") || "/";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Determine the correct base URL for redirects
  // Railway's internal request.url shows localhost:8080, but we need the public domain
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  
  // Build the correct public base URL
  let baseUrl: string;
  if (forwardedHost && !forwardedHost.includes("localhost")) {
    baseUrl = `${forwardedProto}://${forwardedHost}`;
  } else if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  } else {
    // Fallback to production domain
    baseUrl = "https://www.biodocs.ai";
  }

  // Handle OAuth errors
  if (error) {
    console.error("[AUTH CALLBACK] OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(errorDescription || error)}`, baseUrl)
    );
  }

  if (code) {
    const response = NextResponse.redirect(new URL(callbackUrl, baseUrl));

    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        return NextResponse.redirect(
          new URL(`/auth/signin?error=${encodeURIComponent(exchangeError.message)}`, baseUrl)
        );
      }

      // Sync user to Prisma database directly (no HTTP call needed)
      if (data.user) {
        try {
          await ensurePrismaUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.user_metadata?.full_name,
            image: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
          });
        } catch {
          // Sync error is non-fatal, continue with redirect
        }

        // Check if user is admin and redirect accordingly
        const { data: profile } = await supabase
          .from('User')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role === 'ADMIN') {
          // Admin users go to admin dashboard
          // IMPORTANT: We must preserve the cookies set on the 'response' object
          const adminRedirect = NextResponse.redirect(new URL('/admin', baseUrl));
          
          // Copy cookies from the original response (where Supabase auth set the session)
          const cookies = response.cookies.getAll();
          cookies.forEach(cookie => {
            adminRedirect.cookies.set(cookie.name, cookie.value, cookie);
          });
          
          return adminRedirect;
        }
      }

      return response;
    } catch {
      return NextResponse.redirect(
        new URL(`/auth/signin?error=${encodeURIComponent("Authentication failed")}`, baseUrl)
      );
    }
  }

  // No code - redirect to signin
  return NextResponse.redirect(new URL("/auth/signin", baseUrl));
}
