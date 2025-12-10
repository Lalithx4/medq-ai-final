"use client";

import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import { Sparkles } from "lucide-react";
import { ResearchSourceSelector } from "./ResearchSourceSelector";

export function PresentationInput({
  handleGenerate,
}: {
  handleGenerate: () => void;
}) {
  const { presentationInput, setPresentationInput, setShowTemplates } =
    usePresentationState();

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <h2 className="text-sm sm:text-base font-medium text-gray-900 tracking-tight">
          What would you like to present about?
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTemplates(true)}
          className="gap-1.5 sm:gap-2 shrink-0 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3"
        >
          <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden xs:inline">Templates</span>
          <span className="xs:hidden">📋</span>
        </Button>
      </div>

      <div className="space-y-3">
        <div className="relative group">
          <textarea
            value={presentationInput}
            onChange={(e) => setPresentationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Describe your topic or paste your content here. Our AI will structure it into a compelling presentation."
            className="h-32 sm:h-40 w-full resize-none rounded-lg sm:rounded-xl border border-gray-200 bg-white px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 placeholder:text-gray-400 font-light transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-sm"
          />

          <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 z-10">
            <p className="text-[10px] sm:text-xs text-gray-500 font-light hidden sm:block">
              Press{" "}
              <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-gray-100 text-gray-600 font-mono text-[9px] sm:text-[10px] border border-gray-200">
                Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-gray-100 text-gray-600 font-mono text-[9px] sm:text-[10px] border border-gray-200">
                Enter
              </kbd>{" "}
              to generate
            </p>
          </div>
        </div>

        {/* Research Source Selector - Now below the textarea */}
        <div className="flex justify-start">
          <ResearchSourceSelector />
        </div>
      </div>
    </div>
  );
}
