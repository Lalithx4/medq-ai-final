"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, FileText, BookOpen, Download, Printer } from "lucide-react";
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
  savedFileId?: string | null;
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

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.replace(/\s+/g, "_").slice(0, 50)}_Report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${topic}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; color: #111; }
            h1 { font-size: 24px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            h2 { font-size: 20px; margin-top: 30px; border-bottom: 1px solid #eee; }
            h3 { font-size: 18px; margin-top: 20px; }
            p { margin-bottom: 16px; text-align: justify; }
            ul, ol { margin-bottom: 16px; padding-left: 24px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            code { background: #f5f5f5; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
            .meta { margin-bottom: 30px; color: #666; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>${topic}</h1>
          <div class="meta">
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Word Count:</strong> ${wordCount.toLocaleString()}</p>
            <p><strong>References:</strong> ${pmidCount}</p>
          </div>
          <div id="content"></div>
          <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
          <script>
            document.getElementById('content').innerHTML = marked.parse(${JSON.stringify(markdown)});
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleOpenInEditor = async () => {
    // ... (keep existing handleOpenInEditor logic)
    try {
      if (savedFileId) {
        console.log("📂 Opening existing file in editor (ID:", savedFileId, ")");
        window.location.href = `/editor?fileId=${savedFileId}`;
        return;
      }

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
      className="bg-transparent text-gray-100 w-full"
    >


      {/* Content Area - Chat Style */}
      <div className="prose prose-invert max-w-none text-gray-300 prose-headings:text-gray-100 prose-a:text-teal-400 prose-strong:text-white prose-code:bg-white/10 prose-code:text-teal-300 prose-pre:bg-zinc-900/50">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdown}
        </ReactMarkdown>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
        {/* Stats in footer */}
        <div className="flex gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> {wordCount.toLocaleString()} words
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> {pmidCount} refs
          </span>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="text-gray-400 hover:text-white h-8 text-xs">
            {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadMarkdown} className="text-gray-400 hover:text-white h-8 text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            MD
          </Button>
          <Button variant="ghost" size="sm" onClick={handleOpenInEditor} className="text-gray-400 hover:text-white h-8 text-xs">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Editor
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
