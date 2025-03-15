export interface ModelInfo {
  api_name: string;
  display_name: string;
  company: string;
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
}