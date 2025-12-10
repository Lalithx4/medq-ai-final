"use client";

import { useState } from "react";
import { Check, X, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface DiffChange {
  type: 'addition' | 'deletion' | 'unchanged';
  content: string;
  lineNumber?: number;
}

interface DiffViewerProps {
  originalText: string;
  suggestedText: string;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export function DiffViewer({
  originalText,
  suggestedText,
  onAccept,
  onReject,
  onClose
}: DiffViewerProps) {
  const [showUnified, setShowUnified] = useState(true);

  // Simple diff algorithm - split by lines and compare
  const generateDiff = (): DiffChange[] => {
    const originalLines = originalText.split('\n');
    const suggestedLines = suggestedText.split('\n');
    const changes: DiffChange[] = [];

    const maxLength = Math.max(originalLines.length, suggestedLines.length);

    for (let i = 0; i < maxLength; i++) {
      const originalLine = originalLines[i];
      const suggestedLine = suggestedLines[i];

      if (originalLine === suggestedLine) {
        changes.push({
          type: 'unchanged',
          content: originalLine || '',
          lineNumber: i + 1
        });
      } else {
        if (originalLine !== undefined) {
          changes.push({
            type: 'deletion',
            content: originalLine,
            lineNumber: i + 1
          });
        }
        if (suggestedLine !== undefined) {
          changes.push({
            type: 'addition',
            content: suggestedLine,
            lineNumber: i + 1
          });
        }
      }
    }

    return changes;
  };

  const diff = generateDiff();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">AI Suggested Changes</h2>
              <p className="text-sm text-muted-foreground">
                Review the changes and accept or reject them
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUnified(!showUnified)}
                className="text-xs"
              >
                {showUnified ? 'Split View' : 'Unified View'}
              </Button>
            </div>
          </div>

          {/* Diff Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {showUnified ? (
              // Unified View
              <div className="font-mono text-sm bg-background rounded-lg border border-border overflow-hidden">
                {diff.map((change, index) => (
                  <div
                    key={index}
                    className={`px-4 py-1 flex items-start gap-3 ${
                      change.type === 'addition'
                        ? 'bg-green-500/10 border-l-2 border-green-500'
                        : change.type === 'deletion'
                        ? 'bg-red-500/10 border-l-2 border-red-500'
                        : 'bg-background'
                    }`}
                  >
                    <span className="text-muted-foreground w-12 flex-shrink-0 text-right select-none">
                      {change.lineNumber}
                    </span>
                    <span
                      className={`flex-1 ${
                        change.type === 'addition'
                          ? 'text-green-600 dark:text-green-400'
                          : change.type === 'deletion'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-foreground'
                      }`}
                    >
                      {change.type === 'addition' && '+ '}
                      {change.type === 'deletion' && '- '}
                      {change.content || ' '}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              // Split View
              <div className="grid grid-cols-2 gap-4">
                {/* Original */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-red-500/10 px-4 py-2 border-b border-border">
                    <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Original
                    </h3>
                  </div>
                  <div className="font-mono text-sm bg-background">
                    {originalText.split('\n').map((line, index) => (
                      <div
                        key={index}
                        className="px-4 py-1 flex items-start gap-3 hover:bg-accent/50"
                      >
                        <span className="text-muted-foreground w-12 flex-shrink-0 text-right select-none">
                          {index + 1}
                        </span>
                        <span className="flex-1">{line || ' '}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-green-500/10 px-4 py-2 border-b border-border">
                    <h3 className="text-sm font-semibold text-green-600 dark:text-green-400">
                      Suggested
                    </h3>
                  </div>
                  <div className="font-mono text-sm bg-background">
                    {suggestedText.split('\n').map((line, index) => (
                      <div
                        key={index}
                        className="px-4 py-1 flex items-start gap-3 hover:bg-accent/50"
                      >
                        <span className="text-muted-foreground w-12 flex-shrink-0 text-right select-none">
                          {index + 1}
                        </span>
                        <span className="flex-1">{line || ' '}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500/20 border border-green-500 rounded"></span>
                Additions
              </span>
              <span className="inline-flex items-center gap-1 ml-4">
                <span className="w-3 h-3 bg-red-500/20 border border-red-500 rounded"></span>
                Deletions
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onReject}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Reject
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="gap-2"
              >
                <Undo2 className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onAccept}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4" />
                Accept Changes
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
