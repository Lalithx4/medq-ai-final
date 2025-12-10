"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Copy, CheckCircle2 } from "lucide-react";

export function ContactUsTab() {
  const email = "contact@biodocs.ai";
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
          <CardDescription>
            We'd love to hear from you. Reach out for support, feedback, or partnership inquiries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-medium">Email</div>
                <div className="text-sm text-muted-foreground">{email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={`mailto:${email}`}>
                <Button size="sm" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Email us
                </Button>
              </a>
              <Button variant="outline" size="icon" onClick={onCopy} aria-label="Copy email">
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Our team typically responds within 1–2 business days.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
