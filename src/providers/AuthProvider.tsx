"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

export type AuthContextType = {
  user: { id: string; email: string | null } | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [user, setUser] = useState<AuthContextType["user"]>(null);
  const [loading, setLoading] = useState(true);

  // Refresh session periodically to keep it alive
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("[AuthProvider] Session refresh error:", error);
        return;
      }
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
      }
    } catch (err) {
      console.error("[AuthProvider] Session refresh failed:", err);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // BYPASS AUTH: Mock user for development
        console.log("[AuthProvider] Bypassing auth with mock user");
        setUser({ id: "mock-user-id", email: "test@example.com" });
        setLoading(false);

        // If on auth page, redirect to dashboard
        if (pathname?.startsWith("/auth")) {
          router.replace("/dashboard");
        }
        return;

        /* ORIGINAL AUTH LOGIC COMMENTED OUT
        // Use getSession first to refresh if needed, then getUser for validation
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email });
        } else {
          setUser(null);
        }
        setLoading(false);
        
        // If already signed in and currently on an auth route, go to dashboard
        if (session?.user && pathname?.startsWith("/auth")) {
          router.replace("/dashboard");
        }
        */
      } catch {
        setLoading(false);
      }
    }

    /* ORIGINAL SUBSCRIPTION COMMENTED OUT
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthProvider] Auth state changed:", event);
      switch (event) {
        case "SIGNED_IN": {
          setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
          break;
        }
        case "SIGNED_OUT": {
          setUser(null);
          break;
        }
        case "TOKEN_REFRESHED": {
          console.log("[AuthProvider] Token refreshed successfully");
          setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
          break;
        }
      }
    });
    */

    void init();

    // Refresh session every 10 minutes to keep it alive
    // const refreshInterval = setInterval(refreshSession, 10 * 60 * 1000);

    // Also refresh on window focus (user returns to tab)
    // const handleFocus = () => {
    //   refreshSession();
    // };
    // window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      // sub.subscription.unsubscribe();
      // clearInterval(refreshInterval);
      // window.removeEventListener("focus", handleFocus);
    };
  }, [router, pathname, supabase, refreshSession]);

  const value = useMemo(() => ({ user, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
