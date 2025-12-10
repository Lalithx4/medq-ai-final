"use client";

import { getPresentation } from "@/app/_actions/presentation/presentationActions";
import { getCustomThemeById } from "@/app/_actions/presentation/theme-actions";
import { ThinkingDisplay } from "@/components/presentation/dashboard/ThinkingDisplay";
import { Header } from "@/components/presentation/outline/Header";
import { OutlineList } from "@/components/presentation/outline/OutlineList";
import { PromptInput } from "@/components/presentation/outline/PromptInput";
import { ToolCallDisplay } from "@/components/presentation/outline/ToolCallDisplay";
import { ThemeBackground } from "@/components/presentation/theme/ThemeBackground";
import { ThemeSettings } from "@/components/presentation/theme/ThemeSettings";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  themes,
  type ThemeProperties,
  type Themes,
} from "@/lib/presentation/themes";
import { usePresentationState } from "@/states/presentation-state";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wand2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export const PRESENTATION_GENERATION_COOKIE = "presentation_generation_pending";

export default function PresentationGenerateWithIdPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const {
    setCurrentPresentation,
    setPresentationInput,
    startPresentationGeneration,
    isGeneratingPresentation,
    isGeneratingOutline,
    outlineThinking,
    setOutline,
    setSearchResults,
    setShouldStartOutlineGeneration,
    setTheme,
    setImageSource,
    setPresentationStyle,
    setLanguage,
    setWebSearchEnabled,
  } = usePresentationState();

  // Track if this is a fresh navigation or a revisit
  const initialLoadComplete = useRef(false);
  const generationStarted = useRef(false);

  // Use React Query to fetch presentation data
  const { data: presentationData, isLoading: isLoadingPresentation } = useQuery(
    {
      queryKey: ["presentation", id],
      queryFn: async () => {
        const result = await getPresentation(id);
        if (!result.success) {
          throw new Error(result.message ?? "Failed to load presentation");
        }
        return result.presentation;
      },
      enabled: !!id,
    },
  );

  // Function to clear the cookie
  const clearPresentationCookie = () => {
    if (typeof document === "undefined") return;

    const domain =
      window.location.hostname === "localhost" ? "localhost" : ".allweone.com";

    document.cookie = `${PRESENTATION_GENERATION_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; ${domain !== "localhost" ? `domain=${domain}; ` : ""}`;
  };

  // Clear the cookie when the page loads
  useEffect(() => {
    clearPresentationCookie();
  }, []);

  // This effect handles the immediate startup of generation upon first mount
  // only if we're coming fresh from the dashboard (isGeneratingOutline === true)
  useEffect(() => {
    // Only run once on initial page load
    if (initialLoadComplete.current) return;
    initialLoadComplete.current = true;

    // If isGeneratingOutline is true but generation hasn't been started yet,
    // this indicates we just came from the dashboard and should start generation
    if (isGeneratingOutline && !generationStarted.current) {
      console.log("Starting outline generation after navigation");
      generationStarted.current = true;

      // Give the component time to fully mount and establish connections
      // before starting the generation process
      setTimeout(() => {
        setShouldStartOutlineGeneration(true);
      }, 100);
    }
  }, [isGeneratingOutline, setShouldStartOutlineGeneration]);

  // Track if we've already loaded the initial data to prevent re-loading theme
  const initialDataLoaded = useRef(false);

  // Update presentation state when data is fetched (only once on initial load)
  useEffect(() => {
    // Only load data once when presentation is first fetched
    if (presentationData && !isLoadingPresentation && !initialDataLoaded.current) {
      initialDataLoaded.current = true;
      
      setCurrentPresentation(presentationData.id, presentationData.title);
      setPresentationInput(
        presentationData.Presentation?.prompt ?? presentationData.title,
      );

      if (presentationData.Presentation?.outline) {
        setOutline(presentationData.Presentation.outline);
      }

      // Load search results if available
      if (presentationData.Presentation?.searchResults) {
        try {
          const searchResults = Array.isArray(
            presentationData.Presentation.searchResults,
          )
            ? presentationData.Presentation.searchResults
            : JSON.parse(presentationData.Presentation.searchResults as string);
          setWebSearchEnabled(true);
          setSearchResults(searchResults);
        } catch (error) {
          console.error("Failed to parse search results:", error);
          setSearchResults([]);
        }
      }

      // Set theme if available (only on initial load, don't override user's selection)
      if (presentationData?.Presentation?.theme) {
        const themeId = presentationData.Presentation.theme;

        // Check if this is a predefined theme
        if (themeId in themes) {
          // Use predefined theme
          setTheme(themeId as Themes);
        } else {
          // If not in predefined themes, treat as custom theme
          void getCustomThemeById(themeId)
            .then((result) => {
              if (result.success && result.theme) {
                // Set the theme with the custom theme data
                const themeData = result.theme
                  .themeData as unknown as ThemeProperties;
                setTheme(themeId, themeData);
              } else {
                // Fallback to default theme if custom theme not found
                console.warn("Custom theme not found:", themeId);
                setTheme("orbit");
              }
            })
            .catch((error) => {
              console.error("Failed to load custom theme:", error);
              // Fallback to default theme on error
              setTheme("orbit");
            });
        }
      }

      // Set presentationStyle if available
      if (presentationData?.Presentation?.presentationStyle) {
        setPresentationStyle(presentationData.Presentation.presentationStyle);
      }

      if (presentationData?.Presentation?.imageSource) {
        setImageSource(
          presentationData.Presentation.imageSource as "ai" | "stock",
        );
      }

      // Set language if available
      if (presentationData.Presentation?.language) {
        setLanguage(presentationData.Presentation.language);
      }
    }
  }, [
    presentationData,
    isLoadingPresentation,
    setCurrentPresentation,
    setPresentationInput,
    setOutline,
    setTheme,
    setImageSource,
    setPresentationStyle,
    setLanguage,
    setSearchResults,
    setWebSearchEnabled,
  ]);

  const handleGenerate = () => {
    router.push(`/presentation/${id}`);
    startPresentationGeneration();
  };

  if (isLoadingPresentation) {
    return (
      <ThemeBackground>
        <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center">
          <div className="relative">
            <Spinner className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold">Loading Presentation Outline</h2>
            <p className="text-muted-foreground">Please wait a moment...</p>
          </div>
        </div>
      </ThemeBackground>
    );
  }
  return (
    <ThemeBackground>
      <Button
        variant="ghost"
        className="absolute left-2 sm:left-4 top-2 sm:top-4 flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-4"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden xs:inline">Back</span>
      </Button>

      <div className="flex flex-row justify-center">
        {/* <GoogleAdsBanner isVertical={true} /> */}

        <div className="max-w-4xl space-y-4 sm:space-y-6 md:space-y-8 p-4 sm:p-6 md:p-8 pt-12 sm:pt-6 pb-20 sm:pb-24">
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            <Header />
            <PromptInput />
            <ThinkingDisplay
              thinking={outlineThinking}
              isGenerating={isGeneratingOutline}
              title="AI is thinking about your outline..."
            />
            <ToolCallDisplay />
            <OutlineList />

            <div className="!mb-20 sm:!mb-32 space-y-3 sm:space-y-4 rounded-lg border bg-muted/30 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold">Customize Theme</h2>
              <ThemeSettings />
            </div>
          </div>
        </div>

        {/* <GoogleAdsBanner isVertical={true} /> */}
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center border-t bg-background/95 p-3 sm:p-4 backdrop-blur-sm z-50">
        <Button
          size="lg"
          className="w-full sm:w-auto gap-2 px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base"
          onClick={handleGenerate}
          disabled={isGeneratingPresentation}
        >
          <Wand2 className="h-4 w-4 sm:h-5 sm:w-5" />
          {isGeneratingPresentation ? "Generating..." : "Generate Presentation"}
        </Button>
      </div>
    </ThemeBackground>
  );
}
