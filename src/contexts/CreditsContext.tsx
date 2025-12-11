"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
// import { getBrowserSupabase } from "@/lib/supabase/client"; // Removed unused import
import { useAuth } from "@/providers/AuthProvider";

interface CreditsContextType {
  credits: number | null;
  loading: boolean;
  error: boolean;
  isEnabled: boolean;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(); // Use useAuth hook
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const fetchingRef = useRef(false);

  const refreshCredits = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      console.log("[CreditsContext] Fetch already in progress, skipping");
      return;
    }

    fetchingRef.current = true;
    setError(false);

    try {
      // Check if user is authenticated first (using AuthContext)
      if (!user) {
        // Not authenticated - don't try to fetch credits
        console.log("[CreditsContext] User not authenticated, skipping credits fetch");
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      console.log("[CreditsContext] Fetching credits from /api/credits/balance");
      const response = await fetch("/api/credits/balance", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("[CreditsContext] Failed to fetch credits:", response.status);

        // 401 means not authenticated - just skip
        if (response.status === 401) {
          console.log("[CreditsContext] Not authenticated, skipping");
          setLoading(false);
          fetchingRef.current = false;
          return;
        }

        // Keep previous value on error
        console.warn("[CreditsContext] Could not fetch credits, keeping previous value");
        setError(true);
        if (credits === null) {
          setCredits(0);
        }
        return;
      }

      const data = await response.json();
      console.log("[CreditsContext] Response data:", data);

      if (data.credits !== undefined && data.credits !== null) {
        const creditsValue = Number(data.credits);
        console.log("[CreditsContext] Setting credits to:", creditsValue);
        setCredits(creditsValue);
        setError(false);

        // Check if credits are unlimited (system disabled)
        if (creditsValue === 999999) {
          setIsEnabled(false);
        }
      } else {
        console.warn("[CreditsContext] API returned null/undefined credits");
        setError(true);
        if (credits === null) {
          setCredits(0);
        }
      }
    } catch (error) {
      console.error("[CreditsContext] Error fetching credits:", error);
      setError(true);
      if (credits === null) {
        setCredits(0);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [credits, user]);

  // Fetch on mount
  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  return (
    <CreditsContext.Provider value={{ credits, loading, error, isEnabled, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error("useCredits must be used within a CreditsProvider");
  }
  return context;
}
