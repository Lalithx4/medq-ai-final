"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCreditsCheck } from "@/hooks/useCreditsCheck";

interface AutocompleteProps {
  content: string;
  cursorPosition: number;
  onAccept: (suggestion: string) => void;
  enabled?: boolean;
}

export function AutocompleteEngine({ 
  content, 
  cursorPosition, 
  onAccept,
  enabled = true 
}: AutocompleteProps) {
  const { checkCredits, InsufficientCreditsDialog } = useCreditsCheck();
  
  const [suggestion, setSuggestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  // Debounced autocomplete trigger
  useEffect(() => {
    if (!enabled) return;
    
    const timer = setTimeout(() => {
      fetchSuggestion();
    }, 1500); // Wait 1.5s after user stops typing

    return () => clearTimeout(timer);
  }, [content, cursorPosition, enabled]);

  const fetchSuggestion = async () => {
    // Only trigger if user is at end of a sentence or paragraph
    const lastChars = content.slice(Math.max(0, cursorPosition - 50), cursorPosition);
    const shouldTrigger = lastChars.trim().length > 20 && 
                          (lastChars.endsWith('.') || lastChars.endsWith(',') || lastChars.endsWith(' '));
    
    if (!shouldTrigger) return;

    // Check credits before fetching suggestion
    const hasCredits = await checkCredits("ai_autocomplete", "AI Autocomplete");
    if (!hasCredits) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/editor/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: content.slice(Math.max(0, cursorPosition - 500), cursorPosition),
          cursorPosition,
        }),
      });

      const data = await response.json();
      if (data.suggestion) {
        setSuggestion(data.suggestion);
        setShowSuggestion(true);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    onAccept(suggestion);
    setSuggestion("");
    setShowSuggestion(false);
  };

  const handleReject = () => {
    setSuggestion("");
    setShowSuggestion(false);
  };

  // Listen for Tab key to accept suggestion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && showSuggestion) {
        e.preventDefault();
        handleAccept();
      } else if (e.key === 'Escape' && showSuggestion) {
        handleReject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestion, suggestion]);

  return (
    <>
      <InsufficientCreditsDialog />
      {!showSuggestion || !suggestion ? null : (
      <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed bottom-20 right-6 max-w-md bg-card border border-primary/20 rounded-lg shadow-lg p-4 z-50"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-2">AI Suggestion</p>
            <p className="text-sm text-foreground mb-3">{suggestion}</p>
            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
              >
                Accept (Tab)
              </button>
              <button
                onClick={handleReject}
                className="px-3 py-1.5 text-xs border border-border rounded hover:bg-accent transition"
              >
                Dismiss (Esc)
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
      )}
    </>
  );
}
