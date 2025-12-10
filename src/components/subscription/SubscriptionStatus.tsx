"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CreditCard, RefreshCw, TrendingUp } from "lucide-react";
import Link from "next/link";

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

export function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return null;
  }

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Subscription Status
              {subscription.isActive && subscription.plan !== "free" && (
                <Badge variant="default" className="ml-2">Active</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {subscription.planName} Plan
            </CardDescription>
          </div>
          <CreditCard className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credits */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div>
            <p className="text-sm text-muted-foreground">Current Credits</p>
            <p className="text-2xl font-bold">{subscription.credits.toLocaleString()}</p>
          </div>
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>

        {/* Monthly Allowance */}
        {subscription.plan !== "free" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Monthly Allowance</p>
              <p className="text-lg font-semibold">{subscription.monthlyCredits.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Days Until Refresh</p>
              <p className="text-lg font-semibold">
                {subscription.daysUntilRefresh !== null ? subscription.daysUntilRefresh : "N/A"}
              </p>
            </div>
          </div>
        )}

        {/* Subscription Dates */}
        {subscription.plan !== "free" && subscription.startDate && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Started
              </span>
              <span className="font-medium">{formatDate(subscription.startDate)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Next Billing
              </span>
              <span className="font-medium">{formatDate(subscription.endDate)}</span>
            </div>
            {subscription.lastRefresh && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Last Refresh
                </span>
                <span className="font-medium">{formatDate(subscription.lastRefresh)}</span>
              </div>
            )}
          </div>
        )}

        {/* Upgrade Button for Free Plan */}
        {subscription.plan === "free" && (
          <Link href="/pricing" className="block">
            <Button className="w-full" size="lg">
              Upgrade to Pro
            </Button>
          </Link>
        )}

        {/* Info Text */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          {subscription.plan === "free" 
            ? "Upgrade to a paid plan for monthly credit refresh"
            : "Your credits automatically refresh every 30 days"}
        </p>
      </CardContent>
    </Card>
  );
}
