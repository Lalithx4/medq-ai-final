"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Calendar, RefreshCw, TrendingUp, AlertTriangle, Zap } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { PRICING_PLANS } from "@/lib/pricing/plans";

interface SubscriptionData {
  plan: string;
  planName: string;
  credits: number;
  monthlyCredits: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  lastRefresh: string | null;
  daysUntilRefresh: number | null;
}

export function SubscriptionTab() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/subscription/status");
      const data = await response.json();
      if (data.success) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
      toast.error("Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowCancelDialog(false);
        fetchSubscription();
      } else {
        toast.error(data.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error("Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Failed to load subscription details
        </CardContent>
      </Card>
    );
  }

  const currentPlan = PRICING_PLANS.find(p => p.id === subscription.plan);
  const isFreePlan = subscription.plan === "free";

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                {subscription.isActive && !isFreePlan && (
                  <Badge variant="default">Active</Badge>
                )}
                {isFreePlan && <Badge variant="secondary">Free</Badge>}
              </CardTitle>
              <CardDescription>
                {subscription.planName} Plan
              </CardDescription>
            </div>
            {currentPlan?.popular && (
              <Badge variant="default" className="gap-1">
                <Zap className="h-3 w-3" />
                Popular
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credits Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Current Credits</p>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <p className="text-3xl font-bold">{subscription.credits.toLocaleString()}</p>
            </div>

            {!isFreePlan && (
              <>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">Monthly Allowance</p>
                  <p className="text-3xl font-bold">{subscription.monthlyCredits.toLocaleString()}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">Days Until Refresh</p>
                  <p className="text-3xl font-bold">
                    {subscription.daysUntilRefresh !== null ? subscription.daysUntilRefresh : "N/A"}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Subscription Dates */}
          {!isFreePlan && subscription.startDate && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Subscription Started
                </span>
                <span className="font-medium">{formatDate(subscription.startDate)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Next Billing Date
                </span>
                <span className="font-medium">{formatDate(subscription.endDate)}</span>
              </div>
              {subscription.lastRefresh && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Last Credit Refresh
                  </span>
                  <span className="font-medium">{formatDate(subscription.lastRefresh)}</span>
                </div>
              )}
            </div>
          )}

          {/* Plan Features */}
          {currentPlan && (
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-3">Plan Features</h4>
              <ul className="space-y-2">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            {isFreePlan ? (
              <Link href="/pricing" className="flex-1">
                <Button className="w-full" size="lg">
                  Upgrade to Pro
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/pricing" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Change Plan
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                  className="flex-1"
                >
                  Cancel Subscription
                </Button>
              </>
            )}
          </div>

          {/* Info Alert */}
          {!isFreePlan && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Your credits automatically refresh every 30 days. Unused credits do not roll over.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Compare plans and upgrade anytime
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`p-4 rounded-lg border-2 ${
                  plan.id === subscription.plan
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{plan.name}</h4>
                  {plan.id === subscription.plan && (
                    <Badge variant="default" className="text-xs">Current</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold mb-1">
                  ${plan.priceUSD}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  {plan.credits.toLocaleString()} credits/month
                </p>
                {plan.id !== subscription.plan && (
                  <Link href="/pricing">
                    <Button variant="outline" size="sm" className="w-full">
                      {plan.priceUSD === 0 ? "Downgrade" : "Upgrade"}
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You will retain access to your current plan until the end of your billing period ({formatDate(subscription.endDate)}), after which you'll be downgraded to the Free plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Subscription"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
