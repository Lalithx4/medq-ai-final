"use client";
import { debug } from "@/lib/debug";
import { updatePresentation } from "@/app/_actions/presentation/presentationActions";
import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import { Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ManualSaveButton() {
  const [isSaving, setIsSaving] = useState(false);
  const slides = usePresentationState((s) => s.slides);
  const currentPresentationId = usePresentationState((s) => s.currentPresentationId);
  const currentPresentationTitle = usePresentationState((s) => s.currentPresentationTitle);
  const outline = usePresentationState((s) => s.outline);
  const imageSource = usePresentationState((s) => s.imageSource);
  const presentationStyle = usePresentationState((s) => s.presentationStyle);
  const language = usePresentationState ((s) => s.language);
  const config = usePresentationState((s) => s.config);
  const thumbnailUrl = usePresentationState((s) => s.thumbnailUrl);
  const currentSlideIndex = usePresentationState((s) => s.currentSlideIndex);

  debug.log("🔵 ManualSaveButton rendered", {
    isSaving,
    hasId: !!currentPresentationId,
    slidesCount: slides.length,
    disabled: isSaving || !currentPresentationId
  });

  const handleSave = async () => {
    debug.log("🔵 Save button clicked!");
    
    if (!currentPresentationId || slides.length === 0) {
      debug.log("❌ No presentation ID or slides");
      toast.error("Nothing to save");
      return;
    }

    debug.log("✅ Starting save process...");
    setIsSaving(true);
    try {
      // Try multiple methods to extract editor content
      const updatedSlides = [...slides];
      
      // Method 1: Try to find React Fiber and extract editor state
      const editorContainers = document.querySelectorAll('[data-slate-editor="true"]');
      debug.log("Found editor containers:", editorContainers.length);
      
      let extractedCount = 0;
      editorContainers.forEach((container, index) => {
        try {
          // Try to access React Fiber
          const fiberKey = Object.keys(container).find(key => key.startsWith('__reactFiber'));
          if (fiberKey) {
            const fiber = (container as any)[fiberKey];
            // Navigate fiber tree to find editor with children
            let currentFiber = fiber;
            let attempts = 0;
            while (currentFiber && attempts < 20) {
              if (currentFiber.memoizedProps?.editor?.children) {
                const editor = currentFiber.memoizedProps.editor;
                if (updatedSlides[index]) {
                  debug.log(`✅ Extracted content from editor ${index} via Fiber`);
                  updatedSlides[index] = {
                    ...updatedSlides[index],
                    content: editor.children,
                  };
                  extractedCount++;
                  break;
                }
              }
              currentFiber = currentFiber.return;
              attempts++;
            }
          }
        } catch (err) {
          console.error(`Error extracting editor ${index}:`, err);
        }
      });
      
      debug.log(`Extracted ${extractedCount} editors, saving ${updatedSlides.length} slides`);
      debug.log("Calling updatePresentation...");

      const result = await updatePresentation({
        id: currentPresentationId,
        content: {
          slides: updatedSlides,
          config,
        },
        title: currentPresentationTitle ?? "",
        outline,
        imageSource,
        presentationStyle,
        language,
        thumbnailUrl,
      });
      
      debug.log("updatePresentation result:", result);
      
      if (result?.success) {
        debug.log("✅ Save successful!");
        toast.success("Presentation saved!");
      } else {
        debug.log("❌ Save failed:", result?.message);
        toast.error("Save failed: " + (result?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("❌ Exception during save:", error);
      toast.error("Failed to save: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      debug.log("🏁 Save process complete, resetting button");
      setIsSaving(false);
    }
  };

  return (
    <Button
      onClick={handleSave}
      disabled={isSaving || !currentPresentationId}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      <Save className="h-4 w-4" />
      {isSaving ? "Saving..." : "Save"}
    </Button>
  );
}
