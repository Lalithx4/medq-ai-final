"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/home/AppLayout";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  // PayPal returns 'token' (orderId) and we pass planId via return_url
  const orderId = searchParams?.get("token");
  const planId = searchParams?.get("planId");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      if (!orderId || !planId) {
        setError("Missing order details");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/payment/paypal/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, planId }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Capture failed (${res.status})`);
        }
        setCaptured(true);
        setLoading(false);
      } catch (e: any) {
        setError(e?.message || "Failed to capture payment");
        setLoading(false);
      }
    };
    run();
  }, [orderId, planId]);

  return (
    <AppLayout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center">
          {loading ? (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
              <h2 className="text-2xl font-bold mb-2">Processing Payment...</h2>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment
              </p>
            </>
          ) : error ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="text-3xl">❌</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Link href="/pricing">
                <Button>Try Again</Button>
              </Link>
            </>
          ) : (
            <>
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-6">
                Your credits have been added to your account. You can now use all premium features.
              </p>
              <div className="space-y-3">
                <Link href="/" className="block">
                  <Button className="w-full">Go to Dashboard</Button>
                </Link>
                <Link href="/pricing" className="block">
                  <Button variant="outline" className="w-full">
                    View Plans
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
