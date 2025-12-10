"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TEMPLATES } from "@/templates/registry";
import { usePresentationState } from "@/states/presentation-state";

export function TemplatePicker() {
  const templates = useMemo(() => TEMPLATES, []);
  const { theme, setTheme } = usePresentationState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => templates.find(t => t.id === selectedId) || null, [templates, selectedId]);

  // Auto-select first template on mount (no user interaction yet)
  useEffect(() => {
    if (!selectedId && templates.length > 0) {
      const first = templates[0]!;
      setSelectedId(first.id);
      setTheme(first.themeKey);
      try { if (typeof window !== "undefined") localStorage.setItem("selectedTemplateId", first.id); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Templates</h2>
        <span className="text-xs text-muted-foreground">Pick a style (applies theme)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((t) => {
          const isActive = selectedId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelectedId(t.id);
                setTheme(t.themeKey);
                try {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("selectedTemplateId", t.id);
                  }
                } catch {}
              }}
              className={`text-left rounded-lg border transition-all hover:shadow-sm ${
                isActive ? "border-primary ring-1 ring-primary/40" : "border-border"
              }`}
            >
              <Card className="border-0">
                {t.thumbnail ? (
                  <div className="relative w-full h-28 bg-muted">
                    <Image src={t.thumbnail} alt={t.name} fill className="object-cover rounded-t-lg" />
                  </div>
                ) : (
                  <div className="w-full h-28 bg-muted flex items-center justify-center text-[10px] text-muted-foreground rounded-t-lg">
                    No preview
                  </div>
                )}
                <CardContent className="p-3">
                  <div className="text-sm font-medium leading-tight">{t.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{t.description}</div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Previews */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">Preview</div>
        {selected?.previewImages?.length ? (
          <div className="grid grid-cols-3 gap-2">
            {selected.previewImages.slice(0, 3).map((src, idx) => (
              <div key={idx} className="relative w-full aspect-[4/2] bg-muted rounded-md overflow-hidden">
                <Image
                  src={src}
                  alt={`Preview ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 33vw, (max-width: 1024px) 200px, 240px"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Select a template to view sample slides.</div>
        )}
      </div>
    </div>
  );
}
