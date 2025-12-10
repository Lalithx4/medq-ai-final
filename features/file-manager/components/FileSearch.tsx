"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  Loader2,
  X,
  TrendingUp,
  Clock,
  FileText,
  Image as ImageIcon,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserFile } from "../types";
import { truncateFilename, formatFileSize, getFileColor } from "../lib/file-utils";

interface FileSearchProps {
  onSearch?: (query: string, files: UserFile[]) => void;
  onFileSelect?: (file: UserFile) => void;
  recentSearches?: string[];
  placeholder?: string;
}

export function FileSearch({
  onSearch,
  onFileSelect,
  recentSearches = [],
  placeholder = "Search files with AI...",
}: FileSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<UserFile[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Semantic search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch("/api/file-manager/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, limit: 10 }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.files || []);
        onSearch?.(searchQuery, data.files || []);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [onSearch]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Generate suggestions
  useEffect(() => {
    const baseSuggestions = [
      "research papers",
      "images from deep research",
      "PDF documents",
      "recent uploads",
      "medical diagrams",
      "generated reports",
    ];
    setSuggestions(baseSuggestions);
  }, []);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion);
  };

  const getFileIcon = (fileType: string) => {
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(fileType)) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="relative w-full">
      {/* Search input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="pl-10 pr-20 h-12 text-base"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClear}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs">
            <Sparkles className="w-3 h-3" />
            <span>AI</span>
          </div>
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isFocused && (query || results.length > 0 || suggestions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-xl shadow-lg overflow-hidden z-50"
          >
            {/* Results */}
            {results.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Results
                </div>
                <div className="space-y-1">
                  {results.slice(0, 5).map((file) => (
                    <motion.button
                      key={file.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => {
                        onFileSelect?.(file);
                        setIsFocused(false);
                      }}
                      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent text-left group"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${getFileColor(file.fileType)}15`,
                          color: getFileColor(file.fileType),
                        }}
                      >
                        {getFileIcon(file.fileType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">
                          {truncateFilename(file.filename, 40)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{file.fileType.toUpperCase()}</span>
                          <span>•</span>
                          <span>{formatFileSize(file.fileSize)}</span>
                          {file.isGenerated && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-primary">
                                <Sparkles className="w-3 h-3" />
                                AI
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  ))}
                </div>
                {results.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => onSearch?.(query, results)}
                  >
                    View all {results.length} results
                  </Button>
                )}
              </div>
            )}

            {/* No results */}
            {query && !isSearching && results.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No files found for "{query}"</p>
              </div>
            )}

            {/* Recent searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-2 border-b">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Recent
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {recentSearches.slice(0, 5).map((search, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(search)}
                      className="px-2 py-1 rounded-md bg-muted hover:bg-accent text-sm"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {!query && suggestions.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Try searching for
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-2 py-1 rounded-md bg-muted hover:bg-accent text-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
