/**
 * Base service for API interactions
 */
import { StreamingCallback } from '../../types';
import { processStream } from '../../utils/StreamUtils';

/**
 * Base class for API services
 */
export abstract class ApiService {
  /**
   * Base URL for the API
   */
  protected abstract baseUrl: string;
  
  /**
   * Headers required for API requests
   * @param apiKey The API key to use
   * @returns Headers object
   */
  protected abstract getHeaders(apiKey: string): Record<string, string>;
  
  /**
   * Handles API errors
   * @param error The error that occurred
   * @param serviceName The name of the service for logging
   */
  protected handleApiError(error: any, serviceName: string): never {
    // Check if this is an abort error (request was cancelled)
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log(`${serviceName} API request was cancelled`);
      throw new Error('Request cancelled');
    } else {
      console.error(`Error calling ${serviceName} API:`, error);
      throw error;
    }
  }
  
  /**
   * Makes a streaming API request
   * @param url The URL to request
   * @param body The request body
   * @param headers The request headers
   * @param onChunk Callback for streaming chunks
   * @param abortSignal Signal to abort the request
   * @returns The complete response text
   */
  protected async makeStreamingRequest(
    url: string,
    body: any,
    headers: Record<string, string>,
    onChunk?: StreamingCallback,
    abortSignal?: AbortSignal
  ): Promise<string> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: abortSignal
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      // Process the stream if streaming is enabled
      if (onChunk && response.body) {
        const reader = response.body.getReader();
        return processStream(reader, onChunk);
      } else {
        // Fallback to non-streaming for backward compatibility
        const data = await response.json();
        return this.extractContentFromResponse(data);
      }
    } catch (error) {
      this.handleApiError(error, this.constructor.name);
    }
  }
  
  /**
   * Extracts content from a non-streaming response
   * @param data The response data
   * @returns The extracted content
   */
  protected abstract extractContentFromResponse(data: any): string;
}