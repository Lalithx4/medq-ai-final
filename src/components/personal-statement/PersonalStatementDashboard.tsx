"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, FileText, History, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ExperienceInput {
  title: string;
  situation: string;
  learning: string;
}

interface PersonalStatementFormState {
  target: "residency" | "fellowship" | "medical-school" | "other";
  specialty: string;
  templateStyle: "classic" | "patient-story" | "theme" | "research";
  bio: string;
  strengths: string;
  experiences: ExperienceInput[];
  motivation: string;
  goals: string;
  redFlags: string;
  tone: string;
  wordLimit: number;
}

interface SavedPsSummary {
  id: string;
  title: string | null;
  createdAt: string;
}

export function PersonalStatementDashboard() {
  const [form, setForm] = useState<PersonalStatementFormState>({
    target: "residency",
    specialty: "Internal Medicine",
    templateStyle: "classic",
    bio: "",
    strengths: "teamwork, resilience, empathy",
    experiences: [
      { title: "", situation: "", learning: "" },
      { title: "", situation: "", learning: "" },
    ],
    motivation: "",
    goals: "",
    redFlags: "",
    tone: "professional, warm",
    wordLimit: 750,
  });
  const [markdown, setMarkdown] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [savedStatements, setSavedStatements] = useState<SavedPsSummary[]>([]);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [checkItems, setCheckItems] = useState<{
    section: string;
    status: "strong" | "ok" | "weak" | "missing";
    comment: string;
  }[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const hasMountedRef = useRef(false);
  const searchParams = useSearchParams();

  const handleFormChange = <K extends keyof PersonalStatementFormState>(key: K, value: PersonalStatementFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleExperienceChange = (index: number, field: keyof ExperienceInput, value: string) => {
    setForm((prev) => {
      const next = [...prev.experiences];
      if (!next[index]) next[index] = { title: "", situation: "", learning: "" };
      next[index] = { ...next[index], [field]: value };
      return { ...prev, experiences: next };
    });
  };

  // Mark dirty whenever form or markdown changes after initial mount
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    setIsDirty(true);
  }, [form, markdown]);

  // Load file from URL parameter if present
  useEffect(() => {
    const fileId = searchParams?.get("fileId");
    if (fileId) {
      void loadStatementById(fileId);
    }
  }, [searchParams]);

  // Load saved personal statements on mount
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const res = await fetch("/api/files/list");
        const data = await res.json();
        if (!data?.success || !Array.isArray(data.files)) return;
        const items = data.files
          .filter((f: any) => f.type === "personal-statement")
          .map((f: any) => ({
            id: String(f.id),
            title: f.title ?? "Untitled personal statement",
            createdAt: f.createdAt,
          }));
        setSavedStatements(items);
      } catch (e) {
        console.error("[PersonalStatement] Failed to load saved statements", e);
      }
    };
    void loadSaved();
  }, []);

  const saveStatement = async (markdownToSave?: string) => {
    const contentToSave = markdownToSave ?? markdown;
    if (!contentToSave.trim()) return;
    const payload = {
      form,
      markdown: contentToSave,
    };
    try {
      setIsSaving(true);
      const res = await fetch("/api/files/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: documentId,
          title:
            `${form.specialty || "Personal statement"} (${form.target || "residency"})` ||
            "Untitled personal statement",
          content: JSON.stringify(payload),
          type: "personal-statement",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to save personal statement");
      }
      const fileId: string = data.fileId || data.file?.id;
      if (fileId) {
        setDocumentId(fileId);
      }
      const now = new Date();
      setLastSavedAt(now);
      setIsDirty(false);
      setSavedStatements((prev) => {
        const existingIndex = prev.findIndex((d) => d.id === fileId);
        const entry: SavedPsSummary = {
          id: fileId,
          title:
            `${form.specialty || "Personal statement"} (${form.target || "residency"})` ||
            "Untitled personal statement",
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
      console.error("[PersonalStatement] Failed to save", e);
    } finally {
      setIsSaving(false);
    }
  };

  const loadStatementById = async (id: string) => {
    try {
      const res = await fetch(`/api/files/get/${id}`);
      const data = await res.json();
      if (!res.ok || !data?.content) {
        throw new Error(data?.error || "Failed to load personal statement");
      }
      const parsed = JSON.parse(data.content) as {
        form: PersonalStatementFormState;
        markdown: string;
      };
      setForm(parsed.form);
      setMarkdown(parsed.markdown || "");
      setDocumentId(id);
      setLastSavedAt(null);
      setIsDirty(false);
    } catch (e) {
      console.error("[PersonalStatement] Failed to load", e);
    }
  };

  const handleGenerate = async () => {
    if (!form.specialty.trim()) {
      setError("Please enter a specialty.");
      return;
    }
    setError(null);
    setIsGenerating(true);

    try {
      const strengthsArray = form.strengths
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const response = await fetch("/api/personal-statement/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          strengths: strengthsArray,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to generate personal statement");
      }

      const nextMarkdown: string = data.markdown || "";
      setMarkdown(nextMarkdown);
      if (nextMarkdown.trim()) {
        void saveStatement(nextMarkdown);
      }
    } catch (e: any) {
      console.error("[PersonalStatement] Generate error", e);
      setError(e?.message || "Failed to generate personal statement");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: "pdf" | "docx") => {
    if (!markdown.trim() || isExporting) return;
    try {
      setIsExporting(true);
      const res = await fetch("/api/personal-statement/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          markdown,
          title:
            `${form.specialty || "personal-statement"} (${form.target || "residency"})` ||
            "personal-statement",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to export personal statement");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const ext = format === "docx" ? "docx" : "pdf";
      link.download = `${
        (form.specialty || "personal-statement").slice(0, 60) || "personal-statement"
      }.${ext}`;
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (e) {
      console.error("[PersonalStatement] Export error", e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCheck = async () => {
    if (!markdown.trim() || isChecking) return;
    setCheckError(null);
    try {
      setIsChecking(true);
      const res = await fetch("/api/personal-statement/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to run quality check");
      }

      setCheckItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      console.error("[PersonalStatement] Check error", e);
      setCheckError(e?.message || "Failed to run quality check");
    } finally {
      setIsChecking(false);
    }
  };

  // Warn user on page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "You have unsaved changes in your personal statement.";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg md:text-2xl font-semibold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400 text-primary-foreground shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>Personal Statement Builder</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl">
            Generate a first-draft personal statement for residency or fellowship based on your real
            experiences. Use this as a starting point and customize it to reflect your own voice.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!markdown.trim() || isSaving}
            onClick={() => void saveStatement()}
            className="gap-1"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span className="text-xs">
              {isSaving ? "Saving..." : lastSavedAt ? "Save" : "Save draft"}
            </span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Form */}
        <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-border flex flex-col max-h-[50vh] md:max-h-none">
          <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
            {/* Top row: target + specialty + template style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Target</label>
                <select
                  value={form.target}
                  onChange={(e) =>
                    handleFormChange("target", e.target.value as PersonalStatementFormState["target"])
                  }
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="residency">Residency</option>
                  <option value="fellowship">Fellowship</option>
                  <option value="medical-school">Medical school</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Specialty *</label>
                <input
                  type="text"
                  value={form.specialty}
                  onChange={(e) => handleFormChange("specialty", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Internal Medicine, General Surgery, Radiology"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Template style</label>
                <select
                  value={form.templateStyle}
                  onChange={(e) =>
                    handleFormChange(
                      "templateStyle",
                      e.target.value as PersonalStatementFormState["templateStyle"],
                    )
                  }
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="classic">Classic narrative</option>
                  <option value="patient-story">Patient story opener</option>
                  <option value="theme">Theme-based</option>
                  <option value="research">Research-focused</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Short bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => handleFormChange("bio", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
                  placeholder="Where you studied, current role (e.g. MS4, intern), brief background."
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Strengths / qualities</label>
                <textarea
                  value={form.strengths}
                  onChange={(e) => handleFormChange("strengths", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
                  placeholder="Comma-separated: teamwork, resilience, empathy, leadership, ..."
                />
              </div>
            </div>

            {/* Experiences */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-muted-foreground">
                  Key clinical / life experiences (2-3 is enough)
                </label>
              </div>
              <div className="space-y-3">
                {form.experiences.map((exp, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-md p-3 space-y-1.5 bg-muted/40"
                  >
                    <input
                      type="text"
                      value={exp.title}
                      onChange={(e) => handleExperienceChange(index, "title", e.target.value)}
                      placeholder={`Experience ${index + 1} title (e.g. ICU month during COVID-19)`}
                      className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary mb-1"
                    />
                    <textarea
                      value={exp.situation}
                      onChange={(e) => handleExperienceChange(index, "situation", e.target.value)}
                      placeholder="What happened? Brief context, setting, and your role."
                      className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[50px] mb-1"
                    />
                    <textarea
                      value={exp.learning}
                      onChange={(e) => handleExperienceChange(index, "learning", e.target.value)}
                      placeholder="What you did, what you learned, and how it shaped you as a future clinician."
                      className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[50px]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">
                Motivation for this specialty
              </label>
              <textarea
                value={form.motivation}
                onChange={(e) => handleFormChange("motivation", e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[70px]"
                placeholder="Why this specialty fits you: what you enjoy, what you find meaningful, and how it matches your strengths."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">
                Short- and long-term goals
              </label>
              <textarea
                value={form.goals}
                onChange={(e) => handleFormChange("goals", e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[70px]"
                placeholder="Clinical goals, academic/research interests, teaching, leadership, etc."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">
                Gaps / red flags (optional)
              </label>
              <textarea
                value={form.redFlags}
                onChange={(e) => handleFormChange("redFlags", e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
                placeholder="Briefly explain any attempts, leaves, gaps, or other issues you want the statement to address in a constructive way."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Tone</label>
                <input
                  type="text"
                  value={form.tone}
                  onChange={(e) => handleFormChange("tone", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. professional, warm, reflective"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Word limit</label>
                <input
                  type="number"
                  min={400}
                  max={1200}
                  value={form.wordLimit}
                  onChange={(e) =>
                    handleFormChange("wordLimit", Number(e.target.value) || 750)
                  }
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Previous statements */}
            <div className="border border-border rounded-md overflow-hidden mt-2">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-muted/40 hover:bg-muted/60 transition-colors"
                onClick={() => setIsSavedOpen((open) => !open)}
              >
                <span>Previous personal statements</span>
                <History
                  className={`w-3.5 h-3.5 transition-transform ${
                    isSavedOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>
              {isSavedOpen && (
                <div className="max-h-60 overflow-y-auto px-2 py-1 space-y-1 text-xs">
                  {savedStatements.length ? (
                    savedStatements.map((ps) => (
                      <button
                        key={ps.id}
                        type="button"
                        className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/60 border border-transparent hover:border-border truncate"
                        onClick={() => void loadStatementById(ps.id)}
                      >
                        <div className="font-medium truncate">{ps.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {ps.createdAt ? new Date(ps.createdAt).toLocaleString() : ""}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-[11px] text-muted-foreground px-2 py-1.5">
                      No saved personal statements yet. Generate and save a draft to see it here.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-[11px] text-muted-foreground">
              This tool helps you create a first draft. Always review and edit to make sure it sounds
              like you.
            </div>
            <Button
              size="sm"
              className="gap-2"
              disabled={isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Generating statement...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs">Generate statement</span>
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="px-4 pb-3 text-xs text-red-500">{error}</div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="w-full md:w-1/2 flex flex-col min-h-[50vh] md:h-full">
          <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-sky-400 to-violet-500 text-primary-foreground shadow-sm">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <span>Draft preview</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <Button
                size="sm"
                variant="outline"
                disabled={!markdown.trim() || isExporting}
                onClick={() => void handleExport("docx")}
                className="gap-1"
              >
                <span>Word</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!markdown.trim() || isExporting}
                onClick={() => void handleExport("pdf")}
                className="gap-1"
              >
                <span>PDF</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!markdown.trim() || isChecking}
                onClick={() => void handleCheck()}
                className="gap-1"
              >
                {isChecking ? "Checking..." : "Quality check"}
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-4 md:px-6 py-4">
            {markdown ? (
              <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:text-foreground prose-strong:text-foreground prose-li:text-foreground/90 prose-ul:marker:text-primary/70">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center max-w-md mx-auto">
                Fill in your background, key experiences, and goals on the left, then click
                <span className="mx-1 font-semibold">Generate statement</span>
                to see a first-draft personal statement here.
              </div>
            )}
            {checkError && (
              <div className="mt-3 text-[11px] text-red-500">{checkError}</div>
            )}
            {checkItems.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <h2 className="text-xs font-semibold text-muted-foreground mb-2">
                  Quality checklist
                </h2>
                <div className="space-y-1.5 text-[11px]">
                  {checkItems.map((item, idx) => (
                    <div
                      key={`${item.section}-${idx}`}
                      className="flex items-start gap-2 rounded-md border border-border/60 bg-card/40 px-2 py-1.5"
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          item.status === "strong"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                            : item.status === "ok"
                            ? "bg-sky-500/10 text-sky-600 border border-sky-500/30"
                            : item.status === "weak"
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                            : "bg-red-500/10 text-red-600 border border-red-500/30"
                        }`}
                      >
                        {item.status}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[11px] truncate">{item.section}</div>
                        <div className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                          {item.comment}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
