import { usePresentationState } from "@/states/presentation-state";
import { useEffect, useRef } from "react";
import { useDebouncedSave } from "./useDebouncedSave";

interface UseSlideChangeWatcherOptions {
  /**
   * The delay in milliseconds before triggering a save.
   * @default 1000
   */
  debounceDelay?: number;
}

/**
 * A hook that watches for changes to the slides and triggers
 * a debounced save function whenever changes are detected.
 */
export const useSlideChangeWatcher = (
  options: UseSlideChangeWatcherOptions = {},
) => {
  const { debounceDelay = 1000 } = options;
  
  // DISABLED: Auto-save watcher is causing performance issues and edit conflicts
  // Content changes are already saved by the editor's own mechanism
  // Structural changes (add/remove slides) will be saved manually
  
  const { saveImmediately } = useDebouncedSave({ delay: debounceDelay });
  
  // No automatic watching - saves are triggered manually by operations
  // that need them (like add/delete slide, image changes, etc.)

  return {
    saveImmediately,
  };
};
