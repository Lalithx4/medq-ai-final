"use client";

import { usePresentationState } from "@/states/presentation-state";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Globe, Microscope, BookOpen } from "lucide-react";

export function ResearchSourceSelector() {
  const { researchSources, setResearchSources, isGeneratingOutline } =
    usePresentationState();

  return (
    <div className="inline-flex flex-col gap-2 rounded-lg bg-background/95 backdrop-blur-sm p-3.5 shadow-sm border border-border transition-all hover:shadow-md">
      <Label className="text-xs font-semibold text-foreground mb-1">
        Research Sources
      </Label>
      
      <div className="flex flex-col gap-2">
        {/* Web Search */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="source-web"
            checked={researchSources.web}
            onCheckedChange={(checked) =>
              setResearchSources({ web: checked as boolean })
            }
            disabled={isGeneratingOutline}
          />
          <Label
            htmlFor="source-web"
            className="flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5 text-blue-500" />
            <span>Web Search</span>
          </Label>
        </div>

        {/* PubMed */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="source-pubmed"
            checked={researchSources.pubmed}
            onCheckedChange={(checked) =>
              setResearchSources({ pubmed: checked as boolean })
            }
            disabled={isGeneratingOutline}
          />
          <Label
            htmlFor="source-pubmed"
            className="flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <Microscope className="h-3.5 w-3.5 text-green-500" />
            <span>PubMed (Medical)</span>
          </Label>
        </div>

        {/* arXiv */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="source-arxiv"
            checked={researchSources.arxiv}
            onCheckedChange={(checked) =>
              setResearchSources({ arxiv: checked as boolean })
            }
            disabled={isGeneratingOutline}
          />
          <Label
            htmlFor="source-arxiv"
            className="flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5 text-purple-500" />
            <span>arXiv (Academic)</span>
          </Label>
        </div>
      </div>

      {!researchSources.web && !researchSources.pubmed && !researchSources.arxiv && (
        <p className="text-[10px] text-amber-600 mt-1">
          ⚠️ Select at least one source
        </p>
      )}
    </div>
  );
}
