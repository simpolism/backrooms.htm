export interface ModelInfo {
  api_name: string;
  display_name: string;
  company: string;
  is_custom_selector?: boolean;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface TemplateConfig {
  system_prompt: string;
  context: Message[];
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

export interface TemplateInfo {
  name: string;
  description: string;
}

export interface ConversationOutputItem {
  actor: string;
  content: string;
  timestamp: string;
  id: string;
}

export interface CollapsibleSectionProps {
  id: string;
  title: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

export interface ApiKeySectionProps {
  apiKeys: ApiKeys;
  setApiKeys: (keys: ApiKeys) => void;
}

export interface TemplateSelectionProps {
  selectedTemplate: string;
  setSelectedTemplate: (template: string) => void;
  isConversationRunning: boolean;
}

export interface ModelSelectionProps {
  selectedModels: string[];
  setSelectedModels: (models: string[]) => void;
  apiKeys: ApiKeys;
  selectedTemplate: string;
  isConversationRunning: boolean;
}

export interface OutputSettingsProps {
  fontSize: number;
  setFontSize: (size: number) => void;
  wordWrap: boolean;
  setWordWrap: (wrap: boolean) => void;
  maxTurns: string;
  setMaxTurns: (turns: string) => void;
  maxOutputLength: string;
  setMaxOutputLength: (length: string) => void;
  isConversationRunning: boolean;
}

export interface TemplateEditorProps {
  selectedTemplate: string;
  refreshTemplates: () => void;
}

export interface ConversationControlsProps {
  isConversationRunning: boolean;
  isPaused: boolean;
  showExportButton: boolean;
  startConversation: () => void;
  stopConversation: () => void;
  pauseConversation: () => void;
  resumeConversation: () => void;
  exportConversation: () => void;
  loadConversation: (file: File) => void;
}

export interface ConversationContainerProps {
  conversationOutput: ConversationOutputItem[];
  fontSize: number;
  wordWrap: boolean;
}

export interface SettingsPanelProps {
  apiKeys: ApiKeys;
  setApiKeys: (keys: ApiKeys) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  wordWrap: boolean;
  setWordWrap: (wrap: boolean) => void;
  maxTurns: string;
  setMaxTurns: (turns: string) => void;
  maxOutputLength: string;
  setMaxOutputLength: (length: string) => void;
  selectedTemplate: string;
  setSelectedTemplate: (template: string) => void;
  selectedModels: string[];
  setSelectedModels: (models: string[]) => void;
  isConversationRunning: boolean;
  setIsConversationRunning: (running: boolean) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  showExportButton: boolean;
  setShowExportButton: (show: boolean) => void;
  conversationOutput: ConversationOutputItem[];
  setConversationOutput: React.Dispatch<React.SetStateAction<ConversationOutputItem[]>>;
}