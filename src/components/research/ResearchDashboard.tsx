"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Wand2 } from "lucide-react";

export function ResearchDashboard() {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleResearch = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const resp = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await resp.json();
      setResult(data.summary || "No result");
    } catch (e) {
      setResult("Failed to run research. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-gray-50 to-white overflow-y-auto">
      <div className="mx-auto max-w-5xl px-12 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-light text-gray-900 tracking-tight">Deep Research</h1>
          <p className="text-gray-600 text-sm font-light leading-relaxed max-w-3xl">
            Run comprehensive medical research with citations and structured output.
          </p>
        </div>

        <div className="space-y-4">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Describe your research question, topic, or hypothesis"
            className="h-40 w-full resize-none rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-700 placeholder:text-gray-400 font-light transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-sm"
          />

          <div className="flex items-center justify-end">
            <Button
              onClick={handleResearch}
              disabled={!topic.trim() || isLoading}
              variant={isLoading ? "loading" : "default"}
              className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-none shadow-md hover:shadow-lg transition-all"
            >
              <Wand2 className="h-4 w-4" />
              Run Research
            </Button>
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm whitespace-pre-wrap text-sm leading-relaxed">
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
