"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { ResearchPaperConfig, DEFAULT_CONFIG, ESSAY_TYPE_INFO, ACADEMIC_LEVEL_INFO } from "@/lib/research-paper/paper-config";
import { motion, AnimatePresence } from "framer-motion";
import { PaperProgressTracker } from "./PaperProgressTracker";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCreditsCheck } from "@/hooks/useCreditsCheck";

interface ProgressStep {
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
}

export function ResearchPaperForm() {
  const { checkCredits, InsufficientCreditsDialog, LowCreditsDialog } = useCreditsCheck();
  
  const [config, setConfig] = useState<ResearchPaperConfig>(DEFAULT_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [hasAutoSaved, setHasAutoSaved] = useState(false); // Track if already auto-saved
  const [savedFileId, setSavedFileId] = useState<string | null>(null); // Store file ID for updates
  const isSaving = useRef(false); // Track if save is in progress
  
  // Progress tracking
  const [showProgress, setShowProgress] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("");
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
    { name: 'Planning Paper Structure', description: 'Generating title, keywords, and sections', status: 'pending', progress: 0 },
    { name: 'Searching PubMed Database', description: 'Finding medical research articles', status: 'pending', progress: 0 },
    { name: 'Analyzing Research Papers', description: 'Processing and synthesizing findings', status: 'pending', progress: 0 },
    { name: 'Writing Introduction', description: 'Generating academic introduction', status: 'pending', progress: 0 },
    { name: 'Generating Main Sections', description: 'Writing comprehensive content', status: 'pending', progress: 0 },
    { name: 'Writing Methodology & Results', description: 'Generating methodology and results sections', status: 'pending', progress: 0 },
    { name: 'Final Assembly', description: 'Assembling abstract, discussion, and conclusion', status: 'pending', progress: 0 },
  ]);

  // Auto-fill topic from localStorage
  useEffect(() => {
    const storedTopic = localStorage.getItem('researchPaperTopic');
    if (storedTopic) {
      setConfig(prev => ({ ...prev, topic: storedTopic }));
      localStorage.removeItem('researchPaperTopic');
    }
  }, []);

  const handleGenerate = async () => {
    if (!config.topic.trim()) return;

    // Check credits before starting
    const hasCredits = await checkCredits("research_paper", "Research Paper Generation");
    if (!hasCredits) {
      return;
    }

    setIsGenerating(true);
    setGeneratedPaper(null);
    setShowProgress(true);
    setOverallProgress(0);
    setHasAutoSaved(false); // Reset auto-save flag for new generation
    setSavedFileId(null); // Reset file ID for new generation
    isSaving.current = false; // Reset saving flag

    // Reset progress steps
    setProgressSteps([
      { name: 'Planning Paper Structure', description: 'Generating title, keywords, and sections', status: 'pending', progress: 0 },
      { name: 'Searching PubMed Database', description: 'Finding medical research articles', status: 'pending', progress: 0 },
      { name: 'Analyzing Research Papers', description: 'Processing and synthesizing findings', status: 'pending', progress: 0 },
      { name: 'Writing Introduction', description: 'Generating academic introduction', status: 'pending', progress: 0 },
      { name: 'Generating Main Sections', description: 'Writing comprehensive content', status: 'pending', progress: 0 },
      { name: 'Writing Methodology & Results', description: 'Generating methodology and results sections', status: 'pending', progress: 0 },
      { name: 'Final Assembly', description: 'Assembling abstract, discussion, and conclusion', status: 'pending', progress: 0 },
    ]);

    try {
      // LangChain handles all steps via streaming
      setCurrentPhase("🎯 Starting LangChain Paper Agent...");
      setOverallProgress(0);

      // Use enhanced academic paper endpoint with citation style
      const response = await fetch("/api/research-paper/academic-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: config.topic,
          citationStyle: config.citationStyle,
          topK: 10,  // 10 papers per section for comprehensive research
          nSections: 5,
        }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let markdownChunks: string[] = [];
      let metadata: any = null;
      let paperData: any = null;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events separated by double newlines
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
              } else if (eventData.type === "progress") {
                setCurrentPhase(eventData.message);
                const progress = eventData.progress;
                setOverallProgress(progress);
                
                // Map progress to steps (0-100 → 7 steps)
                if (progress < 5) {
                  // Step 0: Planning
                  setProgressSteps(prev => prev.map((s, i) => 
                    i === 0 ? { ...s, status: 'in-progress', progress: progress * 20 } : s
                  ));
                } else if (progress < 15) {
                  // Step 1: Searching PubMed
                  setProgressSteps(prev => prev.map((s, i) => 
                    i === 0 ? { ...s, status: 'completed', progress: 100 } :
                    i === 1 ? { ...s, status: 'in-progress', progress: (progress - 5) * 10 } : s
                  ));
                } else if (progress < 75) {
                  // Step 2-4: Analyzing & Writing sections
                  setProgressSteps(prev => prev.map((s, i) => 
                    i === 0 || i === 1 ? { ...s, status: 'completed', progress: 100 } :
                    i === 2 ? { ...s, status: 'in-progress', progress: Math.min(100, (progress - 15) * 1.67) } :
                    i === 3 ? { ...s, status: progress > 35 ? 'in-progress' : 'pending', progress: Math.max(0, (progress - 35) * 2.5) } :
                    i === 4 ? { ...s, status: progress > 55 ? 'in-progress' : 'pending', progress: Math.max(0, (progress - 55) * 5) } : s
                  ));
                } else if (progress < 90) {
                  // Step 5: Methodology & Results
                  setProgressSteps(prev => prev.map((s, i) => 
                    i < 5 ? { ...s, status: 'completed', progress: 100 } :
                    i === 5 ? { ...s, status: 'in-progress', progress: (progress - 75) * 6.67 } : s
                  ));
                } else {
                  // Step 6: Final Assembly
                  setProgressSteps(prev => prev.map((s, i) => 
                    i < 6 ? { ...s, status: 'completed', progress: 100 } :
                    i === 6 ? { ...s, status: 'in-progress', progress: (progress - 90) * 10 } : s
                  ));
                }
              } else if (eventData.type === "metadata") {
                metadata = eventData.metadata;
              } else if (eventData.type === "markdown_chunk") {
                markdownChunks.push(eventData.chunk);
              } else if (eventData.type === "complete") {
                paperData = eventData.paper;
                setProgressSteps(prev => prev.map(s => ({ ...s, status: 'completed', progress: 100 })));
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
      const fullPaper = markdownChunks.join("");

      // Debug: log full generated paper markdown
      // Note: this can be large, but is useful for verifying references and structure
      // eslint-disable-next-line no-console
      console.log("[RESEARCH PAPER] Full generated markdown:\n", fullPaper);

      if (!fullPaper) {
        throw new Error("No paper content received");
      }

      setGeneratedPaper(fullPaper);
      setResult({
        success: true,
        paper: fullPaper,
        metadata,
        paperData,
      });
      
      // Auto-save to files (only once, using ref to prevent race conditions)
      if (!hasAutoSaved && !isSaving.current) {
        isSaving.current = true; // Mark as saving immediately
        try {
          console.log("💾 Auto-saving research paper...");
          const saveResponse = await fetch("/api/files/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: savedFileId, // Include file ID to update existing file
              type: "research-paper",
              content: fullPaper,
              title: config.topic || "Untitled Research Paper",
              metadata: {
                citationStyle: config.citationStyle,
                academicLevel: config.academicLevel,
                ...metadata,
              },
            }),
          });
          
          const saveData = await saveResponse.json();
          if (saveData.success && saveData.fileId) {
            setSavedFileId(saveData.fileId); // Store file ID for future updates
            console.log("✅ Research paper auto-saved to files (ID:", saveData.fileId, ")");
          }
          
          setHasAutoSaved(true); // Mark as saved
        } catch (error) {
          console.error("Error auto-saving paper:", error);
          isSaving.current = false; // Reset on error
        }
      } else {
        console.log("⏭️  Skipping auto-save (already saved or saving in progress)");
      }
      
      setCurrentPhase("Paper generation complete!");
      setTimeout(() => setShowProgress(false), 2000);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to generate paper. Please try again.");
      setShowProgress(false);
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <>
      <InsufficientCreditsDialog />
      <LowCreditsDialog />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Academic Research Paper Generator</h1>
              <p className="text-sm text-muted-foreground">
                Generate professional research papers with proper citations and formatting
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className={`grid grid-cols-1 gap-6 transition-all duration-300 ${generatedPaper ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}>
          {/* Configuration Panel - Collapsible */}
          {!generatedPaper && (
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Paper Configuration</h2>

              {/* Essay Topic */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Essay Topic</label>
                <textarea
                  value={config.topic}
                  onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                  placeholder="Input your essay topic and instructions, or paste a block of text or upload a file to base the essay on."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none h-32 text-sm"
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {config.topic.length}/12000
                </p>
              </div>

              {/* Academic Level */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Academic Level</label>
                <select
                  value={config.academicLevel}
                  onChange={(e) => setConfig({ ...config, academicLevel: e.target.value as any })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  disabled={isGenerating}
                >
                  {Object.entries(ACADEMIC_LEVEL_INFO).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Length */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Length: {config.targetWordCount} words
                </label>
                <input
                  type="range"
                  min="1500"
                  max="10000"
                  step="500"
                  value={config.targetWordCount}
                  onChange={(e) => setConfig({ ...config, targetWordCount: parseInt(e.target.value) })}
                  className="w-full"
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {config.targetWordCount < 3000 ? "500 - 3000 words" : "3000 - 10000 words"}
                </p>
              </div>

              {/* Citation Style */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Citation Style</label>
                <select
                  value={config.citationStyle}
                  onChange={(e) => setConfig({ ...config, citationStyle: e.target.value as any })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  disabled={isGenerating}
                >
                  <option value="APA">APA</option>
                  <option value="MLA">MLA</option>
                  <option value="Chicago">Chicago</option>
                  <option value="Harvard">Harvard</option>
                  <option value="IEEE">IEEE</option>
                  <option value="Vancouver">Vancouver</option>
                </select>
              </div>

              {/* Language */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Language</label>
                <select
                  value={config.language || "English"}
                  onChange={(e) => setConfig({ ...config, language: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  disabled={isGenerating}
                >
                  <option value="English">English</option>
                </select>
              </div>

              {/* Sources */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Research Sources</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.sources.pubmed}
                      onChange={(e) => setConfig({ 
                        ...config, 
                        sources: { ...config.sources, pubmed: e.target.checked }
                      })}
                      className="w-4 h-4 rounded border-border"
                      disabled={isGenerating}
                    />
                    <span className="text-sm">PubMed (Medical)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.sources.arxiv}
                      onChange={(e) => setConfig({ 
                        ...config, 
                        sources: { ...config.sources, arxiv: e.target.checked }
                      })}
                      className="w-4 h-4 rounded border-border"
                      disabled={isGenerating}
                    />
                    <span className="text-sm">arXiv (STEM)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.sources.web}
                      onChange={(e) => setConfig({ 
                        ...config, 
                        sources: { ...config.sources, web: e.target.checked }
                      })}
                      className="w-4 h-4 rounded border-border"
                      disabled={isGenerating}
                    />
                    <span className="text-sm">Web Search</span>
                  </label>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !config.topic.trim()}
                className="w-full gap-2"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Paper...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Generate Essay
                  </>
                )}
              </Button>
            </div>
          </div>
          )}

          {/* Preview Panel */}
          <div className={generatedPaper ? "lg:col-span-1" : "lg:col-span-2"}>
            <AnimatePresence mode="wait">
              {showProgress && isGenerating ? (
                <PaperProgressTracker
                  key="progress"
                  topic={config.topic}
                  overallProgress={overallProgress}
                  currentPhase={currentPhase}
                  steps={progressSteps}
                />
              ) : generatedPaper ? (
                <motion.div
                  key="paper"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  {/* Paper Header */}
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
                    <h2 className="text-xl font-bold mb-2">{config.topic}</h2>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-3">
                      <div>
                        <span className="font-semibold text-foreground">{result?.metadata?.wordCount || 0}</span> words
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{result?.metadata?.paperCount || 0}</span> references
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{config.citationStyle}</span> style
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{config.academicLevel}</span> level
                      </div>
                    </div>
                    
                    {/* Paper Stats */}
                  </div>

                  {/* Paper Content - Always Formatted */}
                  <div className="p-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {generatedPaper}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Actions - Fixed at bottom */}
                  <div className="bg-background p-4 border-t border-border sticky bottom-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        ✅ Paper generated successfully
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          onClick={async () => {
                            try {
                              const response = await fetch("/api/files/save", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  content: generatedPaper,
                                  title: config.topic,
                                  type: "research-paper"
                                }),
                              });
                              const data = await response.json();
                              if (data.success) {
                                alert("Saved to your files successfully!");
                              } else {
                                throw new Error(data.error);
                              }
                            } catch (error) {
                              console.error("Error saving to files:", error);
                              alert("Failed to save to files. Please try again.");
                            }
                          }}
                          variant="outline" 
                          size="sm"
                          className="gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Save to Files
                        </Button>
                        <Button 
                          onClick={async () => {
                            try {
                              const response = await fetch("/api/files/save", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  content: generatedPaper,
                                  title: config.topic,
                                  type: "research-paper"
                                }),
                              });
                              const data = await response.json();
                              if (data.success && data.fileId) {
                                window.location.href = `/editor?fileId=${data.fileId}`;
                              } else {
                                throw new Error(data.error || "Failed to save");
                              }
                            } catch (error) {
                              console.error("Error opening in editor:", error);
                              alert("Failed to open in editor. Please try again.");
                            }
                          }}
                          variant="outline" 
                          size="sm"
                          className="gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Open in Editor
                        </Button>
                        <Button 
                          onClick={() => {
                            setGeneratedPaper(null);
                            setResult(null);
                            setShowProgress(false);
                          }} 
                          variant="default"
                          size="sm"
                          className="gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          New Paper
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-xl p-12 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Ready to Generate</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Configure your paper settings on the left and click "Generate Essay" to create a professional academic paper with proper citations.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
