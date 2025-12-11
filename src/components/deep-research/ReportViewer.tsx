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
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg text-gray-900"
    >
      {/* Header */}
      <div className="bg-gray-50 p-8 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
                Research Report
              </span>
              <span className="text-xs text-gray-500">
                {new Date().toLocaleDateString()}
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">{topic}</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadMarkdown} className="gap-2">
              <Download className="w-4 h-4" />
              Markdown
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              PDF
            </Button>
            <Button size="sm" onClick={handleOpenInEditor} className="gap-2">
              <FileText className="w-4 h-4" />
              Editor
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 p-4 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase">Word Count</p>
              <p className="text-lg font-bold text-gray-900">{wordCount.toLocaleString()}</p>
            </div>
          </div>

          <div className="w-px h-10 bg-gray-200 hidden md:block" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase">References</p>
              <p className="text-lg font-bold text-gray-900">{pmidCount}</p>
            </div>
          </div>

          <div className="w-px h-10 bg-gray-200 hidden md:block" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase">Status</p>
              <p className="text-lg font-bold text-gray-900">Complete</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Word-like Document View */}
      <div className="bg-white p-8 md:p-12 max-h-[700px] overflow-y-auto print:max-h-none">
        <div className="max-w-4xl mx-auto bg-white shadow-none rounded-none p-0 border-0">
          <div className="prose prose-lg max-w-none text-gray-900 prose-headings:font-bold prose-headings:text-gray-900 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-base prose-p:leading-relaxed prose-a:text-blue-600 prose-strong:font-semibold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="bg-gray-50 p-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <p className="text-sm text-muted-foreground">
              Ready for export
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleDownloadMarkdown}
            className="gap-2 bg-zinc-800 text-white hover:bg-zinc-700"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
