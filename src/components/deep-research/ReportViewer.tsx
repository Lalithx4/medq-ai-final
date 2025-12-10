"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Source {
  title: string;
  url: string;
  snippet: string;
  pmid?: string;
}

interface ReportViewerProps {
  markdown: string;
  topic: string;
  wordCount: number;
  pmidCount: number;
  reportId?: string;
  sources?: Source[];
  savedFileId?: string | null; // Add file ID prop
}

export function ReportViewer({
  markdown,
  topic,
  wordCount,
  pmidCount,
  reportId,
  sources = [],
  savedFileId
}: ReportViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  const handleOpenInEditor = async () => {
    try {
      // If we already have a saved file ID, just open it
      if (savedFileId) {
        console.log("📂 Opening existing file in editor (ID:", savedFileId, ")");
        window.location.href = `/editor?fileId=${savedFileId}`;
        return;
      }
      
      // Otherwise, save to files first (fallback for old reports)
      console.log("💾 Saving new file before opening in editor...");
      const response = await fetch("/api/files/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: markdown,
          title: topic,
          type: "deep-research"
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
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg"
    >
      {/* Header */}
      <div className="bg-muted/30 p-8 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                Research Report
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString()}
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{topic}</h2>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={handleOpenInEditor} className="gap-2">
              <FileText className="w-4 h-4" />
              Open in Editor
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 p-4 bg-background rounded-xl border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Word Count</p>
              <p className="text-lg font-bold text-foreground">{wordCount.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="w-px h-10 bg-border hidden md:block" />
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">References</p>
              <p className="text-lg font-bold text-foreground">{pmidCount}</p>
            </div>
          </div>

          <div className="w-px h-10 bg-border hidden md:block" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Status</p>
              <p className="text-lg font-bold text-foreground">Complete</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Word-like Document View */}
      <div className="bg-white dark:bg-gray-900 p-8 md:p-12 max-h-[700px] overflow-y-auto">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 md:p-12">
          <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-base prose-p:leading-relaxed prose-a:text-blue-600 prose-strong:font-semibold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-background p-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-500" />
            <p className="text-sm text-muted-foreground">
              Saved to Files
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleOpenInEditor}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Editor
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
