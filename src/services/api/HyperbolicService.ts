/**
 * Service for interacting with the Hyperbolic API
 */
import { Message, StreamingCallback } from '../../types';
import { ApiService } from './ApiService';

/**
 * Service for Hyperbolic API interactions
 */
export class HyperbolicService extends ApiService {
  /**
   * Base URL for the Hyperbolic API
   */
  protected baseUrl = 'https://api.hyperbolic.xyz/v1/completions';
  
  /**
   * Gets headers for Hyperbolic API requests
   * @param apiKey The Hyperbolic API key
   * @returns Headers object
   */
  protected getHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Extracts content from a non-streaming response
   * @param data The response data
   * @returns The extracted content
   */
  protected extractContentFromResponse(data: any): string {
    return data.choices[0].text.trim();
  }
  
  /**
   * Sends a completion request to the Hyperbolic API
   * @param actor The actor name
   * @param model The model to use
   * @param context The conversation context
   * @param systemPrompt The system prompt
   * @param apiKey The Hyperbolic API key
   * @param maxTokens Maximum tokens to generate
   * @param onChunk Callback for streaming chunks
   * @param abortSignal Signal to abort the request
   * @returns The generated text
   */
  public async generateCompletion(
    actor: string,
    model: string,
    context: Message[],
    systemPrompt: string | null,
    apiKey: string,
    maxTokens: number = 1024,
    onChunk?: StreamingCallback,
    abortSignal?: AbortSignal
  ): Promise<string> {
    // only use messages for system prompt, as llama base prefers a completion prompt
    const messages = [];
    if (systemPrompt) {
      messages.unshift({ role: 'system', content: systemPrompt });
    }
  
    // Format messages into a chat-like completion prompt
    let prompt = "";
    if (systemPrompt) {
      prompt += `System: ${systemPrompt}\n\n`;
    }
    
    for (const message of context.map(m => ({ role: m.role, content: m.content }))) {
      const role = message.role === 'assistant' ? 'AI1' : 'AI2';
      prompt += `${role}: ${message.content}\n\n`;
    }
    
    prompt += "AI1:";
  
    const payload = {
      model,
      messages,
      temperature: 1.0,
      max_tokens: maxTokens,
      prompt,
      stream: true // Enable streaming
    };
  
    try {
      return await this.makeStreamingRequest(
        this.baseUrl,
        payload,
        this.getHeaders(apiKey),
        onChunk,
        abortSignal
      );
    } catch (error) {
      this.handleApiError(error, 'Hyperbolic Completion');
    }
  }
}

/**
 * Singleton instance of the HyperbolicService
 */
export const hyperbolicService = new HyperbolicService();

/**
 * Convenience function for generating a completion
 */
export async function hyperbolicCompletionConversation(
  actor: string,
  model: string,
  context: Message[],
  systemPrompt: string | null,
  hyperbolicKey: string,
  maxTokens: number = 1024,
  onChunk?: StreamingCallback,
  abortSignal?: AbortSignal
): Promise<string> {
  return hyperbolicService.generateCompletion(
    actor,
    model,
    context,
    systemPrompt,
    hyperbolicKey,
    maxTokens,
    onChunk,
    abortSignal
  );
}