"use client";

import { useState } from "react";
import { Search, BookOpen, Plus, X, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Citation {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  doi?: string;
  url?: string;
  abstract?: string;
}

interface CitationManagerProps {
  onInsert: (citation: string) => void;
  onClose: () => void;
}

export function CitationManager({ onInsert, onClose }: CitationManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Citation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<"APA" | "MLA" | "Chicago" | "Harvard">("APA");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const searchCitations = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/editor/search-citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Citation search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const formatCitation = (citation: Citation, style: string): string => {
    const authorsStr = citation.authors.slice(0, 3).join(", ");
    const moreAuthors = citation.authors.length > 3 ? ", et al." : "";
    
    switch (style) {
      case "APA":
        return `${authorsStr}${moreAuthors} (${citation.year}). ${citation.title}. ${citation.journal || ""}. ${citation.doi ? `https://doi.org/${citation.doi}` : citation.url || ""}`;
      case "MLA":
        return `${authorsStr}${moreAuthors}. "${citation.title}." ${citation.journal || ""}, ${citation.year}.`;
      case "Chicago":
        return `${authorsStr}${moreAuthors}. "${citation.title}." ${citation.journal || ""} (${citation.year}).`;
      case "Harvard":
        return `${authorsStr}${moreAuthors}, ${citation.year}. ${citation.title}. ${citation.journal || ""}.`;
      default:
        return `${authorsStr}${moreAuthors} (${citation.year}). ${citation.title}.`;
    }
  };

  const handleInsert = (citation: Citation) => {
    const formatted = formatCitation(citation, selectedStyle);
    onInsert(formatted);
  };

  const handleCopy = async (citation: Citation) => {
    const formatted = formatCitation(citation, selectedStyle);
    await navigator.clipboard.writeText(formatted);
    setCopiedId(citation.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Citation Manager</h2>
                <p className="text-sm text-muted-foreground">Search from 280M+ academic sources</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCitations()}
                placeholder="Search by title, author, DOI, or keywords..."
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button
              onClick={searchCitations}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6"
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          {/* Citation Style Selector */}
          <div className="flex gap-2 mt-4">
            <span className="text-sm text-muted-foreground">Style:</span>
            {(["APA", "MLA", "Chicago", "Harvard"] as const).map((style) => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  selectedStyle === style
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent hover:bg-accent/80"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {results.length === 0 && !isSearching && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Search for academic papers, books, or articles</p>
              <p className="text-sm mt-1">Results will appear here</p>
            </div>
          )}

          {isSearching && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">Searching academic databases...</p>
            </div>
          )}

          <div className="space-y-4">
            {results.map((citation) => (
              <motion.div
                key={citation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 border border-border rounded-lg hover:border-primary/50 transition"
              >
                <h3 className="font-semibold text-sm mb-2">{citation.title}</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  {citation.authors.join(", ")} • {citation.year}
                  {citation.journal && ` • ${citation.journal}`}
                </p>
                {citation.abstract && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {citation.abstract}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleInsert(citation)}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Insert
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(citation)}
                    className="text-xs"
                  >
                    {copiedId === citation.id ? (
                      <><Check className="w-3 h-3 mr-1" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3 mr-1" /> Copy</>
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
