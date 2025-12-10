"use client";

import { useState } from "react";
import { RefreshCw, Copy, Check, X, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useCreditsCheck } from "@/hooks/useCreditsCheck";

interface ParaphraserToolProps {
  selectedText: string;
  onReplace: (newText: string) => void;
  onClose: () => void;
}

type ToneType = "Academic" | "Formal" | "Fluent" | "Creative" | "Balanced";

export function ParaphraserTool({ selectedText, onReplace, onClose }: ParaphraserToolProps) {
  const { checkCredits, InsufficientCreditsDialog } = useCreditsCheck();
  
  const [paraphrasedText, setParaphrasedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tone, setTone] = useState<ToneType>("Academic");
  const [variation, setVariation] = useState([50]); // 0-100
  const [length, setLength] = useState([50]); // 0-100 (shorter to longer)
  const [copied, setCopied] = useState(false);

  const handleParaphrase = async () => {
    // Check credits before paraphrasing
    const hasCredits = await checkCredits("ai_paraphrase", "AI Paraphraser");
    if (!hasCredits) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/editor/paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selectedText,
          tone,
          variation: variation[0],
          length: length[0],
        }),
      });

      const data = await response.json();
      setParaphrasedText(data.paraphrased || "");
    } catch (error) {
      console.error('Paraphrase error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(paraphrasedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReplace = () => {
    onReplace(paraphrasedText);
    onClose();
  };

  return (
    <>
      <InsufficientCreditsDialog />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Paraphraser</h2>
                <p className="text-sm text-muted-foreground">Rewrite text in different tones and styles</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          {/* Original Text */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">Original Text</label>
            <div className="p-4 bg-muted/50 border border-border rounded-lg text-sm">
              {selectedText}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedText.split(/\s+/).length} words
            </p>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Tone Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Academic", "Formal", "Fluent", "Creative", "Balanced"] as ToneType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-3 py-2 text-xs rounded-lg transition ${
                      tone === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Variation Slider */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Variation: {variation[0]}%
              </label>
              <Slider
                value={variation}
                onValueChange={setVariation}
                max={100}
                step={10}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Conservative</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Length Slider */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Length: {(length[0] ?? 50) < 40 ? "Shorter" : (length[0] ?? 50) > 60 ? "Longer" : "Same"}
              </label>
              <Slider
                value={length}
                onValueChange={setLength}
                max={100}
                step={10}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Shorter</span>
                <span>Longer</span>
              </div>
            </div>
          </div>

          {/* Paraphrase Button */}
          <Button
            onClick={handleParaphrase}
            disabled={isProcessing}
            className="w-full mb-6"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Paraphrasing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Paraphrase Text
              </>
            )}
          </Button>

          {/* Paraphrased Result */}
          {paraphrasedText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <label className="text-sm font-medium block">Paraphrased Text</label>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                {paraphrasedText}
              </div>
              <p className="text-xs text-muted-foreground">
                {paraphrasedText.split(/\s+/).length} words
              </p>
              <div className="flex gap-2">
                <Button onClick={handleReplace} className="flex-1">
                  Replace Original
                </Button>
                <Button onClick={handleCopy} variant="outline">
                  {copied ? (
                    <><Check className="w-4 h-4 mr-2" /> Copied</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copy</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
    </>
  );
}
