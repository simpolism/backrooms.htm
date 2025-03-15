import { ModelInfo } from './types';

export const MODEL_INFO: Record<string, ModelInfo> = {
  "gemini-flash": {
    "api_name": "google/gemini-2.0-flash-001",
    "display_name": "Gemini",
    "company": "openrouter",
  },
  "openrouter_custom": {
    "api_name": "custom", // This will be replaced with the actual model ID
    "display_name": "OpenRouter Custom",
    "company": "openrouter",
    "is_custom_selector": true
  },
  "405b-base": {
    "api_name": "meta-llama/Meta-Llama-3.1-405B",
    "display_name": "B-405",
    "company": "hyperbolic_completion",
  },
  "405b-instruct": {
    "api_name": "meta-llama/Meta-Llama-3.1-405B-Instruct",
    "display_name": "I-405",
    "company": "hyperbolic_completion",
  },
  "sonnet": {
    "api_name": "claude-3-5-sonnet-20240620",
    "display_name": "Claude",
    "company": "anthropic",
  },
  "haiku": {
    "api_name": "claude-3-5-haiku-20241022",
    "display_name": "Claude",
    "company": "anthropic",
  },
  "opus": {
    "api_name": "claude-3-opus-20240229",
    "display_name": "Claude",
    "company": "anthropic",
  },
  "gpt4o": {
    "api_name": "gpt-4o-2024-08-06",
    "display_name": "GPT4o",
    "company": "openai",
  },
  "o1-preview": {
    "api_name": "o1-preview",
    "display_name": "O1",
    "company": "openai"
  },
  "o1-mini": {
    "api_name": "o1-mini",
    "display_name": "Mini",
    "company": "openai"
  },
};