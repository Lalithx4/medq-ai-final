// Smart suggestion types for AI Agent
export interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => Promise<void>;
  context: 'slide' | 'presentation';
  priority: 'high' | 'medium' | 'low';
}

export type SuggestionType = 
  | 'simplify-text'
  | 'add-image'
  | 'add-notes'
  | 'add-definitions'
  | 'add-visuals-all'
  | 'add-conclusion';

export interface AgentHistoryItem {
  id: string;
  instruction: string;
  slideIndex: number;
  timestamp: number;
  originalContent: any[];
  modifiedContent: any[];
}
