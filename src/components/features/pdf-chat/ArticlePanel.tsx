"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ArticleResult {
  content: string;
}

interface ArticlePanelProps {
  sessionId: string;
}

export function ArticlePanel({ sessionId }: ArticlePanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ArticleResult | null>(null);
  
  // Chat refinement state
  const [chatInput, setChatInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleGenerateArticle = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/pdf-chat/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || "Failed to generate article.");
        return;
      }

      setResult({ content: data.content || "" });
    } catch (err) {
      console.error("[ArticlePanel] Error generating article", err);
      setError("Failed to generate article. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "pdf" | "docx") => {
    if (!result?.content) return;

    try {
      const response = await fetch("/api/pdf-chat/article/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          sessionId,
          content: result.content,
        }),
      });

      if (!response.ok) {
        console.error("[ArticlePanel] Export failed", await response.text());
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = format === "pdf" ? "article.pdf" : "article.docx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[ArticlePanel] Error exporting article", err);
    }
  };

  const handleRefine = async () => {
    if (!chatInput.trim() || isRefining || !result) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setIsRefining(true);

    // Add user message to chat history
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch("/api/pdf-chat/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          currentContent: result.content,
          userInstruction: userMessage,
          contentType: 'article',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: `Error: ${data?.error || 'Failed to refine article.'}` }]);
        return;
      }

      // Update the article result with refined content
      setResult({ content: data.content });
      setChatHistory(prev => [...prev, { role: 'assistant', content: '✅ Article updated based on your feedback.' }]);
    } catch (err) {
      console.error("[ArticlePanel] Error refining article", err);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error: Failed to refine article. Please try again.' }]);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Research Article</h2>
          <p className="text-xs text-gray-500">
            Generate a structured research article grounded in the uploaded PDFs.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerateArticle}
          disabled={loading}
          className="inline-flex items-center px-3 py-1.5 rounded-md text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Generating…
            </>
          ) : (
            "Generate Article"
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">
            {error}
          </div>
        )}

        {!result && !error && !loading && (
          <div className="text-sm text-gray-500">
            Click <span className="font-medium">Generate Article</span> to create an IMRaD-style article draft from this document or collection.
          </div>
        )}

        {result?.content && (
          <div className="space-y-3">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Chat Refinement Interface - always visible */}
      <div className="border-t bg-gray-50 p-4">
        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="mb-3 max-h-32 overflow-y-auto space-y-2">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`text-xs p-2 rounded ${
                  msg.role === 'user'
                    ? 'bg-blue-100 text-blue-800 ml-8'
                    : 'bg-gray-200 text-gray-800 mr-8'
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        )}
        
        {/* Chat Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRefine();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={result ? "Ask to refine the article... (e.g., 'Expand the discussion section')" : "Generate article first, then refine it here..."}
            className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isRefining || !result}
          />
          <button
            type="submit"
            disabled={isRefining || !chatInput.trim() || !result}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isRefining ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            {result ? "Chat with AI to refine and improve the article" : "Generate article to enable chat refinement"}
          </p>
          {result && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                className="px-3 py-1 rounded-md text-xs text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                Export as PDF
              </button>
              <button
                type="button"
                onClick={() => handleExport("docx")}
                className="px-3 py-1 rounded-md text-xs text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                Export as DOCX
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
