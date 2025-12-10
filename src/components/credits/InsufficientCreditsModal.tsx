"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Coins, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { CREDIT_COSTS } from "@/lib/pricing/plans";

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: string;
  operationName: string;
  currentCredits: number;
  requiredCredits: number;
}

export function InsufficientCreditsModal({
  isOpen,
  onClose,
  operation,
  operationName,
  currentCredits,
  requiredCredits,
}: InsufficientCreditsModalProps) {
  const shortfall = requiredCredits - currentCredits;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Insufficient Credits
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            You don't have enough credits to use this feature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Feature Info */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Feature
              </span>
              <span className="text-sm font-semibold">{operationName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Required Credits
              </span>
              <span className="text-sm font-semibold text-primary">
                {requiredCredits} credits
              </span>
            </div>
          </div>

          {/* Current Balance */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Your Balance</span>
              </div>
              <span className="text-2xl font-bold text-destructive">
                {currentCredits}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">You need</span>
              <span className="font-semibold text-destructive">
                {shortfall} more credit{shortfall !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Benefits */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Upgrade Benefits</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Get 1,000+ credits per month</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Access all AI features unlimited</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Priority support & faster processing</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Link href="/pricing" className="w-full sm:w-auto">
            <Button className="w-full" size="lg">
              <Coins className="mr-2 h-4 w-4" />
              View Pricing Plans
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Low Credits Warning Modal
interface LowCreditsWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
}

export function LowCreditsWarningModal({
  isOpen,
  onClose,
  currentCredits,
}: LowCreditsWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Low Credits Warning
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            You're running low on credits
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coins className="h-6 w-6 text-yellow-600" />
              <span className="text-3xl font-bold text-yellow-600">
                {currentCredits}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              credits remaining
            </p>
          </div>

          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
            <p className="text-sm text-center text-muted-foreground">
              Consider upgrading your plan to avoid interruptions in your workflow
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Continue Anyway
          </Button>
          <Link href="/pricing" className="w-full sm:w-auto">
            <Button className="w-full bg-yellow-600 hover:bg-yellow-700">
              <TrendingUp className="mr-2 h-4 w-4" />
              Upgrade Now
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
