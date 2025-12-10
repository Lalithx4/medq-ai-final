"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/home/AppLayout";
import { Button } from "@/components/ui/button";
import { Check, Zap, Loader2 } from "lucide-react";
import { PRICING_PLANS } from "@/lib/pricing/plans";
import { toast } from "sonner";

// Get payment provider from env (defaults to razorpay)
const DEFAULT_PAYMENT_PROVIDER = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || "razorpay";

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [isIndian, setIsIndian] = useState<boolean | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(true);

  // Detect user location on mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        // Use a free geolocation API
        const response = await fetch("https://ipapi.co/json/", {
          cache: "force-cache",
        });
        const data = await response.json();
        setIsIndian(data.country_code === "IN");
      } catch (error) {
        console.error("Failed to detect location:", error);
        // Default to payment provider setting if detection fails
        setIsIndian(DEFAULT_PAYMENT_PROVIDER === "razorpay");
      } finally {
        setDetectingLocation(false);
      }
    };

    detectLocation();
  }, []);

  // Determine payment provider based on location
  const paymentProvider = isIndian ? "razorpay" : (DEFAULT_PAYMENT_PROVIDER === "razorpay" ? "paypal" : DEFAULT_PAYMENT_PROVIDER);
  const currency = isIndian ? "INR" : "USD";
  const currencySymbol = isIndian ? "₹" : "$";

  const handleRazorpayPayment = async (planId: string) => {
    const response = await fetch("/api/payment/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });

    const data = await response.json();
    
    if (!data.orderId) {
      throw new Error(data.error || "Failed to create order");
    }

    // Load Razorpay script if not already loaded
    if (!(window as any).Razorpay) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Razorpay"));
        document.body.appendChild(script);
      });
    }

    return new Promise<void>((resolve, reject) => {
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: "BioDocsAI",
        description: `${data.credits} Credits`,
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            const verifyResponse = await fetch("/api/payment/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.orderId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                planId: data.planId,
              }),
            });

            const verifyData = await verifyResponse.json();
            
            if (verifyData.success) {
              toast.success("Payment successful! Credits added to your account.");
              window.location.href = "/dashboard";
              resolve();
            } else {
              reject(new Error("Payment verification failed"));
            }
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss: () => {
            reject(new Error("Payment cancelled"));
          },
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    });
  };

  const handlePayPalPayment = async (planId: string) => {
    const response = await fetch("/api/payment/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });

    const data = await response.json();

    if (data.approveUrl) {
      window.location.href = data.approveUrl;
    } else {
      throw new Error(data.error || "Failed to create PayPal order");
    }
  };

  const handleStripePayment = async (planId: string) => {
    const response = await fetch("/api/payment/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error(data.error || "Failed to create Stripe checkout");
    }
  };

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    try {
      switch (paymentProvider) {
        case "razorpay":
          await handleRazorpayPayment(planId);
          break;
        case "paypal":
          await handlePayPalPayment(planId);
          break;
        case "stripe":
          await handleStripePayment(planId);
          break;
        default:
          await handleRazorpayPayment(planId);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      if (error.message !== "Payment cancelled") {
        toast.error(error.message || "Payment failed. Please try again.");
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Choose Your Plan
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Select the perfect plan for your needs. All plans include access to our AI-powered tools.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-6 bg-card ${
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/20"
                    : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    {detectingLocation ? (
                      <span className="text-4xl font-bold text-muted-foreground">...</span>
                    ) : (
                      <span className="text-4xl font-bold">
                        {currencySymbol}
                        {isIndian ? plan.priceINR : plan.priceUSD}
                      </span>
                    )}
                    {plan.id !== "free" && (
                      <span className="text-muted-foreground">/month</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.credits.toLocaleString()} credits
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={plan.id === "free" || loading !== null}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : plan.id === "free" ? (
                    "Current Plan"
                  ) : (
                    "Upgrade Now"
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* FAQ or Additional Info */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4">How Credits Work</h2>
            <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6 text-left">
              <div className="p-6 rounded-lg bg-card border border-border">
                <h3 className="font-semibold mb-2">💡 What are credits?</h3>
                <p className="text-sm text-muted-foreground">
                  Credits are used for AI operations. Different features consume different amounts of credits based on complexity.
                </p>
              </div>
              <div className="p-6 rounded-lg bg-card border border-border">
                <h3 className="font-semibold mb-2">🔄 Monthly Reset</h3>
                <p className="text-sm text-muted-foreground">
                  Your credits reset every month on your billing date. Unused credits don't roll over.
                </p>
              </div>
              <div className="p-6 rounded-lg bg-card border border-border">
                <h3 className="font-semibold mb-2">📊 Usage Examples</h3>
                <p className="text-sm text-muted-foreground">
                  Presentation: 10 credits • Research Paper: 15 credits • Chat: 1 credit per message
                </p>
              </div>
              <div className="p-6 rounded-lg bg-card border border-border">
                <h3 className="font-semibold mb-2">💳 Flexible Billing</h3>
                <p className="text-sm text-muted-foreground">
                  Cancel anytime. Upgrade or downgrade your plan as needed. No hidden fees.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
