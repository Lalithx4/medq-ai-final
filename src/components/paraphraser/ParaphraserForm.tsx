"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCreditsCheck } from "@/hooks/useCreditsCheck";
import { useRouter } from "next/navigation";

interface ParaphraseStyle {
  id: string;
  name: string;
  description: string;
  tone: string;
}

const PARAPHRASE_STYLES: ParaphraseStyle[] = [
  { id: "formal", name: "Formal", description: "Professional and academic tone", tone: "Formal" },
  { id: "academic", name: "Academic", description: "Scholarly and precise language", tone: "Academic" },
  { id: "fluent", name: "Fluent", description: "Natural and easy to read", tone: "Fluent" },
  { id: "creative", name: "Creative", description: "Unique and engaging rewrite", tone: "Creative" },
];

export function ParaphraserForm() {
  const { checkCredits, InsufficientCreditsDialog, LowCreditsDialog } = useCreditsCheck();
  const router = useRouter();
  
  const [inputText, setInputText] = useState("");
  const [style, setStyle] = useState("formal");
  const [isGenerating, setIsGenerating] = useState(false);
  const [paraphrasedText, setParaphrasedText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      alert("Please enter or upload text to paraphrase");
      return;
    }

    const hasCredits = await checkCredits("ai_paraphrase", "AI Paraphraser");
    if (!hasCredits) return;

    setIsGenerating(true);
    setParaphrasedText(null);

    try {
      // Get the tone for the selected style
      const selectedStyle = PARAPHRASE_STYLES.find(s => s.id === style);
      const tone = selectedStyle?.tone || "Formal";

      const response = await fetch("/api/editor/paraphrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          tone: tone,
          variation: 50, // Medium variation
          length: 50, // Similar length
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to paraphrase text");
      }

      const data = await response.json();
      setParaphrasedText(data.paraphrased);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to paraphrase text. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (paraphrasedText) {
      navigator.clipboard.writeText(paraphrasedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveToEditor = () => {
    if (paraphrasedText) {
      localStorage.setItem("editorContent", paraphrasedText);
      localStorage.setItem("editorTitle", "Paraphrased Text");
      router.push("/editor");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-2">AI Paraphraser</h1>
          <p className="text-lg text-slate-600">
            Rewrite your text in different styles and tones
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-4"
          >
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Input Text</h2>

              {/* Text Input */}
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your text here or upload a file..."
                className="w-full h-48 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />

              {/* File Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Text File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />

              <p className="text-sm text-slate-500 mt-2">
                {inputText.length} characters
              </p>
            </div>

            {/* Style Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Style</h2>
              <div className="space-y-2">
                {PARAPHRASE_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      style === s.id
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                    }`}
                  >
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm opacity-75">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !inputText.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Paraphrasing...
                </>
              ) : (
                "Paraphrase Text"
              )}
            </Button>
          </motion.div>

          {/* Output Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <AnimatePresence>
              {paraphrasedText ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-lg shadow-md p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">
                      Paraphrased Text
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCopy}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {paraphrasedText}
                    </ReactMarkdown>
                  </div>

                  <Button
                    onClick={handleSaveToEditor}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                  >
                    Open in Editor & Save
                  </Button>
                </motion.div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <p className="text-slate-500 text-lg">
                    {isGenerating
                      ? "Paraphrasing your text..."
                      : "Your paraphrased text will appear here"}
                  </p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {InsufficientCreditsDialog()}
      {LowCreditsDialog()}
    </div>
  );
}
