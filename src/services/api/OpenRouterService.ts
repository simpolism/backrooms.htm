/**
 * Service for interacting with the OpenRouter API
 */
import { Message, StreamingCallback } from '../../types';
import { ApiService } from './ApiService';
import { loadFromLocalStorage } from '../../services/storage/LocalStorageService';

/**
 * Service for OpenRouter API interactions
 */
export class OpenRouterService extends ApiService {
  /**
   * Base URL for the OpenRouter API
   */
  protected baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  
  /**
   * Gets headers for OpenRouter API requests
   * @param apiKey The OpenRouter API key
   * @returns Headers object
   */
  protected getHeaders(apiKey: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'backrooms.directory'
    };
  }
  
  /**
   * Extracts content from a non-streaming response
   * @param data The response data
   * @returns The extracted content
   */
  protected extractContentFromResponse(data: any): string {
    return data.choices[0].message.content;
  }
  
  /**
   * Sends a chat completion request to the OpenRouter API
   * @param actor The actor name
   * @param model The model to use
   * @param context The conversation context
   * @param systemPrompt The system prompt
   * @param apiKey The OpenRouter API key
   * @param maxTokens Maximum tokens to generate
   * @param onChunk Callback for streaming chunks
   * @param abortSignal Signal to abort the request
   * @param modelIndex Optional model index for custom model selection
   * @returns The generated text
   */
  public async generateChatCompletion(
    actor: string,
    model: string,
    context: Message[],
    systemPrompt: string | null,
    apiKey: string,
    maxTokens: number = 1024,
    onChunk?: StreamingCallback,
    abortSignal?: AbortSignal,
    modelIndex?: number
  ): Promise<string> {
    // If this is the custom OpenRouter model, use the saved API name
    let apiName = model;
    
    if (model === 'custom' && modelIndex !== undefined) {
      const savedModel = loadFromLocalStorage(`openrouter_custom_model_${modelIndex}`, null);
      if (savedModel) {
        try {
          const savedModelData = JSON.parse(savedModel);
          if (savedModelData.id) {
            apiName = savedModelData.id;
          }
        } catch (e) {
          console.error('Error parsing saved model:', e);
        }
      }
    }
    
    const messages = context.map(m => ({ role: m.role, content: m.content }));
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.unshift({ role: 'system', content: systemPrompt });
    }
  
    const requestBody = {
      model: apiName,
      messages,
      temperature: 1.0,
      max_tokens: maxTokens,
      stream: true // Enable streaming
    };
  
    try {
      return await this.makeStreamingRequest(
        this.baseUrl,
        requestBody,
        this.getHeaders(apiKey),
        onChunk,
        abortSignal
      );
    } catch (error) {
      this.handleApiError(error, 'OpenRouter');
    }
  }
  
  /**
   * Fetches available models from OpenRouter
   * @param apiKey The OpenRouter API key
   * @returns Array of model data
   */
  public async fetchAvailableModels(apiKey: string): Promise<any[]> {
    try {
      // Check if we have cached models and they're not expired
      const cachedData = loadFromLocalStorage('openrouterModelsCache', null);
      if (cachedData) {
        try {
          const { models, timestamp } = JSON.parse(cachedData);
          // Cache expires after 1 hour (3600000 ms)
          if (Date.now() - timestamp < 3600000) {
            return models;
          }
        } catch (e) {
          console.error('Error parsing cached models:', e);
          // Continue to fetch fresh data if cache parsing fails
        }
      }

      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: this.getHeaders(apiKey)
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the results with timestamp
      localStorage.setItem('openrouterModelsCache', JSON.stringify({
        models: data.data,
        timestamp: Date.now()
      }));
      
      return data.data;
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance of the OpenRouterService
 */
export const openRouterService = new OpenRouterService();

/**
 * Convenience function for generating a chat completion
 */
export async function openrouterConversation(
  actor: string,
  model: string,
  context: Message[],
  systemPrompt: string | null,
  openrouterKey: string,
  maxTokens: number = 1024,
  onChunk?: StreamingCallback,
  abortSignal?: AbortSignal,
  modelIndex?: number
): Promise<string> {
  return openRouterService.generateChatCompletion(
    actor,
    model,
    context,
    systemPrompt,
    openrouterKey,
    maxTokens,
    onChunk,
    abortSignal,
    modelIndex
  );
}