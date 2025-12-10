import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/auth",
  "/auth/callback",
  "/auth/signin",
  "/auth/signout",
  "/auth/error",
  "/login",
  "/signup",
  "/api/auth",
  // Admin routes are protected client-side via AdminLayout; keep them public for middleware
  "/admin",
];

// Check if path matches any public route
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Initialize response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Handle CORS for API routes (specifically for ads)
  if (pathname.startsWith("/api/ads")) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    // Add CORS headers to the main response
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return response;
  }

  // API routes handle their own auth, so we skip the middleware auth check for them
  if (pathname.startsWith("/api/")) {
    return response;
  }

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Use getSession to refresh the session if needed
  // This will automatically refresh expired access tokens using the refresh token
  const { data: { session }, error } = await supabase.auth.getSession();

  // BYPASS AUTH: Allow access even without session for now
  // if (error || !session) {
  //   // Not authenticated - redirect to login
  //   const loginUrl = new URL("/auth/signin", request.url);
  //   loginUrl.searchParams.set("callbackUrl", pathname);
  //   return NextResponse.redirect(loginUrl);
  // }

  // IMPORTANT: Return the response with updated cookies
  // This ensures refreshed tokens are saved to cookies
  return response;
}

// Protect all routes except static files and API routes (API routes handle their own auth)
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, html, txt, json, xml, etc.)
     * 
     * Note: We allow API routes to go through middleware to handle CORS for /api/ads
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|txt|json|xml|ico)$).*)",
  ],
};
