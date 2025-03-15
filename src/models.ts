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
};