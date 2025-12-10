"use client";

import { useEffect } from "react";

function maskKey(key?: string) {
  if (!key) return "MISSING";
  return `${key.slice(0, 6)}…len=${key.length}`;
}

export function EnvRuntimeProvider() {
  useEffect(() => {
    async function ensureEnv() {
      try {
        const envObj: any = (window as any).__ENV || {};
        const url: string | undefined = envObj.NEXT_PUBLIC_SUPABASE_URL;
        const anon: string | undefined = envObj.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (url && anon) {
          console.log("[ENV BOOT] window.__ENV present (from SSR)", {
            url: url ? "SET" : "MISSING",
            anon: maskKey(anon),
          });
          (window as any).__ENV = envObj;
          (window as any).__ENV_READY__ = true;
          return;
        }

        // Fallback: fetch from server at runtime
        const res = await fetch("/api/public-env", { credentials: "same-origin" });
        const data = await res.json();
        (window as any).__ENV = {
          NEXT_PUBLIC_SUPABASE_URL: data.NEXT_PUBLIC_SUPABASE_URL || "",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: data.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
          NEXT_PUBLIC_APP_URL: data.NEXT_PUBLIC_APP_URL || "",
        };
        console.log("[ENV BOOT] fetched /api/public-env", {
          url: data.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING",
          anon: maskKey(data.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        });
        (window as any).__ENV_READY__ = true;
        // Notify listeners that env is ready
        window.dispatchEvent(new CustomEvent("env-ready"));
      } catch (e) {
        console.error("[ENV BOOT] failed to ensure env", e);
      }
    }
    ensureEnv();
  }, []);

  return null;
}
