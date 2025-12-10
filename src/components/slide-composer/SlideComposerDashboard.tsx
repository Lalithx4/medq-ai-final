"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Loader2,
  Send,
  SlidersHorizontal,
  Download,
  ChevronDown,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SlideContent } from "@/lib/slide-composer/types";
import { SlideRichEditor } from "@/components/slide-composer/SlideRichEditor";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SlideComposerState {
  topic: string;
  slideCount: number;
  audience: string;
  tone: string;
}

interface SavedDeckSummary {
  id: string;
  title: string | null;
  createdAt: string;
}

export function SlideComposerDashboard() {
  const [form, setForm] = useState<SlideComposerState>({
    topic: "",
    slideCount: 8,
    audience: "Clinicians",
    tone: "professional",
  });
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [mobileEditingSlideId, setMobileEditingSlideId] = useState<string | null>(
    null,
  );

  // Persistence state
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [savedDecks, setSavedDecks] = useState<SavedDeckSummary[]>([]);
  const [isDecksOpen, setIsDecksOpen] = useState(false);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedSlide: SlideContent | undefined =
    slides.find((s) => s.id === selectedSlideId) || slides[0];
  const selectedSlideIndex = selectedSlide
    ? slides.findIndex((s) => s.id === selectedSlide.id)
    : -1;

  // Mark dirty whenever form or slides change (after initial mount)
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    setIsDirty(true);
  }, [form, slides]);

  // Load recent SlideComposer decks on mount
  useEffect(() => {
    const loadDecks = async () => {
      try {
        const res = await fetch("/api/files/list");
        const data = await res.json();
        if (!data?.success || !Array.isArray(data.files)) return;
        const decks = data.files
          .filter((f: any) => f.type === "slide-deck")
          .map((f: any) => ({
            id: String(f.id),
            title: f.title ?? "Untitled deck",
            createdAt: f.createdAt,
          }));
        setSavedDecks(decks);
      } catch (e) {
        console.error("[SlideComposer] Failed to load saved decks", e);
      }
    };
    void loadDecks();
  }, []);

  const saveDeck = async (overrideSlides?: SlideContent[]) => {
    const currentSlides = overrideSlides ?? slides;
    if (!currentSlides.length) return;
    const payload = {
      form,
      slides: currentSlides,
    };

    try {
      setIsSaving(true);
      const response = await fetch("/api/files/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: documentId,
          title: form.topic || currentSlides[0]?.title || "Untitled deck",
          content: JSON.stringify(payload),
          type: "slide-deck",
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to save deck");
      }

      const fileId: string = data.fileId || data.file?.id;
      if (fileId) {
        setDocumentId(fileId);
      }
      setIsDirty(false);
      const now = new Date();
      setLastSavedAt(now);

      // Update savedDecks list with this deck
      setSavedDecks((prev) => {
        const existingIndex = prev.findIndex((d) => d.id === fileId);
        const entry: SavedDeckSummary = {
          id: fileId,
          title: form.topic || currentSlides[0]?.title || "Untitled deck",
          createdAt: now.toISOString(),
        };
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = entry;
          return next;
        }
        return [entry, ...prev];
      });
    } catch (e) {
      console.error("[SlideComposer] Failed to save deck", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSlide = () => {
    const baseIndex = slides.length + 1;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    const newSlide: SlideContent = {
      id,
      title: `New slide ${baseIndex}`,
      markdown: "",
    } as SlideContent;

    const nextSlides = [...slides, newSlide];
    setSlides(nextSlides);
    setSelectedSlideId(id);
    setForm((prev) => ({ ...prev, slideCount: nextSlides.length }));
    void saveDeck(nextSlides);
  };

  const handleDeleteSlide = (id: string) => {
    if (!slides.length) return;
    const nextSlides = slides.filter((s) => s.id !== id);
    setSlides(nextSlides);

    if (!nextSlides.length) {
      setSelectedSlideId(null);
    } else {
      const removedIndex = slides.findIndex((s) => s.id === id);
      const fallbackIndex = Math.max(0, removedIndex - 1);
      const fallback = nextSlides[fallbackIndex] ?? nextSlides[0];
      if (fallback) {
        setSelectedSlideId(fallback.id);
      }
    }

    setForm((prev) => ({ ...prev, slideCount: nextSlides.length }));
    void saveDeck(nextSlides);
  };

  // Autosave every 15s when dirty
  useEffect(() => {
    if (!isDirty || !slides.length) return;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      void saveDeck();
    }, 15000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, slides.length, form.topic, form.audience, form.tone, form.slideCount]);

  const loadDeckById = async (id: string) => {
    try {
      const res = await fetch(`/api/files/get/${id}`);
      const data = await res.json();
      if (!res.ok || !data?.content) {
        throw new Error(data?.error || "Failed to load deck");
      }
      const parsed = JSON.parse(data.content) as {
        form: SlideComposerState;
        slides: SlideContent[];
      };
      setForm(parsed.form);
      setSlides(parsed.slides || []);
      setDocumentId(id);
      setSelectedSlideId(parsed.slides?.[0]?.id ?? null);
      setIsDirty(false);
      setIsEditingSlide(false);
    } catch (e) {
      console.error("[SlideComposer] Failed to load deck", e);
    }
  };

  const handleExport = async (format: "pptx" | "pdf" | "docx") => {
    if (!slides.length || isExporting) return;
    try {
      setIsExporting(true);
      const response = await fetch("/api/slide-composer/export", {
        method: "POST",
        body: JSON.stringify({
          format,
          slides: slides.map((s) => ({ title: s.title, markdown: s.markdown })),
          title: form.topic || slides[0]?.title || "presentation",
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to export presentation");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const ext = format === "pptx" ? "pptx" : format === "docx" ? "docx" : "pdf";
      link.download = `${(form.topic || "presentation").slice(0, 60) || "presentation"}.${ext}`;
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error("[SlideComposer] Export error", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.topic.trim()) {
      setError("Please enter a presentation topic.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    setChatMessages([]);
    setChatError(null);

    try {
      const response = await fetch("/api/slide-composer/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: form.topic.trim(),
          slideCount: form.slideCount,
          audience: form.audience,
          tone: form.tone,
          mode: "gemini",
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        if (response.status === 503) {
          throw new Error(
            "our servers are facing heavy traffic. please re-try again in a while",
          );
        }
        throw new Error(data?.error || "Failed to generate presentation");
      }

      const result = data.result as { slides: SlideContent[] };
      setSlides(result.slides || []);
      if (result.slides && result.slides.length > 0) {
        const first = result.slides[0];
        if (first) {
          setSelectedSlideId(first.id);
        }
        // On mobile, collapse settings into accordion once we have slides.
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setIsSettingsOpen(false);
        }
      }
    } catch (err: any) {
      console.error("[SlideComposer] Error generating presentation", err);
      setError(err?.message || "Failed to generate presentation");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChatSend = async () => {
    const message = chatInput.trim();
    if (!message || !slides.length || isChatting) return;

    setChatError(null);
    setIsChatting(true);
    setChatInput("");

    const userMsg: ChatMessage = { role: "user", content: message };
    setChatMessages((prev) => [...prev, userMsg]);

    const lastAssistantSummary =
      chatMessages
        .slice()
        .reverse()
        .find((m) => m.role === "assistant")?.content || "";

    try {
      const response = await fetch("/api/slide-composer/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides,
          message,
          lastAssistantSummary,
          context: {
            topic: form.topic,
            audience: form.audience,
            tone: form.tone,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.error || "Failed to process chat request");
      }

      const result = data.result as { summary: string; slides: SlideContent[] };
      // Apply updated slides from the model so actions like "add a 9th slide" actually
      // modify the deck. We also try to keep the user's current selection when possible
      // and select a new slide if the deck size increases.
      if (Array.isArray(result.slides) && result.slides.length) {
        setSlides((prev) => {
          const prevLength = prev.length;
          const nextSlides = result.slides;

          // If the assistant added slides (e.g., 9th slide), auto-select the last one
          // so the user immediately sees the new content.
          if (nextSlides.length > prevLength) {
            const last = nextSlides[nextSlides.length - 1];
            if (last) {
              setSelectedSlideId(last.id);
            }
          } else if (selectedSlideId) {
            // Try to preserve selection by matching id if it still exists.
            const stillExists = nextSlides.find((s) => s.id === selectedSlideId);
            if (!stillExists && nextSlides[0]) {
              setSelectedSlideId(nextSlides[0].id);
            }
          }

          return nextSlides;
        });
      }
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: result.summary,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("[SlideComposer] Chat error", err);
      setChatError(err?.message || "Failed to process chat request");
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-lg md:text-2xl font-semibold">Slide Composer</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Generate PubMed-grounded slide decks from a single topic.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!slides.length || isSaving}
            onClick={() => void saveDeck()}
            className="gap-1"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span className="text-xs">
              {isSaving ? "Saving..." : lastSavedAt ? "Save" : "Save deck"}
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={!slides.length || isExporting}
                className="gap-1"
              >
                <Download className="w-4 h-4" />
                <span className="text-xs">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem
                disabled={!slides.length || isExporting}
                onClick={() => handleExport("pptx")}
              >
                PowerPoint (.pptx)
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!slides.length || isExporting}
                onClick={() => handleExport("pdf")}
              >
                PDF (.pdf)
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!slides.length || isExporting}
                onClick={() => handleExport("docx")}
              >
                Word document (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Form + Slide list */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border flex flex-col max-h-[50vh] md:max-h-none">
          {/* Mobile accordion header */}
          <button
            type="button"
            className="md:hidden flex items-center justify-between px-4 py-2 text-xs font-medium border-b border-border bg-background"
            onClick={() => setIsSettingsOpen((open) => !open)}
          >
            <span>Presentation settings</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isSettingsOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>

          <div
            className={`${
              isSettingsOpen ? "block md:flex" : "hidden md:flex"
            } flex-1 flex-col`}
          >
            {/* Form */}
            <div className="p-4 space-y-3 border-b border-border">
            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Presentation settings</span>
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-muted-foreground">Topic</label>
              <input
                type="text"
                value={form.topic}
                onChange={(e) =>
                  setForm((f) => ({ ...f, topic: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. Endoscopic sinus surgery complications"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <label className="block text-xs text-muted-foreground">
                  Number of slides
                </label>
                <input
                  type="number"
                  min={4}
                  max={20}
                  value={form.slideCount}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      slideCount: Number(e.target.value) || 8,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="block text-xs text-muted-foreground">
                  Audience
                </label>
                <input
                  type="text"
                  value={form.audience}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, audience: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Clinicians, residents, ..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground">Tone</label>
              <input
                type="text"
                value={form.tone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tone: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="professional, layperson-friendly, ..."
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full gap-2 mt-1 flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating presentation...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="text-sm">Generate presentation</span>
                </>
              )}
            </Button>

            {error && (
              <p className="mt-2 text-xs text-red-500">{error}</p>
            )}
          </div>

          {/* Previous decks accordion */}
          <div className="border-b border-border">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium bg-muted/40 hover:bg-muted/60 transition-colors"
              onClick={() => setIsDecksOpen((open) => !open)}
           >
              <span>Previous decks</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  isDecksOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
            {isDecksOpen && (
              <div className="max-h-60 md:max-h-72 overflow-y-auto px-3 py-2 space-y-1 text-xs">
                {savedDecks.length ? (
                  savedDecks.map((deck) => (
                    <button
                      key={deck.id}
                      type="button"
                      className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/60 border border-transparent hover:border-border truncate"
                      onClick={() => void loadDeckById(deck.id)}
                    >
                      <div className="font-medium truncate">{deck.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(deck.createdAt).toLocaleString()}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-[11px] text-muted-foreground px-2 py-1.5">
                    No saved decks yet. Generate a deck and it will auto-save here.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Slide list (desktop only) */}
          <div className="hidden md:block flex-1 overflow-auto p-3 space-y-2">
            <AnimatePresence>
              {slides.map((slide, index) => (
                <motion.button
                  key={slide.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  onClick={() => setSelectedSlideId(slide.id)}
                  className={`w-full text-left px-3 py-2 rounded-md border text-xs md:text-sm transition-colors ${
                    slide.id === selectedSlide?.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="font-medium truncate">
                    {index + 1}. {slide.title}
                  </div>
                </motion.button>
              ))}
              {!slides.length && (
                <p className="text-xs text-muted-foreground px-1">
                  No slides yet. Enter a topic and generate a deck.
                </p>
              )}
            </AnimatePresence>
          </div>
          {/* Desktop add slide button (hidden on mobile) */}
          <div className="hidden md:block border-t border-border px-3 py-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full gap-1 text-xs"
              onClick={handleAddSlide}
            >
              <Plus className="w-3 h-3" />
              <span>Add slide</span>
            </Button>
          </div>
          </div>
        </div>

        {/* Right: Slide viewer + chat placeholder */}
        <div className="w-full md:w-2/3 flex flex-col min-h-[50vh]">
          {/* Slide markdown */}
          <div className="flex-1 overflow-auto px-3 md:px-6 pt-4 pb-32 md:pb-4">
            {/* Mobile: horizontal slide previews + stacked slides */}
            <div className="md:hidden space-y-4">
              {slides.length > 0 && (
                <div className="-mx-1 px-1 pb-1 overflow-x-auto">
                  <div className="flex items-stretch gap-2">
                    {slides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => setMobileEditingSlideId(slide.id)}
                        className="min-w-[160px] max-w-[200px] rounded-lg border border-border bg-card px-3 py-2 text-left shadow-sm flex-shrink-0"
                      >
                        <div className="text-[10px] text-muted-foreground mb-1">
                          Slide {index + 1}
                        </div>
                        <div className="text-xs font-medium truncate">
                          {slide.title}
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddSlide}
                      className="min-w-[140px] rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-left flex items-center justify-center gap-2 text-xs text-muted-foreground flex-shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add slide</span>
                    </button>
                  </div>
                </div>
              )}
              {slides.length ? (
                slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className="max-w-3xl mx-auto bg-card border border-border rounded-xl p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-sky-400 to-violet-500 text-[11px] text-primary-foreground shadow-sm">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <span>Slide {index + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteSlide(slide.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setMobileEditingSlideId(slide.id)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-h1:text-primary prose-h2:text-foreground prose-h3:text-muted-foreground prose-strong:text-foreground prose-li:text-foreground/90 prose-ul:marker:text-primary/70">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {slide.markdown}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Generated slides will appear here.
                </div>
              )}
            </div>

            {/* Desktop: single selected slide with inline edit mode */}
            <div className="hidden md:block h-full">
              {selectedSlide ? (
                <div className="max-w-3xl mx-auto bg-card border border-border rounded-xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-sky-400 to-violet-500 text-[11px] text-primary-foreground shadow-sm">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <span>
                        Slide {selectedSlideIndex >= 0 ? selectedSlideIndex + 1 : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteSlide(selectedSlide.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => setIsEditingSlide((prev) => !prev)}
                      >
                        {isEditingSlide ? "Done" : "Edit"}
                      </Button>
                    </div>
                  </div>

                  {/* Slide title */}
                  <div className="text-xl font-semibold text-foreground mb-1">
                    {selectedSlide.title}
                  </div>

                  {isEditingSlide ? (
                    <div className="space-y-2">
                      <SlideRichEditor
                        markdown={selectedSlide.markdown}
                        onMarkdownChange={(next) => {
                          setSlides((prev) =>
                            prev.map((s) =>
                              s.id === selectedSlide.id ? { ...s, markdown: next } : s,
                            ),
                          );
                        }}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Edit the content for this slide in rich text. Changes will appear in the
                        preview and exports.
                      </p>
                    </div>
                  ) : (
                    <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:text-foreground prose-h1:text-primary prose-h2:text-foreground prose-h3:text-muted-foreground prose-strong:text-foreground prose-li:text-foreground/90 prose-ul:marker:text-primary/70">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedSlide.markdown}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Generated slides will appear here.
                </div>
              )}
            </div>
          </div>

          {/* Mobile full-screen editor for a single slide (option B) */}
          {mobileEditingSlideId && (
            <div className="fixed inset-0 z-40 md:hidden bg-background/95 backdrop-blur-sm">
              <div className="flex flex-col h-full">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between text-xs font-semibold text-muted-foreground bg-background/80">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-sky-400 to-violet-500 text-[11px] text-primary-foreground shadow-sm">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <span>
                      Edit slide
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setMobileEditingSlideId(null)}
                  >
                    Done
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {slides
                    .filter((s) => s.id === mobileEditingSlideId)
                    .map((slide) => (
                      <div key={slide.id} className="space-y-2">
                        <SlideRichEditor
                          markdown={slide.markdown}
                          onMarkdownChange={(next) => {
                            setSlides((prev) =>
                              prev.map((s) =>
                                s.id === slide.id ? { ...s, markdown: next } : s,
                              ),
                            );
                          }}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Edit the content for this slide in rich text. Changes will be reflected
                          in the stacked view and exports.
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat area - stick to bottom on mobile once slides exist */}
          {slides.length > 0 && (
            <div
              className="fixed inset-x-0 bottom-16 md:static md:bottom-auto border-t border-border p-3 space-y-2 z-30 shadow-[0_-4px_18px_rgba(15,23,42,0.25)] bg-gradient-to-t from-background/98 via-background/90 to-primary/10 dark:to-primary/20 backdrop-blur-lg"
            >
              <div className="h-20 md:h-32 overflow-y-auto space-y-1 text-xs">
                {chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={
                      m.role === "user"
                        ? "text-right text-foreground"
                        : "text-left text-muted-foreground"
                    }
                  >
                    <span className="font-semibold mr-1">
                      {m.role === "user" ? "You:" : "Assistant:"}
                    </span>
                    <span>{m.content}</span>
                  </div>
                ))}
                {!chatMessages.length && (
                  <p className="text-muted-foreground">
                    Ask for refinements, e.g. "Make slide 3 more concise" or
                    "Add a slide summarizing key risks".
                  </p>
                )}
              </div>
              {chatError && (
                <p className="text-xs text-red-500">{chatError}</p>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSend();
                    }
                  }}
                  placeholder="Describe how you want to improve the deck..."
                  className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={!slides.length || isChatting}
                />
                <Button
                  size="sm"
                  onClick={handleChatSend}
                  disabled={!slides.length || isChatting || !chatInput.trim()}
                  className="gap-1"
                >
                  {isChatting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  <span className="text-xs">Send</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
