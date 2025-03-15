export interface ModelInfo {
  api_name: string;
  display_name: string;
  company: string;
  is_custom_selector?: boolean; // New flag to identify special entries
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
  anthropic?: any;
  openai?: any;
}

export interface ConversationOptions {
  models: string[];
  template: string;
  maxTurns: number;
}

export interface ApiKeys {
  anthropicApiKey: string;
  openaiApiKey: string;
  hyperbolicApiKey: string;
  openrouterApiKey: string;
}

export interface CustomTemplate {
  name: string;        // Display name for the template
  description: string; // Brief description of what the template does
  content: string;     // Raw JSONL content
  originalName?: string; // Name of original template if this is based on an existing one
  lastModified: number; // Timestamp
}