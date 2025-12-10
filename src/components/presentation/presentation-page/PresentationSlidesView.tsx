"use client";
import { debug } from "@/lib/debug";

import { SlideContainer } from "@/components/presentation/presentation-page/SlideContainer";
import { usePresentationSlides } from "@/hooks/presentation/usePresentationSlides";
import { useSlideChangeWatcher } from "@/hooks/presentation/useSlideChangeWatcher";
import { cn } from "@/lib/utils";
import { usePresentationState } from "@/states/presentation-state";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PlateController } from "platejs/react";
import { useEffect } from "react";
import { PresentModeHeader } from "../dashboard/PresentModeHeader";
import { ThinkingDisplay } from "../dashboard/ThinkingDisplay";
import PresentationEditor from "../editor/presentation-editor";
import { GlobalUndoRedoHandler } from "./GlobalUndoRedoHandler";

interface PresentationSlidesViewProps {
  isGeneratingPresentation: boolean;
}

export const PresentationSlidesView = ({
  isGeneratingPresentation,
}: PresentationSlidesViewProps) => {
  const currentSlideIndex = usePresentationState((s) => s.currentSlideIndex);
  const isPresenting = usePresentationState((s) => s.isPresenting);
  const nextSlide = usePresentationState((s) => s.nextSlide);
  const previousSlide = usePresentationState((s) => s.previousSlide);
  const setShouldShowExitHeader = usePresentationState(
    (s) => s.setShouldShowExitHeader,
  );
  const currentPresentationTitle = usePresentationState(
    (s) => s.currentPresentationTitle,
  );
  const shouldShowExitHeader = usePresentationState(
    (s) => s.shouldShowExitHeader,
  );
  const { items, sensors, handleDragEnd } = usePresentationSlides();
  
  debug.log("🎨 [SLIDES_VIEW] Rendering PresentationSlidesView", {
    itemsCount: items.length,
    isGeneratingPresentation,
    isPresenting,
    currentSlideIndex,
  });
  // Use the slide change watcher to automatically save changes
  useSlideChangeWatcher({ debounceDelay: 600 });
  // Handle keyboard navigation in presentation mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPresenting) return;
      if (event.key === "ArrowRight" || event.key === "Space") {
        nextSlide();
      } else if (event.key === "ArrowLeft") {
        previousSlide();
      } else if (event.key === "Escape") {
        usePresentationState.getState().setIsPresenting(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, previousSlide, isPresenting]);

  // Handle showing header on mouse move
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isPresenting) return; // Only show header when in presentation mode

      if (event.clientY < 100) {
        setShouldShowExitHeader(true);
      } else {
        setShouldShowExitHeader(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isPresenting]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <PresentModeHeader
          presentationTitle={currentPresentationTitle}
          showHeader={isPresenting && shouldShowExitHeader}
        />

        <ThinkingDisplay
          thinking={usePresentationState.getState().presentationThinking}
          isGenerating={isGeneratingPresentation}
          title="AI is thinking about your presentation..."
        />

        <PlateController>
          <GlobalUndoRedoHandler />

          {items.length === 0 && (
            <div className="flex h-screen w-full items-center justify-center">
              <p className="text-muted-foreground">
              </p>
            </div>
          )}

          {items.map((slide, index) => {
        debug.log(`🎨 [SLIDES_VIEW] Rendering slide ${index}:`, {
          id: slide.id,
          hasContent: !!slide.content,
          contentLength: slide.content?.length,
          contentTypes: slide.content?.map(c => c.type),
        });
        if (index === 0) {
          debug.log(`🔍 [SLIDES_VIEW] First slide full content:`, JSON.stringify(slide.content, null, 2));
        }
        return (
            <div
              key={slide.id}
              className={`slide-wrapper slide-wrapper-${index} w-full`}
            >
              <SlideContainer
                index={index}
                id={slide.id}
                slideWidth={slide.width}
                slidesCount={items.length}
              >
                <div
                  className={cn(
                    `slide-container-${index}`,
                    isPresenting && "h-screen w-screen",
                  )}
                >
                  <PresentationEditor
                    initialContent={slide}
                    className={cn(
                      "min-h-[300px] rounded-md border",
                      isPresenting && "h-screen w-screen",
                    )}
                    id={slide.id}
                    autoFocus={index === currentSlideIndex}
                    slideIndex={index}
                    isGenerating={isGeneratingPresentation}
                    readOnly={isPresenting}
                  />
                </div>
              </SlideContainer>
            </div>
            );
          })}
        </PlateController>
      </SortableContext>
    </DndContext>
  );
};
