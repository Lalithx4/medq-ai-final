"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Copy, Check, Download, FileText, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCreditsCheck } from "@/hooks/useCreditsCheck";
import { useRouter } from "next/navigation";

interface ReviewFocus {
  id: string;
  name: string;
  description: string;
}

interface ManuscriptStats {
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordLength: number;
  readingTime: number;
  avgSentenceLength: number;
}

interface ReviewResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  score: {
    grammar: number;
    structure: number;
    scientific: number;
    citations: number;
    overall: number;
  };
}

const REVIEW_FOCUSES: ReviewFocus[] = [
  { id: "comprehensive", name: "Comprehensive", description: "Full manuscript review" },
  { id: "grammar", name: "Grammar & Style", description: "Language and writing quality" },
  { id: "structure", name: "Structure", description: "Organization and flow" },
  { id: "scientific", name: "Scientific Rigor", description: "Methodology and evidence" },
  { id: "citations", name: "Citations", description: "References and citations" },
];

export function ManuscriptReviewForm() {
  const { checkCredits, InsufficientCreditsDialog, LowCreditsDialog } = useCreditsCheck();
  const router = useRouter();
  
  const [manuscriptText, setManuscriptText] = useState("");
  const [focus, setFocus] = useState("comprehensive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<ReviewResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ManuscriptStats | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate manuscript statistics
  const calculateStats = (text: string): ManuscriptStats => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    const wordCount = words.length;
    const charCount = text.length;
    const sentenceCount = sentences.length;
    const paragraphCount = paragraphs.length;
    const avgWordLength = wordCount > 0 ? words.reduce((sum, w) => sum + w.length, 0) / wordCount : 0;
    const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

    return {
      wordCount,
      charCount,
      sentenceCount,
      paragraphCount,
      avgWordLength,
      readingTime,
      avgSentenceLength,
    };
  };

  // Update stats when manuscript changes
  useEffect(() => {
    if (manuscriptText.trim()) {
      setStats(calculateStats(manuscriptText));
    } else {
      setStats(null);
    }
  }, [manuscriptText]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        // Handle PDF files
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractTextFromPDF(arrayBuffer);
        
        if (text.includes("⚠️") || text.includes("npm install")) {
          // PDF extraction failed, show message and allow paste
          alert(text);
          setManuscriptText("");
        } else {
          setManuscriptText(text);
        }
      } else {
        // Handle text files
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setManuscriptText(content);
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Error reading file. Please try again or paste text directly.");
    }
  };

  // PDF text extraction using CDN version of pdfjs
  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      // Check if pdfjs is already loaded
      if ((window as any).pdfjsLib) {
        const pdfjsLib = (window as any).pdfjsLib;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str || "")
            .join(" ");
          fullText += pageText + "\n";
        }

        return fullText.trim() || "PDF extracted but appears to be empty or image-based. Please paste text directly.";
      }

      // Load pdfjs from CDN (version 2.6.347)
      const pdfjsVersion = "2.6.347";
      
      return new Promise((resolve, reject) => {
        // Load PDF.js library
        const script = document.createElement("script");
        script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.min.js`;
        script.async = true;
        
        script.onload = async () => {
          try {
            const pdfjsLib = (window as any).pdfjsLib;
            
            // Set up worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = 
              `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
            
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items
                .map((item: any) => item.str || "")
                .join(" ");
              fullText += pageText + "\n";
            }

            resolve(fullText.trim() || "PDF extracted but appears to be empty or image-based. Please paste text directly.");
          } catch (error) {
            console.error("PDF processing error:", error);
            reject(error);
          }
        };
        
        script.onerror = () => {
          console.error("Failed to load PDF.js from CDN");
          reject(new Error("Failed to load PDF.js library"));
        };
        
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error("PDF extraction error:", error);
      // Fallback message
      return "⚠️ PDF extraction encountered an issue.\n\nAlternatively, you can:\n1. Paste the text content directly\n2. Use a .txt file instead\n3. Copy text from the PDF manually";
    }
  };

  const handleGenerate = async () => {
    if (!manuscriptText.trim()) {
      alert("Please enter or upload manuscript text");
      return;
    }

    const hasCredits = await checkCredits("editor_improve", "Manuscript Review");
    if (!hasCredits) return;

    setIsGenerating(true);
    setReview(null);
    setReviewData(null);
    setStreamingText("");

    try {
      console.log("🔍 DEBUG: Starting review generation...");
      console.log("📝 Manuscript length:", manuscriptText.length);
      console.log("🎯 Focus:", focus);

      const focusPrompts: Record<string, string> = {
        comprehensive: "Provide a comprehensive review of this manuscript covering grammar, structure, scientific rigor, and citations. Format your response as JSON with: summary, strengths (array), weaknesses (array), suggestions (array), and score (object with grammar, structure, scientific, citations, overall - each 1-10).",
        grammar: "Review this manuscript focusing on grammar, spelling, punctuation, and writing style. Format your response as JSON with: summary, strengths, weaknesses, suggestions, and score.",
        structure: "Evaluate the organization, flow, and logical structure of this manuscript. Format your response as JSON with: summary, strengths, weaknesses, suggestions, and score.",
        scientific: "Assess the scientific methodology, evidence quality, and research rigor of this manuscript. Format your response as JSON with: summary, strengths, weaknesses, suggestions, and score.",
        citations: "Review the citation format, completeness, and relevance of references in this manuscript. Format your response as JSON with: summary, strengths, weaknesses, suggestions, and score.",
      };

      const query = focusPrompts[focus] || focusPrompts.comprehensive;

      console.log("📤 Sending request to /api/editor/ai-assist...");
      const response = await fetch("/api/editor/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          context: manuscriptText,
        }),
      });

      console.log("📥 Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ API Error:", errorData);
        throw new Error(errorData.error || "Failed to generate review");
      }

      const data = await response.json();
      const responseText = data.response;
      
      console.log("✅ Response received, length:", responseText.length);
      console.log("📄 Response preview:", responseText.substring(0, 200));

      // Try to parse as JSON for structured output
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log("🔍 JSON found in response");
          const parsed = JSON.parse(jsonMatch[0]) as ReviewResult;
          console.log("✅ JSON parsed successfully:", parsed);
          setReviewData(parsed);
          setReview(JSON.stringify(parsed, null, 2));
        } else {
          console.log("⚠️ No JSON found, using plain text");
          setReview(responseText);
        }
      } catch (parseError) {
        console.error("⚠️ JSON parse error:", parseError);
        console.log("Using plain text response");
        setReview(responseText);
      }
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Failed to generate review. Please try again. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (review) {
      navigator.clipboard.writeText(review);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveToEditor = async () => {
    console.log("💾 DEBUG: handleSaveToEditor called");
    console.log("📊 reviewData:", reviewData);
    console.log("📄 review:", review);

    if (!reviewData && !review) {
      console.error("❌ No review data or review text available");
      alert("No review to save. Please generate a review first.");
      return;
    }

    try {
      // Format review as markdown
      let markdown = "";
      if (reviewData) {
        console.log("✅ Using structured review data");
        markdown = `# Manuscript Review

## Summary
${reviewData.summary}

## Scores
- Grammar: ${reviewData.score.grammar}/10
- Structure: ${reviewData.score.structure}/10
- Scientific Rigor: ${reviewData.score.scientific}/10
- Citations: ${reviewData.score.citations}/10
- **Overall: ${reviewData.score.overall}/10**

## Strengths
${reviewData.strengths.map(s => `- ${s}`).join('\n')}

## Weaknesses
${reviewData.weaknesses.map(w => `- ${w}`).join('\n')}

## Suggestions
${reviewData.suggestions.map(s => `- ${s}`).join('\n')}
`;
      } else if (review) {
        console.log("⚠️ Using plain text review (fallback)");
        markdown = review;
      }

      // Save to database
      console.log("💾 Saving to database...");
      const saveResponse = await fetch("/api/files/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Manuscript Review",
          content: markdown,
          type: "document",
        }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.error || "Failed to save review");
      }

      const savedData = await saveResponse.json();
      console.log("✅ Saved to database! File ID:", savedData.id);

      // Open in editor with file ID
      console.log("🔗 Opening in editor with file ID:", savedData.id);
      router.push(`/editor?fileId=${savedData.id}`);
    } catch (error) {
      console.error("❌ Error saving review:", error);
      alert("Failed to save review. Please try again.");
    }
  };

  const exportAsMarkdown = () => {
    if (!reviewData) return;
    
    const md = `# Manuscript Review

## Summary
${reviewData.summary}

## Scores
- Grammar: ${reviewData.score.grammar}/10
- Structure: ${reviewData.score.structure}/10
- Scientific Rigor: ${reviewData.score.scientific}/10
- Citations: ${reviewData.score.citations}/10
- **Overall: ${reviewData.score.overall}/10**

## Strengths
${reviewData.strengths.map(s => `- ${s}`).join('\n')}

## Weaknesses
${reviewData.weaknesses.map(w => `- ${w}`).join('\n')}

## Suggestions
${reviewData.suggestions.map(s => `- ${s}`).join('\n')}
`;
    
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manuscript-review.md";
    a.click();
  };

  const exportAsJSON = () => {
    if (!reviewData) return;
    
    const blob = new Blob([JSON.stringify(reviewData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manuscript-review.json";
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Manuscript Review</h1>
          <p className="text-lg text-slate-600">
            Get comprehensive feedback on your academic manuscript
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-4"
          >
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Manuscript</h2>

              {/* Text Input */}
              <textarea
                value={manuscriptText}
                onChange={(e) => setManuscriptText(e.target.value)}
                placeholder="Paste your manuscript here or upload a file..."
                className="w-full h-48 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />

              {/* File Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Manuscript
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />

              <p className="text-sm text-slate-500 mt-2">
                {manuscriptText.length} characters
              </p>

              {/* Statistics */}
              {stats && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-sm text-blue-900">Statistics</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                    <div>Words: <span className="font-semibold">{stats.wordCount}</span></div>
                    <div>Sentences: <span className="font-semibold">{stats.sentenceCount}</span></div>
                    <div>Paragraphs: <span className="font-semibold">{stats.paragraphCount}</span></div>
                    <div>Reading time: <span className="font-semibold">{stats.readingTime} min</span></div>
                    <div>Avg word length: <span className="font-semibold">{stats.avgWordLength.toFixed(1)}</span></div>
                    <div>Avg sentence length: <span className="font-semibold">{stats.avgSentenceLength.toFixed(1)}</span></div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Review Focus */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Review Focus</h2>
              <div className="space-y-2">
                {REVIEW_FOCUSES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFocus(f.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      focus === f.id
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                    }`}
                  >
                    <div className="font-semibold">{f.name}</div>
                    <div className="text-sm opacity-75">{f.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !manuscriptText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Reviewing...
                </>
              ) : (
                "Generate Review"
              )}
            </Button>
          </motion.div>

          {/* Output Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <AnimatePresence>
              {review ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-lg shadow-md p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">
                      Review Results
                    </h2>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={handleCopy}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </Button>
                      {reviewData && (
                        <>
                          <Button
                            onClick={exportAsMarkdown}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Markdown
                          </Button>
                          <Button
                            onClick={exportAsJSON}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            JSON
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Structured Review Display */}
                  {reviewData ? (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="bg-slate-50 rounded-lg p-4">
                        <h3 className="font-semibold text-slate-900 mb-2">Summary</h3>
                        <p className="text-sm text-slate-700">{reviewData.summary}</p>
                      </div>

                      {/* Scores */}
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4">
                        <h3 className="font-semibold text-slate-900 mb-3">Scores</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(reviewData.score).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700 capitalize">
                                {key === "overall" ? "Overall" : key}:
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      value >= 8 ? "bg-green-500" : value >= 6 ? "bg-yellow-500" : "bg-red-500"
                                    }`}
                                    style={{ width: `${(value / 10) * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold text-slate-900">{value}/10</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Strengths */}
                      {reviewData.strengths.length > 0 && (
                        <div className="bg-green-50 rounded-lg p-4">
                          <h3 className="font-semibold text-green-900 mb-2">Strengths</h3>
                          <ul className="space-y-1">
                            {reviewData.strengths.map((s, i) => (
                              <li key={i} className="text-sm text-green-800 flex gap-2">
                                <span>✓</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Weaknesses */}
                      {reviewData.weaknesses.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-4">
                          <h3 className="font-semibold text-red-900 mb-2">Weaknesses</h3>
                          <ul className="space-y-1">
                            {reviewData.weaknesses.map((w, i) => (
                              <li key={i} className="text-sm text-red-800 flex gap-2">
                                <span>⚠</span> {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Suggestions */}
                      {reviewData.suggestions.length > 0 && (
                        <div className="bg-amber-50 rounded-lg p-4">
                          <h3 className="font-semibold text-amber-900 mb-2">Suggestions</h3>
                          <ul className="space-y-1">
                            {reviewData.suggestions.map((s, i) => (
                              <li key={i} className="text-sm text-amber-800 flex gap-2">
                                <span>→</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-6 max-h-[600px] overflow-y-auto prose prose-sm max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-6 mb-4 text-slate-900" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-5 mb-3 text-slate-900" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-4 mb-2 text-slate-800" {...props} />,
                          p: ({node, ...props}) => <p className="text-slate-700 mb-3 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 text-slate-700 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 text-slate-700 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="text-slate-700" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-3 bg-blue-50 text-slate-700 italic" {...props} />,
                          code: ({node, inline, ...props}: any) => 
                            inline ? (
                              <code className="bg-slate-200 px-2 py-1 rounded text-sm font-mono text-slate-900" {...props} />
                            ) : (
                              <code className="block bg-slate-800 text-slate-100 p-4 rounded-lg overflow-x-auto font-mono text-sm mb-3" {...props} />
                            ),
                          pre: ({node, ...props}) => <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg overflow-x-auto mb-3" {...props} />,
                          a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 underline" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                          em: ({node, ...props}) => <em className="italic text-slate-800" {...props} />,
                          table: ({node, ...props}) => <table className="w-full border-collapse border border-slate-300 mb-3" {...props} />,
                          th: ({node, ...props}) => <th className="border border-slate-300 bg-slate-200 p-2 text-left font-semibold" {...props} />,
                          td: ({node, ...props}) => <td className="border border-slate-300 p-2" {...props} />,
                        }}
                      >
                        {review}
                      </ReactMarkdown>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveToEditor}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3"
                    >
                      💾 Save to AI Editor
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <p className="text-slate-500 text-lg">
                    {isGenerating
                      ? "Analyzing your manuscript..."
                      : "Your review will appear here"}
                  </p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {InsufficientCreditsDialog()}
      {LowCreditsDialog()}
    </div>
  );
}
