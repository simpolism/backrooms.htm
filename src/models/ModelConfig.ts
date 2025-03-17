/**
 * Manages model configuration and selection
 */
import { saveToLocalStorage, loadFromLocalStorage } from '../services/storage/LocalStorageService';
import { getModelInfo } from './ModelRegistry';
import { ApiKeys } from '../types';

/**
 * Storage keys for model configurations
 */
const MODEL_SELECTIONS_KEY = 'modelSelections';
const OPENROUTER_MODELS_CACHE_KEY = 'openrouterModelsCache';
const OPENROUTER_CUSTOM_MODEL_KEY_PREFIX = 'openrouter_custom_model_';

/**
 * Saves the current model selections
 * @param modelSelects Array of model select elements
 */
export function saveModelSelections(modelSelects: NodeListOf<HTMLSelectElement>): void {
  const models: string[] = Array.from(modelSelects).map(select => select.value);
  saveToLocalStorage(MODEL_SELECTIONS_KEY, models);
}

/**
 * Loads saved model selections
 * @returns Array of saved model keys or empty array if none found
 */
export function loadModelSelections(): string[] {
  return loadFromLocalStorage(MODEL_SELECTIONS_KEY, []);
}

/**
 * Saves a custom OpenRouter model selection
 * @param index The index of the model
 * @param modelId The model ID
 * @param modelName The model name
 */
export function saveCustomOpenRouterModel(index: number, modelId: string, modelName: string): void {
  saveToLocalStorage(`${OPENROUTER_CUSTOM_MODEL_KEY_PREFIX}${index}`, JSON.stringify({
    id: modelId,
    name: modelName
  }));
}

/**
 * Loads a custom OpenRouter model selection
 * @param index The index of the model
 * @returns The model data or null if not found
 */
export function loadCustomOpenRouterModel(index: number): { id: string, name: string } | null {
  const savedModel = loadFromLocalStorage(`${OPENROUTER_CUSTOM_MODEL_KEY_PREFIX}${index}`, null);
  if (savedModel) {
    try {
      return JSON.parse(savedModel);
    } catch (e) {
      console.error('Error parsing saved model:', e);
    }
  }
  return null;
}

/**
 * Validates that the required API keys are available for the selected models
 * @param models Array of model keys
 * @param apiKeys API keys object
 * @returns Object with validation result and any missing key names
 */
export function validateRequiredApiKeys(models: string[], apiKeys: ApiKeys): { 
  valid: boolean; 
  missingKeys: string[] 
} {
  const requiredApis: Record<string, string> = {};
  
  for (const model of models) {
    const modelInfo = getModelInfo(model);
    if (!modelInfo) continue;
    
    const company = modelInfo.company;
    if (company === 'hyperbolic' || company === 'hyperbolic_completion') {
      requiredApis['hyperbolicApiKey'] = 'Hyperbolic API Key';
    } else if (company === 'openrouter') {
      requiredApis['openrouterApiKey'] = 'OpenRouter API Key';
    }
  }
  
  // Check if any required API keys are missing
  const missingKeys: string[] = [];
  for (const [key, name] of Object.entries(requiredApis)) {
    if (!apiKeys[key as keyof ApiKeys]) {
      missingKeys.push(name);
    }
  }
  
  return {
    valid: missingKeys.length === 0,
    missingKeys
  };
}

/**
 * Caches OpenRouter models data
 * @param models The models data to cache
 */
export function cacheOpenRouterModels(models: any[]): void {
  saveToLocalStorage(OPENROUTER_MODELS_CACHE_KEY, JSON.stringify({
    models,
    timestamp: Date.now()
  }));
}

/**
 * Gets cached OpenRouter models data
 * @returns The cached models data or null if not found or expired
 */
export function getCachedOpenRouterModels(): any[] | null {
  const cachedData = loadFromLocalStorage(OPENROUTER_MODELS_CACHE_KEY, null);
  if (cachedData) {
    try {
      const { models, timestamp } = JSON.parse(cachedData);
      // Cache expires after 1 hour (3600000 ms)
      if (Date.now() - timestamp < 3600000) {
        return models;
      }
    } catch (e) {
      console.error('Error parsing cached models:', e);
    }
  }
  return null;
}