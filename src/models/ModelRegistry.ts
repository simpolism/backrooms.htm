/**
 * Registry of available models and their metadata
 */
import { ModelInfo } from '../types';

/**
 * Registry of all available models with their metadata
 */
export const MODEL_INFO: Record<string, ModelInfo> = {
  "gemini-flash": {
    "api_name": "google/gemini-2.0-flash-001",
    "display_name": "Gemini",
    "company": "openrouter",
  },
  "claude-3-opus": {
    "api_name": "anthropic/claude-3-opus",
    "display_name": "Claude 3 Opus",
    "company": "openrouter",
  },
  "claude-3.7-sonnet": {
    "api_name": "anthropic/claude-3.7-sonnet",
    "display_name": "Claude 3.7 Sonnet",
    "company": "openrouter",
  },
  "claude-3.5-haiku": {
    "api_name": "anthropic/claude-3.5-haiku",
    "display_name": "Claude 3.5 Haiku",
    "company": "openrouter",
  },
  "chatgpt-4o-latest": {
    "api_name": "openai/chatgpt-4o-latest",
    "display_name": "OpenAI ChatGPT-4o",
    "company": "openrouter",
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
  "openrouter_custom": {
    "api_name": "custom", // This will be replaced with the actual model ID
    "display_name": "OpenRouter Custom",
    "company": "openrouter",
    "is_custom_selector": true
  },
};

/**
 * Gets model information by model key
 * @param modelKey The key of the model to retrieve
 * @returns The model information or undefined if not found
 */
export function getModelInfo(modelKey: string): ModelInfo | undefined {
  return MODEL_INFO[modelKey];
}

/**
 * Gets all available models
 * @returns Array of model keys
 */
export function getAllModelKeys(): string[] {
  return Object.keys(MODEL_INFO);
}

/**
 * Gets models filtered by company
 * @param company The company to filter by
 * @returns Array of model keys for the specified company
 */
export function getModelsByCompany(company: string): string[] {
  return Object.entries(MODEL_INFO)
    .filter(([_, info]) => info.company === company)
    .map(([key, _]) => key);
}

/**
 * Gets the display name for a model
 * @param modelKey The key of the model
 * @returns The display name or the key if not found
 */
export function getModelDisplayName(modelKey: string): string {
  return MODEL_INFO[modelKey]?.display_name || modelKey;
}