"use client";

import { createPresentation } from "@/app/_actions/presentation/presentationActions";
import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import { Wand2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { PresentationControls } from "./PresentationControls";
import dynamic from "next/dynamic";
import { PresentationHeader } from "./PresentationHeader";
import { PresentationInput } from "./PresentationInput";
import { PresentationsSidebar } from "./PresentationsSidebar";
import { TemplatePicker } from "./TemplatePicker";
import { useCreditsCheck } from "@/hooks/useCreditsCheck";

// Lazy-load below-the-fold components
const PresentationExamples = dynamic(() => import("./PresentationExamples").then(m => m.PresentationExamples), {
  ssr: false,
  loading: () => null,
});
const RecentPresentations = dynamic(() => import("./RecentPresentations").then(m => m.RecentPresentations), {
  ssr: false,
  loading: () => null,
});

export function PresentationDashboard({
  sidebarSide,
}: {
  sidebarSide?: "left" | "right";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    presentationInput,
    isGeneratingOutline,
    setCurrentPresentation,
    setIsGeneratingOutline,
    language,
    theme,
    setShouldStartOutlineGeneration,
    setTheme,
  } = usePresentationState();
  
  const { checkCredits, InsufficientCreditsDialog, LowCreditsDialog } = useCreditsCheck();

  // Apply template theme if provided via query param (MVP)
  useEffect(() => {
    const templateId = searchParams.get("templateId");
    if (!templateId) return;
    
    let isMounted = true;
    
    // Lazy import to avoid bundling for other routes
    import("@/templates/registry")
      .then(({ getTemplateById }) => {
        if (!isMounted) return;
        const tmpl = getTemplateById(templateId);
        if (tmpl) {
          setTheme(tmpl.themeKey);
        }
      })
      .catch((error) => {
        console.error("Failed to load template:", error);
      });
    
    return () => {
      isMounted = false;
    };
  }, [searchParams, setTheme]);

  useEffect(() => {
    // Reset presentation state when landing on dashboard
    setCurrentPresentation("", "");
    setIsGeneratingOutline(false);
    setShouldStartOutlineGeneration(false);
  }, [setCurrentPresentation, setIsGeneratingOutline, setShouldStartOutlineGeneration]);

  const handleGenerate = async () => {
    if (!presentationInput.trim()) {
      toast.error("Please enter a topic for your presentation");
      return;
    }

    // Check credits before proceeding
    const hasCredits = await checkCredits("presentation_generate", "Generate Presentation");
    if (!hasCredits) {
      return;
    }

    // Set UI loading state
    setIsGeneratingOutline(true);

    let isMounted = true;

    try {
      const title = presentationInput.substring(0, 50) || "Untitled Presentation";

      // IMPORTANT: Don't create template-based slides when AI generation is enabled
      // The AI will generate the actual slides based on the outline
      // Only use template presets if explicitly requested (not during AI generation)
      
      // Create a minimal placeholder presentation with just a title slide
      // The AI-generated slides will replace this content
      const slides: any[] = [
        {
          id: nanoid(),
          content: [
            { type: "h1", children: [{ text: title }] },
            { type: "p", children: [{ text: "Generating presentation..." }] },
          ],
          alignment: "center" as const,
        },
      ];

      const result = await createPresentation({
        content: { slides },
        title,
        theme,
        language,
      });

      // Check if component is still mounted before updating state
      if (!isMounted) return;

      if (result.success && result.presentation) {
        // Set the current presentation
        setCurrentPresentation(
          result.presentation.id,
          result.presentation.title,
        );
        router.push(`/presentation/generate/${result.presentation.id}`);
      } else {
        setIsGeneratingOutline(false);
        toast.error(result.message || "Failed to create presentation");
      }
    } catch (error) {
      // Check if component is still mounted before updating state
      if (!isMounted) return;
      
      setIsGeneratingOutline(false);
      console.error("Error creating presentation:", error);
      toast.error("Failed to create presentation");
    }

    // Cleanup function would go in useEffect, but for async handlers we track manually
    return () => {
      isMounted = false;
    };
  };

  return (
    <>
      <InsufficientCreditsDialog />
      <LowCreditsDialog />
      <div className="relative flex h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-white overflow-y-auto">
        <PresentationsSidebar side={sidebarSide} />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 md:py-8 pb-20 md:pb-8">
          <PresentationHeader />

          <div className="space-y-4 sm:space-y-6 mt-6 sm:mt-8">
            <PresentationInput handleGenerate={handleGenerate} />
            {/* Temporarily hidden on the frontend */}
            <div className="hidden">
              <TemplatePicker />
            </div>
            <PresentationControls />

          <div className="flex items-center justify-end">
            <Button
              onClick={handleGenerate}
              disabled={!presentationInput.trim() || isGeneratingOutline}
              variant={isGeneratingOutline ? "loading" : "default"}
              className="w-full sm:w-auto gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-none shadow-md hover:shadow-lg transition-all h-11 sm:h-10 text-sm sm:text-base"
            >
              <Wand2 className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Generate Presentation</span>
              <span className="sm:hidden">Generate</span>
            </Button>
          </div>
        </div>

        <div className="mt-6 sm:mt-8">
          <PresentationExamples />
        </div>
        <div className="mt-4 sm:mt-6">
          <RecentPresentations />
        </div>
      </div>
    </div>
    </>
  );
}
