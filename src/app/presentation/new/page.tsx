"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { AppLayout } from "@/components/home/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TEMPLATES } from "@/templates/registry";
import { useRouter } from "next/navigation";

export default function NewPresentationPage() {
  const templates = useMemo(() => TEMPLATES, []);
  const router = useRouter();

  return (
    <AppLayout>
      <div className="container mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Choose a template</h1>
          <p className="text-sm text-muted-foreground mt-1">Pick a starting style. You can change theme later.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              {t.thumbnail ? (
                <div className="relative w-full h-40 bg-muted">
                  <Image src={t.thumbnail} alt={t.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-full h-40 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  No preview
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  className="w-full"
                  onClick={() => router.push(`/presentation?templateId=${encodeURIComponent(t.id)}`)}
                >
                  Use this template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6">
          <Link href="/presentation" className="text-sm text-primary hover:underline">Skip, go to presentations</Link>
        </div>
      </div>
    </AppLayout>
  );
}
