"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface AnalysisTable {
  title: string;
  description?: string;
  columns: string[];
  rows: (string | number | null)[][];
}

interface AnalysisResult {
  summaryMarkdown: string;
  tables: AnalysisTable[];
}

interface AnalysisPanelProps {
  sessionId: string;
}

export function AnalysisPanel({ sessionId }: AnalysisPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  // Chat refinement state
  const [chatInput, setChatInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const chartableTables = useMemo(() => {
    if (!result?.tables?.length) return [] as { table: AnalysisTable; data: any[]; labelKey: string; valueKey: string; config: ChartConfig }[];

    return result.tables.map((table) => {
      const columns = (table.columns || []) as string[];
      if (!columns.length || !table.rows?.length) {
        return { table, data: [] as any[], labelKey: "label", valueKey: "value", config: {} as ChartConfig };
      }

      const labelKey = columns[0] || "label";

      // Find first numeric column (excluding the label column)
      let valueKey = "value";
      for (let colIdx = 1; colIdx < columns.length; colIdx++) {
        const col = columns[colIdx];
        const hasNumeric = table.rows.some((row) => {
          const cell = row[colIdx];
          return typeof cell === "number" || (typeof cell === "string" && !Number.isNaN(Number(cell)));
        });
        if (hasNumeric && col) {
          valueKey = col;
          break;
        }
      }

      const data = table.rows.map((row) => {
        const labelRaw = row[0];
        const valueRaw = valueKey === "value" ? row[1] : row[columns.indexOf(valueKey)];
        const numericValue =
          typeof valueRaw === "number"
            ? valueRaw
            : typeof valueRaw === "string" && !Number.isNaN(Number(valueRaw))
              ? Number(valueRaw)
              : null;

        return {
          [labelKey]: labelRaw == null ? "" : String(labelRaw),
          [valueKey]: numericValue,
        };
      });

      const filteredData = data.filter((d) => typeof d[valueKey] === "number");

      const config: ChartConfig = {
        [valueKey]: {
          label: table.title || valueKey,
          color: "hsl(var(--chart-1))",
        },
      };

      return { table, data: filteredData, labelKey, valueKey, config };
    });
  }, [result]);

  const handleRunAnalysis = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/pdf-chat/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || "Failed to run analysis.");
        return;
      }

      setResult({
        summaryMarkdown: data.summaryMarkdown || "",
        tables: data.tables || [],
      });
    } catch (err) {
      console.error("[AnalysisPanel] Error running analysis", err);
      setError("Failed to run analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!result) return;

    try {
      const response = await fetch("/api/pdf-chat/analysis/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "pdf",
          sessionId,
          summaryMarkdown: result.summaryMarkdown,
          tables: result.tables,
        }),
      });

      if (!response.ok) {
        console.error("[AnalysisPanel] PDF export failed", await response.text());
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "analysis-report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[AnalysisPanel] Error exporting PDF", err);
    }
  };

  const handleExportCsv = async (tableIndex: number, suggestedName: string) => {
    if (!result) return;

    try {
      const response = await fetch("/api/pdf-chat/analysis/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "csv",
          sessionId,
          summaryMarkdown: result.summaryMarkdown,
          tables: result.tables,
          tableIndex,
        }),
      });

      if (!response.ok) {
        console.error("[AnalysisPanel] CSV export failed", await response.text());
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${suggestedName || `table-${tableIndex + 1}`}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[AnalysisPanel] Error exporting CSV", err);
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
          currentContent: result.summaryMarkdown,
          userInstruction: userMessage,
          contentType: 'analysis',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: `Error: ${data?.error || 'Failed to refine analysis.'}` }]);
        return;
      }

      // Update the analysis result with refined content
      setResult(prev => prev ? { ...prev, summaryMarkdown: data.content } : null);
      setChatHistory(prev => [...prev, { role: 'assistant', content: '✅ Analysis updated based on your feedback.' }]);
    } catch (err) {
      console.error("[AnalysisPanel] Error refining analysis", err);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error: Failed to refine analysis. Please try again.' }]);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Data Analysis</h2>
          <p className="text-xs text-gray-500">
            Extract structured tables and a clinical summary from the uploaded PDFs.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={loading}
          className="inline-flex items-center px-3 py-1.5 rounded-md text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Analyzing…
            </>
          ) : (
            "Run Analysis"
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
            Click <span className="font-medium">Run Analysis</span> to generate tables and a summary from this document or collection.
          </div>
        )}

        {result?.summaryMarkdown && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Summary</h3>
              <button
                type="button"
                onClick={handleExportPdf}
                className="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Download PDF report
              </button>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result.summaryMarkdown}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {result?.tables?.length ? (
          <div className="space-y-4">
            {result.tables.map((table, idx) => {
              const chartMeta = chartableTables[idx];
              const hasChart = chartMeta && chartMeta.data.length > 0;

              return (
                <div key={idx} className="border rounded-md overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{table.title}</p>
                      {table.description && (
                        <p className="text-[11px] text-gray-500">{table.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleExportCsv(
                          idx,
                          (table.title || `table-${idx + 1}`).replace(/[^a-z0-9-_]+/gi, "_").toLowerCase(),
                        )
                      }
                      className="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      Download CSV
                    </button>
                  </div>

                  {hasChart && (
                    <div className="px-3 py-3 border-b bg-white">
                      <ChartContainer
                        className="h-52 w-full"
                        config={chartMeta.config}
                      >
                        <BarChart data={chartMeta.data}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis
                            dataKey={chartMeta.labelKey}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                          <Bar
                            dataKey={chartMeta.valueKey}
                            fill={`var(--color-${chartMeta.valueKey})`}
                            radius={4}
                          />
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                          />
                        </BarChart>
                      </ChartContainer>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          {table.columns.map((col, cIdx) => (
                            <th
                              key={cIdx}
                              className="px-2 py-1 text-left font-semibold text-gray-700 border-b"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={rIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className="px-2 py-1 border-b text-gray-800 whitespace-nowrap"
                              >
                                {cell === null || cell === undefined ? "" : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

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
            placeholder={result ? "Ask to refine the analysis... (e.g., 'Add more detail about outcomes')" : "Generate analysis first, then refine it here..."}
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
            {result ? "Chat with AI to refine and improve the analysis" : "Generate analysis to enable chat refinement"}
          </p>
          {result && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportPdf}
                className="px-3 py-1 rounded-md text-xs text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                Export as PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
