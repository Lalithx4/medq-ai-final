"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Legacy /auth/login route: immediately redirect to the canonical /auth/signin page.
// This avoids any old OAuth logic or env-based base URLs that might point to localhost.
export default function LoginPageRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    const target = params ? `/auth/signin?${params}` : "/auth/signin";
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white/70 dark:bg-black/40 backdrop-blur p-6 shadow text-center">
        <h1 className="text-xl font-semibold mb-2">Redirecting to sign in...</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Please wait while we take you to the secure Google sign-in page.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">If you are not redirected automatically, refresh the page.</p>
      </div>
    </div>
  );
}
