"use client";

import { Coins } from "lucide-react";
import { toast } from "sonner";

export function showCreditUsage(
  creditsUsed: number,
  operation: string,
  remainingCredits: number
) {
  toast.custom(
    (t) => (
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-start gap-3 min-w-[300px]">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Coins className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm mb-1">Credits Used</div>
          <div className="text-xs text-muted-foreground mb-2">
            {operation}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-destructive font-medium">-{creditsUsed} credits</span>
            <span className="text-muted-foreground">
              {remainingCredits} remaining
            </span>
          </div>
        </div>
      </div>
    ),
    {
      duration: 4000,
    }
  );
}

export function showLowCreditsWarning(remainingCredits: number) {
  toast.warning(
    <div className="flex flex-col gap-1">
      <div className="font-semibold">Low Credits!</div>
      <div className="text-xs">
        You have {remainingCredits} credits left. Consider upgrading your plan.
      </div>
    </div>,
    {
      duration: 5000,
      action: {
        label: "Upgrade",
        onClick: () => {
          window.location.href = "/pricing";
        },
      },
    }
  );
}

export function showInsufficientCredits(required: number, available: number) {
  toast.error(
    <div className="flex flex-col gap-1">
      <div className="font-semibold">Insufficient Credits</div>
      <div className="text-xs">
        Need {required} credits, but you only have {available}. Please upgrade your plan.
      </div>
    </div>,
    {
      duration: 6000,
      action: {
        label: "View Plans",
        onClick: () => {
          window.location.href = "/pricing";
        },
      },
    }
  );
}
