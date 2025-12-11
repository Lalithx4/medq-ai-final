"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Send, Loader2, Download, BookOpen, ArrowLeft, StopCircle, Share2, PanelRightClose, PanelRightOpen, Globe, FileText, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressTracker } from "./ProgressTracker";
import { ReportViewer } from "./ReportViewer";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: "text" | "research_progress" | "research_report";
  data?: any; // For report/progress data
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
  conversationId?: string;
  initialMessages?: Message[];
  initialSources?: {
    pubmed: boolean;
    arxiv: boolean;
    web: boolean;
  };
  onBack?: () => void;
}

export const DeepResearchDashboard = ({ initialQuery, conversationId, initialMessages = [], initialSources, onBack }: DeepResearchDashboardProps) => {
  const [query, setQuery] = useState(""); // Input state
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isResearching, setIsResearching] = useState(false);

  // These states track the *current* active research to show live progress
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [currentPhase, setCurrentPhase] = useState("");
  const [overallProgress, setOverallProgress] = useState(0);

  // Source selection
  const [selectedSources, setSelectedSources] = useState({
    pubmed: true,
    arxiv: false,
    web: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoStarted = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentTasks]); // Scroll on new messages or task updates

  // Initial Auto-start logic
  useEffect(() => {
    // Only auto-start if we have a query AND NO existing messages
    if (initialQuery && !hasAutoStarted.current && messages.length === 0) {
      hasAutoStarted.current = true;
      // Start research (handleResearch handles adding the user message)
      handleResearch(initialQuery, initialSources);
    }
  }, [initialQuery, initialSources, messages.length]);


  const startResearchStream = async (userMessage: string, sourcesOverride?: typeof selectedSources) => {
    setIsResearching(true);
    setCurrentPhase("Initializing research...");
    setOverallProgress(0);

    // Initial tasks state
    const sourceNames: string[] = [];
    const currentSources = sourcesOverride || selectedSources;
    if (currentSources.pubmed) sourceNames.push('PubMed');
    if (currentSources.arxiv) sourceNames.push('arXiv');
    if (currentSources.web) sourceNames.push('Web');
    const sourcesText = sourceNames.join(', ') || 'PubMed';

    const initialTasks: Task[] = [
      { name: 'Topic Analysis', description: 'Analyzing topic and planning search strategy', status: 'pending', progress: 0 },
      { name: 'Literature Search', description: `Searching ${sourcesText} for 20+ articles`, status: 'pending', progress: 0 },
      { name: 'Content Generation', description: 'Generating comprehensive 8000+ word report', status: 'pending', progress: 0 },
      { name: 'Processing & Formatting', description: 'Structuring and formatting final report', status: 'pending', progress: 0 },
    ];
    setCurrentTasks(initialTasks);

    // Add a placeholder "Thinking" or "Researching" message?
    // Actually, we will render the ProgressTracker conditionally at the bottom while isResearching is true.

    try {
      console.log("[Research] Fetching stream...");
      const response = await fetch("/api/deep-research/langchain-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: userMessage,
          conversationId, // Pass conversationId for persistence
          topK: 10,
          nSections: 5,
          sources: currentSources
        }),
      });

      console.log("[Research] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Research] Server error:", errorText);
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let markdownChunks: string[] = [];
      let finalReportData: any = null;
      let finalMetadata: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let separatorIndex;
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

              // Handle Events
              if (eventData.type === "start") {
                setCurrentPhase(eventData.message);
                setOverallProgress(eventData.progress);
                setCurrentTasks(prev => prev.map((t, i) => i === 0 ? { ...t, status: 'in-progress', progress: 50 } : t));
              } else if (eventData.type === "progress") {
                setCurrentPhase(eventData.message);
                setOverallProgress(eventData.progress);

                // Update tasks logic (same as before)
                if (eventData.progress < 15) {
                  setCurrentTasks(prev => prev.map((t, i) => i === 0 ? { ...t, status: 'in-progress', progress: eventData.progress * 6 } : t));
                } else if (eventData.progress < 85) {
                  setCurrentTasks(prev => prev.map((t, i) => i === 0 ? { ...t, status: 'completed', progress: 100 } : i === 1 ? { ...t, status: 'in-progress', progress: (eventData.progress - 15) * 1.4 } : t));
                } else {
                  setCurrentTasks(prev => prev.map((t, i) => i === 0 || i === 1 ? { ...t, status: 'completed', progress: 100 } : i === 2 ? { ...t, status: 'in-progress', progress: (eventData.progress - 85) * 6 } : t));
                }
              } else if (eventData.type === "markdown_chunk") {
                markdownChunks.push(eventData.chunk);
              } else if (eventData.type === "metadata") {
                finalMetadata = eventData.metadata;
              } else if (eventData.type === "complete") {
                finalReportData = eventData.report;
                setCurrentTasks(prev => prev.map(t => ({ ...t, status: 'completed', progress: 100 })));
                setOverallProgress(100);
              }
            } catch (e) {
              console.error("SSE Parse Error", e);
            }
          }
        }
      }

      // Done
      const fullMarkdown = markdownChunks.join("");

      // Add the final report as a message
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Research complete. Here is the report:",
        type: "research_report",
        data: {
          markdown: fullMarkdown,
          metadata: finalMetadata,
          sources: [], // We can parse sources if needed, or ReportViewer handles it
          topic: userMessage
        }
      }]);

    } catch (error) {
      console.error("Research Error", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I encountered an error during research. Please try again."
      }]);
    } finally {
      setIsResearching(false);
    }
  };

  const handleResearch = async (text: string, sourcesOverride?: typeof selectedSources) => {
    if (!text.trim()) return;

    // Add user message if not already added (consistency check)
    // In auto-start, we added it manually. If triggered by input:
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.content !== text || lastMsg.role !== 'user') {
      setMessages(prev => [...prev, { role: "user", content: text }]);
    }

    await startResearchStream(text, sourcesOverride);
  };

  const handleInputSubmit = () => {
    if (!query.trim() || isResearching) return;
    const text = query;
    setQuery("");
    // Add user message
    setMessages(prev => [...prev, { role: "user", content: text }]);
    startResearchStream(text);
  };

  // ... imports are fine, make sure layout is updated

  return (
    <div className="flex flex-col h-full w-full bg-[#1a1a1c] text-gray-100 relative">
      {/* Header */}
      {/* Header removed as per request */}
      <div className="absolute top-4 left-4 z-20">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-8 scroll-smooth">
        {messages.length === 0 && !isResearching && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 opacity-50">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-2">
              <Bot className="w-8 h-8 text-teal-500" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">Ready to Research</h2>
              <p className="max-w-lg text-muted-foreground">
                Ask any complex medical question. I'll search PubMed, ArXiv, and the web to generate a comprehensive report with citations.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`w-full ${msg.role === 'user'
              ? 'max-w-3xl ml-auto'
              : 'w-full' // Assistant messages (reports) take full width
              }`}>

              {msg.role === 'user' ? (
                <div className="bg-teal-600/90 text-white rounded-2xl rounded-tr-sm px-6 py-4 shadow-lg backdrop-blur-sm">
                  {msg.content}
                </div>
              ) : (
                msg.type === 'research_report' ? (
                  <div className="w-full">

                    <ReportViewer
                      markdown={msg.data.markdown}
                      topic={msg.data.topic}
                      wordCount={msg.data.metadata?.wordCount || 0}
                      pmidCount={msg.data.metadata?.paperCount || 0}
                      sources={[]}
                    />
                  </div>
                ) : (
                  <div className="bg-[#2a2a2c] border border-white/5 rounded-2xl rounded-tl-sm px-6 py-4 text-gray-200 shadow-sm leading-relaxed whitespace-pre-wrap max-w-4xl">
                    {msg.content}
                  </div>
                )
              )}
            </div>
          </motion.div>
        ))}

        {/* Live Progress Indicator (active research) */}
        {isResearching && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl mx-auto mt-8"
          >
            <div className="bg-[#2a2a2c]/50 backdrop-blur border border-teal-500/20 rounded-2xl p-6 shadow-2xl">
              <ProgressTracker
                topic={[...messages].reverse().find(m => m.role === 'user')?.content || "Research"}
                overallProgress={overallProgress}
                currentPhase={currentPhase}
                tasks={currentTasks}
              />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="p-6 bg-[#1a1a1c] border-t border-white/5 z-20">
        <div className="max-w-7xl mx-auto">
          <div className={`relative bg-[#2a2a2c] transition-all duration-300 ring-1 ring-white/5 focus-within:ring-teal-500/50 rounded-2xl shadow-xl ${isResearching ? 'opacity-70 pointer-events-none' : ''}`}>
            {/* Main Input */}
            <div className="px-5 py-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
                placeholder={isResearching ? "Research in progress..." : "What would you like to research?"}
                disabled={isResearching}
                className="w-full bg-transparent border-none outline-none text-gray-200 placeholder:text-gray-500 text-base"
              />
            </div>

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
              {/* Sources Toggles */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium mr-2">Sources:</span>

                <button
                  onClick={() => setSelectedSources(prev => ({ ...prev, pubmed: !prev.pubmed }))}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${selectedSources.pubmed
                    ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                    : "bg-transparent border-gray-700 text-gray-500 hover:border-gray-600 hover:bg-white/5"}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedSources.pubmed ? "bg-blue-500" : "bg-zinc-600"}`} />
                  PubMed
                </button>
                <button
                  onClick={() => setSelectedSources(prev => ({ ...prev, arxiv: !prev.arxiv }))}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${selectedSources.arxiv
                    ? "bg-red-500/10 border-red-500/50 text-red-400"
                    : "bg-transparent border-gray-700 text-gray-500 hover:border-gray-600 hover:bg-white/5"}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedSources.arxiv ? "bg-red-500" : "bg-zinc-600"}`} />
                  ArXiv
                </button>
                <button
                  onClick={() => setSelectedSources(prev => ({ ...prev, web: !prev.web }))}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${selectedSources.web
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                    : "bg-transparent border-gray-700 text-gray-500 hover:border-gray-600 hover:bg-white/5"}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedSources.web ? "bg-emerald-500" : "bg-zinc-600"}`} />
                  Web
                </button>
              </div>

              {/* Submit Button */}
              <div className="flex items-center">
                <button
                  onClick={handleInputSubmit}
                  disabled={!query.trim() || isResearching}
                  className="p-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-teal-900/20"
                >
                  {isResearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
          <div className="text-center mt-3">
            <p className="text-[10px] text-zinc-500">
              MedQ AI Agent accesses live medical databases. Verify all clinical information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
