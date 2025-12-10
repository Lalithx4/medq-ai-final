"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Send, Loader2, Download, BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressTracker } from "./ProgressTracker";
import { ReportViewer } from "./ReportViewer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
}

interface Task {
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
}

interface DeepResearchDashboardProps {
  initialQuery?: string;
  initialSources?: {
    pubmed: boolean;
    arxiv: boolean;
    web: boolean;
  };
  onBack?: () => void;
}

export const DeepResearchDashboard = ({ initialQuery, initialSources, onBack }: DeepResearchDashboardProps) => {
  const [query, setQuery] = useState(initialQuery || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [pmidCount, setPmidCount] = useState(0);
  const [savedFileId, setSavedFileId] = useState<string | null>(null); // Store file ID for updates
  const [hasAutoSaved, setHasAutoSaved] = useState(false); // Track if already auto-saved

  // Source selection
  const [selectedSources, setSelectedSources] = useState({
    pubmed: true,
    arxiv: false,
    web: false
  });

  // Progress tracking
  const [showProgress, setShowProgress] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("");
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("");
  const [tasks, setTasks] = useState<Task[]>([
    { name: 'Topic Analysis', description: 'Analyzing topic and planning search strategy', status: 'pending', progress: 0 },
    { name: 'Literature Search', description: 'Searching multiple sources for articles', status: 'pending', progress: 0 },
    { name: 'Content Generation', description: 'Generating comprehensive 8000+ word report', status: 'pending', progress: 0 },
    { name: 'Processing & Formatting', description: 'Structuring and formatting final report', status: 'pending', progress: 0 },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoStarted = useRef(false);
  const isSaving = useRef(false); // Track if save is in progress

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-fill and start research from localStorage
  useEffect(() => {
    const storedQuery = localStorage.getItem('deepResearchQuery');

    // Check for stored sources preference
    const storedSources = localStorage.getItem('deepResearchSources');
    if (storedSources) {
      try {
        const parsedSources = JSON.parse(storedSources);
        setSelectedSources(parsedSources);
        localStorage.removeItem('deepResearchSources');
      } catch (e) {
        console.error("Failed to parse stored sources", e);
      }
    }

    if (storedQuery && !hasAutoStarted.current) {
      setQuery(storedQuery);
      localStorage.removeItem('deepResearchQuery');
      hasAutoStarted.current = true;
      // Auto-trigger research after a short delay
      setTimeout(() => {
        if (storedQuery.trim()) {
          setQuery("");
          setMessages([{ role: "user", content: storedQuery }]);
          // Pass the freshly parsed sources if available, otherwise use current state (which might be stale in closure)
          // Actually, we can just rely on the state update if we wait a tick, or pass explicitly.
          // Since we are in the same effect, state update for selectedSources won't be reflected in 'selectedSources' variable yet.
          // BUT startResearch uses selectedSources from state. 
          // To fix this race condition, we should pass sources to startResearch or use a ref.
          // For now, let's update state and rely on the fact that startResearch reads state. 
          // Wait, startResearch reads 'selectedSources' from closure. It will be the initial state.
          // We need to pass sources to startResearch.

          let sourcesToUse = { pubmed: true, arxiv: false, web: false };
          if (storedSources) {
            try { sourcesToUse = JSON.parse(storedSources); } catch (e) { }
          }

          startResearch(storedQuery, sourcesToUse);
        }
      }, 500);
    }
  }, []);

  const startResearch = async (userMessage: string, sourcesOverride?: typeof selectedSources) => {
    setIsResearching(true);
    setShowProgress(true);
    setCurrentTopic(userMessage);
    setGeneratedReport(null);
    setHasAutoSaved(false); // Reset auto-save flag for new research
    setSavedFileId(null); // Reset file ID for new research
    isSaving.current = false; // Reset saving flag

    // Reset progress
    setOverallProgress(0);
    setCurrentPhase("Initializing research...");
    // Use override if provided (for auto-start), otherwise use state
    const currentSources = sourcesOverride || selectedSources;

    // Build dynamic task description based on selected sources
    const sourceNames: string[] = [];
    if (currentSources.pubmed) sourceNames.push('PubMed');
    if (currentSources.arxiv) sourceNames.push('arXiv');
    if (currentSources.web) sourceNames.push('Web');
    const sourcesText = sourceNames.join(', ') || 'PubMed';

    setTasks([
      { name: 'Topic Analysis', description: 'Analyzing topic and planning search strategy', status: 'pending', progress: 0 },
      { name: 'Literature Search', description: `Searching ${sourcesText} for 20+ articles`, status: 'pending', progress: 0 },
      { name: 'Content Generation', description: 'Generating comprehensive 8000+ word report', status: 'pending', progress: 0 },
      { name: 'Processing & Formatting', description: 'Structuring and formatting final report', status: 'pending', progress: 0 },
    ]);

    try {
      // Always use LangChain multi-agent system with source selection
      const response = await fetch("/api/deep-research/langchain-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: userMessage,
          topK: 10,  // 10 papers per section for comprehensive research
          nSections: 5,  // 5 sections for thorough coverage
          sources: currentSources  // Pass selected sources
        }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let data: any = null;
      let markdownChunks: string[] = [];
      let metadata: any = null;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append this chunk to the buffer. Use stream option to handle multi-byte chars.
        buffer += decoder.decode(value, { stream: true });

        // Process all complete SSE events separated by double newlines
        let separatorIndex: number;
        while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);

          const eventLines = rawEvent.split("\n");
          for (const line of eventLines) {
            if (!line.startsWith("data: ")) continue;

            const json = line.slice(6);
            if (!json.trim()) continue;

            try {
              const eventData = JSON.parse(json);

              if (eventData.type === "start") {
                setCurrentPhase(eventData.message);
                setOverallProgress(eventData.progress);
                setTasks(prev => prev.map((t, i) => i === 0 ? { ...t, status: 'in-progress', progress: 50 } : t));
              } else if (eventData.type === "progress") {
                setCurrentPhase(eventData.message);
                setOverallProgress(eventData.progress);

                // Update tasks based on progress
                if (eventData.progress < 15) {
                  setTasks(prev => prev.map((t, i) =>
                    i === 0 ? { ...t, status: 'in-progress', progress: eventData.progress * 6 } : t
                  ));
                } else if (eventData.progress < 85) {
                  setTasks(prev => prev.map((t, i) =>
                    i === 0 ? { ...t, status: 'completed', progress: 100 } :
                      i === 1 ? { ...t, status: 'in-progress', progress: (eventData.progress - 15) * 1.4 } : t
                  ));
                } else {
                  setTasks(prev => prev.map((t, i) =>
                    i === 0 || i === 1 ? { ...t, status: 'completed', progress: 100 } :
                      i === 2 ? { ...t, status: 'in-progress', progress: (eventData.progress - 85) * 6 } : t
                  ));
                }
              } else if (eventData.type === "metadata") {
                metadata = eventData.metadata;
              } else if (eventData.type === "markdown_chunk") {
                markdownChunks.push(eventData.chunk);
              } else if (eventData.type === "complete") {
                data = eventData.report;
                setTasks(prev => prev.map(t => ({ ...t, status: 'completed', progress: 100 })));
                setCurrentPhase("Research complete!");
                setOverallProgress(100);
              } else if (eventData.type === "error") {
                throw new Error(eventData.message);
              }
            } catch (e) {
              console.error("Error parsing SSE:", e, json);
            }
          }
        }
      }

      // Combine markdown chunks
      const fullReport = markdownChunks.join("");

      // Debug: log full generated deep research markdown
      // eslint-disable-next-line no-console
      console.log("[DEEP RESEARCH] Full generated markdown:\n", fullReport);

      if (!fullReport) {
        throw new Error("No markdown content received from stream");
      }

      setGeneratedReport(fullReport);
      setWordCount(metadata?.wordCount || 0);
      setPmidCount(metadata?.paperCount || 0);

      // Build sources from sections if available
      const allSources: ResearchSource[] = [];
      if (data && data.sections) {
        data.sections.forEach((section: any) => {
          section.papers.forEach((paper: any) => {
            allSources.push({
              title: paper.Title || paper.title || "Untitled",
              url: `https://pubmed.ncbi.nlm.nih.gov/${paper.PMID || paper.pmid}/`,
              snippet: "Research article from PubMed",
            });
          });
        });
        setSources(allSources);
      }

      // Auto-save to files (only once, using ref to prevent race conditions)
      if (!hasAutoSaved && !isSaving.current) {
        isSaving.current = true; // Mark as saving immediately
        try {
          console.log("💾 Auto-saving deep research report...");
          const saveResponse = await fetch("/api/files/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: savedFileId, // Include file ID to update existing file
              type: "deep-research",
              content: fullReport,
              sources: allSources,
              title: userMessage || "Untitled Research",
            }),
          });

          const saveData = await saveResponse.json();
          if (saveData.success && saveData.fileId) {
            setSavedFileId(saveData.fileId); // Store file ID for future updates
            console.log("✅ Deep research report auto-saved to files (ID:", saveData.fileId, ")");
          }

          setHasAutoSaved(true); // Mark as saved
        } catch (error) {
          console.error("Error auto-saving report:", error);
          isSaving.current = false; // Reset on error
        }
      } else {
        console.log("⏭️  Skipping auto-save (already saved or saving in progress)");
      }

      // Hide progress after 2 seconds
      setTimeout(() => {
        setShowProgress(false);
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I apologize, but I'm having trouble conducting the research. Please try again."
      }]);
    } finally {
      setIsResearching(false);
    }
  };

  const handleResearch = async () => {
    if (!query.trim() || isResearching) return;

    const userMessage = query.trim();
    setQuery("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    await startResearch(userMessage);
  };

  const handleDownloadWord = async () => {
    if (!generatedReport) return;

    const reportId = localStorage.getItem('lastReportId');
    if (reportId) {
      // Download from API
      window.open(`/api/deep-research/download/${reportId}`, '_blank');
    } else {
      // Fallback: download directly
      const blob = new Blob([generatedReport], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deep-research-${Date.now()}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const saveToFiles = async () => {
    try {
      const saveResponse = await fetch("/api/files/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: savedFileId, // Update existing file if available
          type: "deep-research",
          content: generatedReport,
          sources: sources,
          title: messages.find(m => m.role === "user")?.content || "Untitled Research",
        }),
      });

      const saveData = await saveResponse.json();
      if (saveData.success && saveData.fileId && !savedFileId) {
        setSavedFileId(saveData.fileId); // Store file ID if this was first manual save
      }
    } catch (error) {
      console.error("Error saving to files:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleResearch();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 relative"
        >
          {onBack && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:block">
              <button
                onClick={onBack}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-background/50 hover:bg-background/80 rounded-lg border border-border/50 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Search
              </button>
            </div>
          )}
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-6">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-foreground">
            Deep Research Agent
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Conduct comprehensive multi-source research with autonomous agents.
            Access PubMed, arXiv, and web sources to generate evidence-based reports.
          </p>
        </motion.div>

        {/* Main Input Area */}
        <AnimatePresence mode="wait">
          {!isResearching && !generatedReport ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-card border border-border rounded-2xl shadow-xl p-2 mb-8">
                <div className="flex items-center px-4 py-2">
                  <Search className="w-6 h-6 text-muted-foreground mr-4" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                    placeholder="What would you like to research today?"
                    className="flex-1 bg-transparent border-none outline-none text-lg h-14 text-foreground placeholder:text-muted-foreground/70"
                  />
                  <Button
                    onClick={handleResearch}
                    disabled={!query.trim()}
                    size="lg"
                    className="rounded-xl px-8 font-medium"
                  >
                    Start Research
                  </Button>
                </div>
              </div>

              {/* Source Selection */}
              <div className="flex flex-wrap justify-center gap-4 mb-12">
                <button
                  onClick={() => setSelectedSources(prev => ({ ...prev, pubmed: !prev.pubmed }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${selectedSources.pubmed
                    ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400"
                    : "bg-background border-border text-muted-foreground hover:border-primary/50"
                    }`}
                >
                  <div className={`w-2 h-2 rounded-full ${selectedSources.pubmed ? "bg-blue-500" : "bg-muted-foreground"}`} />
                  <span className="font-medium">PubMed Central</span>
                </button>

                <button
                  onClick={() => setSelectedSources(prev => ({ ...prev, arxiv: !prev.arxiv }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${selectedSources.arxiv
                    ? "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400"
                    : "bg-background border-border text-muted-foreground hover:border-primary/50"
                    }`}
                >
                  <div className={`w-2 h-2 rounded-full ${selectedSources.arxiv ? "bg-red-500" : "bg-muted-foreground"}`} />
                  <span className="font-medium">arXiv</span>
                </button>

                <button
                  onClick={() => setSelectedSources(prev => ({ ...prev, web: !prev.web }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${selectedSources.web
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "bg-background border-border text-muted-foreground hover:border-primary/50"
                    }`}
                >
                  <div className={`w-2 h-2 rounded-full ${selectedSources.web ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                  <span className="font-medium">Web Search</span>
                </button>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="p-6 rounded-2xl bg-card/50 border border-border/50">
                  <div className="w-10 h-10 mx-auto bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Comprehensive</h3>
                  <p className="text-sm text-muted-foreground">Analyzes 20+ papers per topic to generate thorough reports</p>
                </div>
                <div className="p-6 rounded-2xl bg-card/50 border border-border/50">
                  <div className="w-10 h-10 mx-auto bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <Send className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Evidence-Based</h3>
                  <p className="text-sm text-muted-foreground">Every claim is cited with direct links to original sources</p>
                </div>
                <div className="p-6 rounded-2xl bg-card/50 border border-border/50">
                  <div className="w-10 h-10 mx-auto bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <Download className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Export Ready</h3>
                  <p className="text-sm text-muted-foreground">Download as Markdown or Word, or edit in our AI editor</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Progress Section */}
              {(showProgress || isResearching) && (
                <ProgressTracker
                  topic={currentTopic}
                  overallProgress={overallProgress}
                  currentPhase={currentPhase}
                  tasks={tasks}
                />
              )}

              {/* Report Viewer */}
              {generatedReport && (
                <ReportViewer
                  markdown={generatedReport}
                  topic={currentTopic}
                  wordCount={wordCount}
                  pmidCount={pmidCount}
                  reportId={reportId || undefined}
                  sources={sources}
                  savedFileId={savedFileId}
                />
              )}

              {/* Reset Button */}
              {!isResearching && generatedReport && (
                <div className="flex justify-center pt-8">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGeneratedReport(null);
                      setQuery("");
                      setShowProgress(false);
                    }}
                    className="gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Start New Research
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
