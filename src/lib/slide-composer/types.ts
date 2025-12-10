export interface SlideComposerRequest {
  topic: string;
  slideCount: number;
  audience?: string;
  tone?: string;
  sources?: {
    pubmed?: boolean;
    arxiv?: boolean;
    web?: boolean;
  };
  mode?: "gemini" | "deep_research";
}

export interface SlideContent {
  id: string;
  title: string;
  markdown: string;
  notes?: string;
  references?: string[];
}

export interface SlideComposerResult {
  slides: SlideContent[];
  researchMarkdown: string;
  metadata: {
    topic: string;
    slideCount: number;
    wordCount: number;
    generatedAt: string;
  };
}

export interface SlideComposerChatRequest {
  slides: SlideContent[];
  message: string;
  context?: {
    topic?: string;
    audience?: string;
    tone?: string;
  };
  lastAssistantSummary?: string;
}

export interface SlideComposerChatResponse {
  slides: SlideContent[];
  summary: string;
}
