"use client";

import { Coins, TrendingUp, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCredits } from "@/contexts/CreditsContext";

export function CreditsDisplay({ compact = false }: { compact?: boolean }) {
  const { credits, loading, error, isEnabled } = useCredits();

  // If credit system is disabled, show unlimited badge
  if (!isEnabled) {
    if (compact) {
      return (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10 text-green-600 border border-green-500/20"
          title="Unlimited Credits"
        >
          <Infinity className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-green-600 border border-green-500/20">
          <Infinity className="w-4 h-4" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Unlimited</div>
            <div className="text-xs opacity-75">Credits disabled</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 animate-pulse">
        <Coins className="w-4 h-4" />
        <span className="text-sm">...</span>
      </div>
    );
  }

  const isLowCredits = credits !== null && credits < 20;
  const hasNoCredits = credits === 0;

  if (compact) {
    // Collapsed sidebar: show only icon with badge
    return (
      <Link href="/pricing" className="block">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer transition-all hover:scale-105 relative ${
            hasNoCredits
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : isLowCredits
              ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
              : "bg-primary/10 text-primary border border-primary/20"
          }`}
          title={`${credits || 0} Credits`}
        >
          <Coins className="w-5 h-5" />
          {(isLowCredits || hasNoCredits) && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border-2 border-background" />
          )}
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      <Link href="/pricing" className="block">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all hover:scale-105 ${
            hasNoCredits
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : isLowCredits
              ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
              : "bg-primary/10 text-primary border border-primary/20"
          }`}
        >
          <Coins className="w-4 h-4" />
          <div className="flex-1">
            <div className="text-sm font-semibold">{credits || 0} Credits</div>
            {hasNoCredits && (
              <div className="text-xs opacity-75">Click to buy credits</div>
            )}
          </div>
          {(isLowCredits || hasNoCredits) && (
            <TrendingUp className="w-3 h-3" />
          )}
        </div>
      </Link>
    </div>
  );
}
