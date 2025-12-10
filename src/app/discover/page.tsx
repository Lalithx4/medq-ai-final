"use client";

import { useEffect, useState } from "react";
import { Loader2, ExternalLink, Filter, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DiscoverContentType = "all" | "news" | "journal" | "trial" | "guideline" | "innovation";

interface DiscoverItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt?: string;
  imageUrl?: string;
  type: "news" | "journal" | "trial" | "guideline" | "innovation";
  specialties: string[];
  section?: "recent" | "month" | "year";
}

interface DiscoverApiResponse {
  success: boolean;
  items: DiscoverItem[];
  nextCursor?: string | null;
  error?: string;
}

const CONTENT_TYPE_OPTIONS: { value: DiscoverContentType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "news", label: "News" },
  { value: "journal", label: "Journal articles" },
  { value: "trial", label: "Clinical trials" },
  { value: "guideline", label: "Guidelines" },
  { value: "innovation", label: "Innovation" },
];

const SPECIALTY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All specialties" },
  { value: "cardiology", label: "Cardiology" },
  { value: "oncology", label: "Oncology" },
  { value: "neurology", label: "Neurology" },
  { value: "endocrinology", label: "Endocrinology" },
  { value: "gastroenterology", label: "Gastroenterology" },
  { value: "orthopedics", label: "Orthopedics" },
  { value: "pediatrics", label: "Pediatrics" },
  { value: "ent", label: "ENT" },
  { value: "critical-care", label: "Critical care" },
];

export default function DiscoverPage() {
  const [type, setType] = useState<DiscoverContentType>("all");
  const [specialty, setSpecialty] = useState<string>("all");
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async (opts?: { append?: boolean; cursor?: string | null }) => {
    const { append = false, cursor = null } = opts || {};
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      const params = new URLSearchParams();
      params.set("type", type);
      params.set("specialty", specialty);
      params.set("source", "pubmed");
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/discover/feed?${params.toString()}`);
      const data: DiscoverApiResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load discover feed");
      }

      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor ?? null);
    } catch (err: any) {
      console.error("[Discover] Error loading feed", err);
      setError(err?.message || "Failed to load discover feed");
      if (!append) {
        setItems([]);
        setNextCursor(null);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // On first mount, restore the last selected specialty from localStorage (if any)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedSpecialty = window.localStorage.getItem("discover:lastSpecialty");
    if (savedSpecialty && SPECIALTY_OPTIONS.some((o) => o.value === savedSpecialty)) {
      setSpecialty(savedSpecialty);
    }
  }, []);

  // Whenever filters change, load the feed for the current type/specialty
  useEffect(() => {
    void fetchFeed({ append: false, cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, specialty]);

  const handleOpen = (item: DiscoverItem) => {
    if (!item.url) return;
    window.open(item.url, "_blank", "noopener,noreferrer");
  };

  const currentTypeLabel = CONTENT_TYPE_OPTIONS.find((o) => o.value === type)?.label || "All";
  const currentSpecialtyLabel =
    SPECIALTY_OPTIONS.find((o) => o.value === specialty)?.label || "All specialties";

  // Group items by logical section (for PubMed multi-bucket feeds)
  const sections: { key: "recent" | "month" | "year"; title: string; description: string }[] = [
    {
      key: "recent",
      title: "Recently published or indexed articles",
      description: "Very recent publications in this specialty and content type.",
    },
    {
      key: "month",
      title: "Top articles this month",
      description: "Highlighted articles from the current month.",
    },
    {
      key: "year",
      title: "Top articles this year",
      description: "Notable articles from the current year.",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg md:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            <span>Discover</span>
            <span className="px-2 py-0.5 rounded-full border border-primary/30 text-[10px] uppercase tracking-wide text-primary bg-primary/5">
              PubMed
            </span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl">
            See the latest medical news, journal articles, trials, and innovations curated for
            clinicians.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Content type filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs md:text-sm">
                <Filter className="w-3 h-3" />
                <span>{currentTypeLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs md:text-sm">
              <DropdownMenuLabel>Content type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => {
                    setType(opt.value);
                  }}
                  className={type === opt.value ? "font-semibold" : ""}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Specialty filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs md:text-sm">
                <Stethoscope className="w-3 h-3" />
                <span className="truncate max-w-[120px] md:max-w-[180px] text-left">
                  {currentSpecialtyLabel}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs md:text-sm max-h-80 overflow-auto">
              <DropdownMenuLabel>Specialty</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SPECIALTY_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => {
                    setSpecialty(opt.value);
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("discover:lastSpecialty", opt.value);
                    }
                  }}
                  className={specialty === opt.value ? "font-semibold" : ""}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Manual refresh / initial load button */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs md:text-sm"
            onClick={() => {
              void fetchFeed({ append: false, cursor: null });
            }}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-auto px-4 md:px-8 py-4">
        {isLoading && !items.length ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading medical discoveries5</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-red-500 gap-2">
            <p>{error}</p>
            <Button size="sm" variant="outline" onClick={() => void fetchFeed()}>
              Retry
            </Button>
          </div>
        ) : !items.length ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            No items found. Try a different content type or specialty.
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map((section) => {
              const sectionItems = items.filter((item) => item.section === section.key);
              if (!sectionItems.length) return null;

              return (
                <div key={section.key} className="space-y-3">
                  <div className="space-y-0.5">
                    <h3 className="text-sm md:text-base font-semibold flex items-center gap-2">
                      {section.title}
                      <span className="text-[10px] md:text-xs text-muted-foreground">
                        {sectionItems.length} articles
                      </span>
                    </h3>
                    <p className="text-[11px] md:text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>

                  <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                    {sectionItems.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-background/80 hover:from-background hover:via-primary/5 hover:to-background/90 transition-all shadow-sm hover:shadow-md overflow-hidden cursor-pointer flex flex-col hover:-translate-y-0.5 hover:border-primary/40"
                        onClick={() => handleOpen(item)}
                      >
                        <div className="flex-1 p-4 md:p-5 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-sky-400 to-violet-500 text-[11px] text-primary-foreground shadow-sm flex-shrink-0">
                                <Stethoscope className="w-4 h-4" />
                              </div>
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <span className="font-medium truncate max-w-[160px] md:max-w-[220px]">
                                    {item.source}
                                  </span>
                                  {item.publishedAt && (
                                    <span>
                                      · {new Date(item.publishedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <h2 className="text-sm md:text-base font-semibold leading-snug line-clamp-2 md:line-clamp-3">
                                  {item.title}
                                </h2>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                          </div>

                          {item.summary && (
                            <p className="text-xs md:text-sm text-muted-foreground line-clamp-3">
                              {item.summary}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5 pt-1 mt-auto text-[10px] md:text-[11px] text-muted-foreground">
                            <span className="px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/20">
                              {item.type === "journal"
                                ? "Journal article"
                                : item.type === "trial"
                                ? "Clinical trial"
                                : item.type === "guideline"
                                ? "Guideline"
                                : item.type === "innovation"
                                ? "Innovation"
                                : "News"}
                            </span>
                            {item.specialties?.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}

            {nextCursor && (
              <div className="flex justify-center pt-4 pb-6">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void fetchFeed({ append: true, cursor: nextCursor })}
                  disabled={isLoadingMore}
                  className="gap-2"
                >
                  {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isLoadingMore ? "Loading more" : "Load more"}</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
