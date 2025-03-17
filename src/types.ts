// Settings for explore mode
export interface ExploreSettings {
  enabled: boolean;
  n: number;  // Number of completions to generate
  maxTokens?: number; // Per-model max tokens setting
}

// Interface for explore mode completions
export interface ExploreCompletion {
  content: string;
  index: number;
  modelIndex: number;
  modelName: string;
  selected?: boolean;
}

export interface ModelInfo {
  api_name: string;
  display_name: string;
  company: string;
  is_custom_selector?: boolean; // New flag to identify special entries
  exploreSettings?: ExploreSettings;  // Settings for explore mode
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface TemplateConfig {
  system_prompt: string;
  context: Message[];
}

export interface ApiClients {
  openai?: any;
}

export interface ConversationOptions {
  models: string[];
  template: string;
  maxTurns: number;
}

export interface ApiKeys {
  hyperbolicApiKey: string;
  openrouterApiKey: string;
}

// Callback function type for streaming content updates
export type StreamingCallback = (chunk: string, isDone: boolean) => void;

export interface CustomTemplate {
  name: string;        // Display name for the template
  description: string; // Brief description of what the template does
  content: string;     // Raw JSONL content
  originalName?: string; // Name of original template if this is based on an existing one
  lastModified: number; // Timestamp
}