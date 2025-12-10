import { type ImageModelList } from "@/app/_actions/image/generate";
import { type PlateSlide } from "@/components/presentation/utils/parser";
import { type ThemeProperties, type Themes } from "@/lib/presentation/themes";
import { type TemplateProperties, type Templates } from "@/lib/presentation/templates";
import { type TElement } from "platejs";
import { create } from "zustand";

interface PresentationState {
  currentPresentationId: string | null;
  currentPresentationTitle: string | null;
  isGridView: boolean;
  isSheetOpen: boolean;
  numSlides: number;

  theme: Themes | string;
  customThemeData: ThemeProperties | null;
  template: Templates | string | null;
  customTemplateData: TemplateProperties | null;
  language: string;
  pageStyle: string;
  showTemplates: boolean;
  presentationInput: string;
  imageModel: ImageModelList;
  imageSource: "ai" | "stock";
  stockImageProvider: "unsplash" | "openi" | "wikimedia";
  presentationStyle: string;
  modelProvider: "openai" | "ollama" | "lmstudio" | "cerebras";
  modelId: string;
  savingStatus: "idle" | "saving" | "saved";
  isPresenting: boolean;
  currentSlideIndex: number;
  isThemeCreatorOpen: boolean;

  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
  // Generation states
  shouldStartOutlineGeneration: boolean;
  shouldStartPresentationGeneration: boolean;
  isGeneratingOutline: boolean;
  isGeneratingPresentation: boolean;
  outline: string[];
  searchResults: Array<{ query: string; results: unknown[] }>; // Store search results for context
  webSearchEnabled: boolean; // Toggle for web search in outline generation
  researchSources: {
    web: boolean;
    pubmed: boolean;
    arxiv: boolean;
  }; // Multi-source selection for research
  slides: PlateSlide[]; // This now holds the new object structure

  // Thinking content from AI responses
  outlineThinking: string; // Thinking content from outline generation
  presentationThinking: string; // Thinking content from presentation generation

  // Root image generation tracking by slideId
  rootImageGeneration: Record<
    string,
    {
      query: string;
      status: "pending" | "success" | "error";
      url?: string;
      error?: string;
    }
  >;

  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (update: boolean) => void;
  isRightPanelCollapsed: boolean;
  setIsRightPanelCollapsed: (update: boolean) => void;
  setSlides: (slides: PlateSlide[]) => void;
  startRootImageGeneration: (slideId: string, query: string) => void;
  completeRootImageGeneration: (slideId: string, url: string) => void;
  failRootImageGeneration: (slideId: string, error: string) => void;
  clearRootImageGeneration: (slideId: string) => void;
  setCurrentPresentation: (id: string | null, title: string | null) => void;
  setIsGridView: (isGrid: boolean) => void;
  setIsSheetOpen: (isOpen: boolean) => void;
  setNumSlides: (num: number) => void;
  setTheme: (
    theme: Themes | string,
    customData?: ThemeProperties | null,
  ) => void;
  setTemplate: (
    template: Templates | string | null,
    customData?: TemplateProperties | null,
  ) => void;
  shouldShowExitHeader: boolean;
  setShouldShowExitHeader: (udpdate: boolean) => void;
  thumbnailUrl?: string;
  setThumbnailUrl: (url: string | undefined) => void;
  setLanguage: (lang: string) => void;
  setPageStyle: (style: string) => void;
  setShowTemplates: (show: boolean) => void;
  setPresentationInput: (input: string) => void;
  setOutline: (topics: string[]) => void;
  setSearchResults: (
    results: Array<{ query: string; results: unknown[] }>,
  ) => void;
  setOutlineThinking: (thinking: string) => void;
  setPresentationThinking: (thinking: string) => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  setResearchSources: (sources: { web?: boolean; pubmed?: boolean; arxiv?: boolean }) => void;
  setImageModel: (model: ImageModelList) => void;
  setImageSource: (source: "ai" | "stock") => void;
  setStockImageProvider: (provider: "unsplash" | "openi" | "wikimedia") => void;
  setPresentationStyle: (style: string) => void;
  setModelProvider: (provider: "openai" | "ollama" | "lmstudio" | "cerebras") => void;
  setModelId: (id: string) => void;
  setSavingStatus: (status: "idle" | "saving" | "saved") => void;
  setIsPresenting: (isPresenting: boolean) => void;
  setCurrentSlideIndex: (index: number) => void;
  nextSlide: () => void;
  previousSlide: () => void;

  setIsThemeCreatorOpen: (update: boolean) => void;
  // Generation actions
  setShouldStartOutlineGeneration: (shouldStart: boolean) => void;
  setShouldStartPresentationGeneration: (shouldStart: boolean) => void;
  setIsGeneratingOutline: (isGenerating: boolean) => void;
  setIsGeneratingPresentation: (isGenerating: boolean) => void;
  startOutlineGeneration: () => void;
  startPresentationGeneration: () => void;
  resetGeneration: () => void;
  resetForNewGeneration: () => void;

  // Selection state
  isSelecting: boolean;
  selectedPresentations: string[];
  toggleSelecting: () => void;
  selectAllPresentations: (ids: string[]) => void;
  deselectAllPresentations: () => void;
  togglePresentationSelection: (id: string) => void;

  // Palette → Editor communication
  pendingInsertNode: TElement | null;
  setPendingInsertNode: (node: TElement | null) => void;

  // Agent state
  isAgentOpen: boolean;
  agentInstruction: string;
  agentPreview: {
    original: PlateSlide | null;
    modified: PlateSlide | null;
    plan: string;
    changes: string[];
  } | null;
  isAgentProcessing: boolean;
  agentHistory: Array<{
    id: string;
    instruction: string;
    slideIndex: number;
    timestamp: number;
    originalContent: any[];
    modifiedContent: any[];
  }>;
  agentEditTimestamp: number;
  setIsAgentOpen: (open: boolean) => void;
  setAgentInstruction: (instruction: string) => void;
  setAgentPreview: (preview: {
    original: PlateSlide | null;
    modified: PlateSlide | null;
    plan: string;
    changes: string[];
  } | null) => void;
  setIsAgentProcessing: (processing: boolean) => void;
  acceptAgentEdit: () => Promise<void>;
  rejectAgentEdit: () => void;
  clearAgentHistory: () => void;
  undoAgentEdit: (historyId: string) => void;
}

export const usePresentationState = create<PresentationState>((set) => ({
  currentPresentationId: null,
  currentPresentationTitle: null,
  isGridView: true,
  isSheetOpen: false,
  shouldShowExitHeader: false,
  setShouldShowExitHeader: (update) => set({ shouldShowExitHeader: update }),
  thumbnailUrl: undefined,
  setThumbnailUrl: (url) => set({ thumbnailUrl: url }),
  numSlides: 15,
  language: "en-US",
  pageStyle: "default",
  showTemplates: false,
  presentationInput: "",
  outline: [],
  searchResults: [],
  webSearchEnabled: false,
  researchSources: {
    web: false,
    pubmed: true,
    arxiv: false,
  },
  theme: "orbit",
  customThemeData: null,
  template: "general",
  customTemplateData: null,
  imageModel: "black-forest-labs/FLUX.1-schnell-Free", // Legacy field, not used
  imageSource: "stock",
  stockImageProvider: "unsplash", // Default to Unsplash
  presentationStyle: "professional",
  modelProvider: "cerebras",
  modelId: "llama3.3-70b",
  slides: [], // Now holds the new slide object structure
  outlineThinking: "",
  presentationThinking: "",
  rootImageGeneration: {},
  savingStatus: "idle",
  isPresenting: false,
  currentSlideIndex: 0,
  isThemeCreatorOpen: false,
  config: {},
  pendingInsertNode: null,

  // Sidebar states
  isSidebarCollapsed: false,
  setIsSidebarCollapsed: (update) => set({ isSidebarCollapsed: update }),
  isRightPanelCollapsed: false,
  setIsRightPanelCollapsed: (update) => set({ isRightPanelCollapsed: update }),

  // Generation states
  shouldStartOutlineGeneration: false,
  shouldStartPresentationGeneration: false,
  isGeneratingOutline: false,
  isGeneratingPresentation: false,

  setSlides: (slides) => {
    set({ slides });
    // AUTO-SAVE DISABLED - Use manual save button instead
  },
  setPendingInsertNode: (node) => set({ pendingInsertNode: node }),
  setConfig: (config) => set({ config }),
  startRootImageGeneration: (slideId, query) =>
    set((state) => ({
      rootImageGeneration: {
        ...state.rootImageGeneration,
        [slideId]: { query, status: "pending" },
      },
    })),
  completeRootImageGeneration: (slideId, url) =>
    set((state) => ({
      rootImageGeneration: {
        ...state.rootImageGeneration,
        [slideId]: {
          ...(state.rootImageGeneration[slideId] ?? { query: "" }),
          status: "success",
          url,
        },
      },
    })),
  failRootImageGeneration: (slideId, error) =>
    set((state) => ({
      rootImageGeneration: {
        ...state.rootImageGeneration,
        [slideId]: {
          ...(state.rootImageGeneration[slideId] ?? { query: "" }),
          status: "error",
          error,
        },
      },
    })),
  clearRootImageGeneration: (slideId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [slideId]: _removed, ...rest } = state.rootImageGeneration;
      return { rootImageGeneration: rest } as Partial<PresentationState>;
    }),
  setCurrentPresentation: (id, title) =>
    set({ currentPresentationId: id, currentPresentationTitle: title }),
  setIsGridView: (isGrid) => set({ isGridView: isGrid }),
  setIsSheetOpen: (isOpen) => set({ isSheetOpen: isOpen }),
  setNumSlides: (num) => set({ numSlides: num }),
  setLanguage: (lang) => set({ language: lang }),
  setTheme: (theme, customData = null) =>
    set({
      theme: theme,
      customThemeData: customData,
    }),
  setTemplate: (template, customData = null) =>
    set({
      template: template,
      customTemplateData: customData,
    }),
  setPageStyle: (style) => set({ pageStyle: style }),
  setShowTemplates: (show) => set({ showTemplates: show }),
  setPresentationInput: (input) => set({ presentationInput: input }),
  setOutline: (topics) => set({ outline: topics }),
  setSearchResults: (results) => set({ searchResults: results }),
  setOutlineThinking: (thinking) => set({ outlineThinking: thinking }),
  setPresentationThinking: (thinking) => set({ presentationThinking: thinking }),
  setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),
  setResearchSources: (sources) =>
    set((state) => ({
      researchSources: { ...state.researchSources, ...sources },
    })),
  setImageModel: (model) => set({ imageModel: model }),
  setImageSource: (source) => set({ imageSource: source }),
  setStockImageProvider: (provider) => set({ stockImageProvider: provider }),
  setPresentationStyle: (style) => set({ presentationStyle: style }),
  setModelProvider: (provider) => set({ modelProvider: provider }),
  setModelId: (id) => set({ modelId: id }),
  setSavingStatus: (status) => set({ savingStatus: status }),
  setIsPresenting: (isPresenting) => set({ isPresenting }),
  setCurrentSlideIndex: (index) => set({ currentSlideIndex: index }),
  nextSlide: () =>
    set((state) => ({
      currentSlideIndex: Math.min(
        state.currentSlideIndex + 1,
        state.slides.length - 1,
      ),
    })),
  previousSlide: () =>
    set((state) => ({
      currentSlideIndex: Math.max(state.currentSlideIndex - 1, 0),
    })),

  // Generation actions
  setShouldStartOutlineGeneration: (shouldStart) =>
    set({ shouldStartOutlineGeneration: shouldStart }),
  setShouldStartPresentationGeneration: (shouldStart) =>
    set({ shouldStartPresentationGeneration: shouldStart }),
  setIsGeneratingOutline: (isGenerating) =>
    set({ isGeneratingOutline: isGenerating }),
  setIsGeneratingPresentation: (isGenerating) =>
    set({ isGeneratingPresentation: isGenerating }),
  startOutlineGeneration: () =>
    set({
      shouldStartOutlineGeneration: true,
      isGeneratingOutline: true,
      shouldStartPresentationGeneration: false,
      isGeneratingPresentation: false,
      outline: [],
    }),
  startPresentationGeneration: () =>
    set({
      shouldStartPresentationGeneration: true,
      isGeneratingPresentation: true,
    }),
  resetGeneration: () =>
    set({
      shouldStartOutlineGeneration: false,
      shouldStartPresentationGeneration: false,
      isGeneratingOutline: false,
      isGeneratingPresentation: false,
      searchResults: [],
    }),

  // Reset everything except ID and current input when starting new outline generation
  resetForNewGeneration: () =>
    set(() => ({
      thumbnailUrl: undefined,
      outline: [],
      searchResults: [],
      slides: [],
      outlineThinking: "",
      presentationThinking: "",
      rootImageGeneration: {},
      config: {},
    })),

  setIsThemeCreatorOpen: (update) => set({ isThemeCreatorOpen: update }),
  // Selection state
  isSelecting: false,
  selectedPresentations: [],
  toggleSelecting: () =>
    set((state) => ({
      isSelecting: !state.isSelecting,
      selectedPresentations: [],
    })),
  selectAllPresentations: (ids) => set({ selectedPresentations: ids }),
  deselectAllPresentations: () => set({ selectedPresentations: [] }),
  togglePresentationSelection: (id) =>
    set((state) => ({
      selectedPresentations: state.selectedPresentations.includes(id)
        ? state.selectedPresentations.filter((p) => p !== id)
        : [...state.selectedPresentations, id],
    })),

  // Agent state
  isAgentOpen: false,
  agentInstruction: "",
  agentPreview: null,
  isAgentProcessing: false,
  agentHistory: [],
  agentEditTimestamp: 0,
  setIsAgentOpen: (open) => set({ isAgentOpen: open }),
  setAgentInstruction: (instruction) => set({ agentInstruction: instruction }),
  setAgentPreview: (preview) => set({ agentPreview: preview }),
  setIsAgentProcessing: (processing) => set({ isAgentProcessing: processing }),
  acceptAgentEdit: async () => {
    const state = usePresentationState.getState();
    if (!state.agentPreview?.modified) return;
    
    const i = state.currentSlideIndex;
    const currentSlide = state.slides[i];
    if (!currentSlide) return;
    
    const timestamp = Date.now();
    const newSlides = [...state.slides];
    
    // Safe deep copy function that handles circular references
    const safeDeepCopy = (obj: any): any => {
      try {
        return JSON.parse(JSON.stringify(obj));
      } catch (error) {
        // If JSON.stringify fails due to circular references, use structuredClone or shallow copy
        if (typeof structuredClone !== 'undefined') {
          try {
            return structuredClone(obj);
          } catch {
            // Fallback to shallow copy
            return Array.isArray(obj) ? [...obj] : { ...obj };
          }
        }
        // Fallback to shallow copy
        return Array.isArray(obj) ? [...obj] : { ...obj };
      }
    };
    
    const originalContent = safeDeepCopy(currentSlide.content);
    const modifiedContent = state.agentPreview.modified.content || [];
    
    // Create a DEEP copy to ensure React detects the change
    const baseSlide = state.agentPreview.modified || currentSlide;
    // Ensure required properties like id are retained
    newSlides[i] = {
      ...baseSlide,
      id: currentSlide.id,
      content: safeDeepCopy(modifiedContent),
    } as PlateSlide;
    
    console.log("🔵 Agent edit accepted at timestamp:", timestamp);
    console.log("🔵 Updating slide:", i);
    console.log("🔵 New content length:", (newSlides[i] && newSlides[i].content ? newSlides[i].content.length : 0));
    
    // Add to history
    const historyItem = {
      id: `${timestamp}-${Math.random()}`,
      instruction: state.agentInstruction,
      slideIndex: state.currentSlideIndex,
      timestamp,
      originalContent,
      modifiedContent: safeDeepCopy(modifiedContent),
    };
    
    // Set timestamp FIRST, then update slides
    set({
      agentEditTimestamp: timestamp,
      slides: newSlides,
      agentPreview: null,
      agentInstruction: "",
      agentHistory: [historyItem, ...state.agentHistory].slice(0, 20), // Keep last 20
    });
    
    console.log("🔵 State updated, timestamp set to:", timestamp);
    
    // Save to database
    if (state.currentPresentationId) {
      console.log("💾 Saving to database...");
      const { updatePresentation } = await import("@/app/_actions/presentation/presentationActions");
      await updatePresentation({
        id: state.currentPresentationId,
        content: {
          slides: newSlides,
          config: {},
        },
      });
      console.log("✅ Saved to database");
    }
  },
  rejectAgentEdit: () =>
    set({
      agentPreview: null,
      agentInstruction: "",
    }),
  clearAgentHistory: () => set({ agentHistory: [] }),
  undoAgentEdit: (historyId) =>
    set((state) => {
      const historyItem = state.agentHistory.find((h) => h.id === historyId);
      if (!historyItem) return state;
      
      const newSlides = [...state.slides];
      const idx = historyItem.slideIndex;
      const target = newSlides[idx];
      if (!target) return state;
      newSlides[idx] = {
        ...target,
        id: target.id,
        content: [...historyItem.originalContent],
      } as PlateSlide;
      
      return {
        slides: newSlides,
        agentHistory: state.agentHistory.filter((h) => h.id !== historyId),
        agentEditTimestamp: Date.now(),
      };
    }),
}));
