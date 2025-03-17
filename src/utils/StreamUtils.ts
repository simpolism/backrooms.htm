/**
 * Utilities for handling streaming responses from APIs
 */
import { StreamingCallback } from '../types';

/**
 * Processes a streaming response from an API
 * @param reader The ReadableStreamDefaultReader to read from
 * @param onChunk Callback function to handle each chunk of data
 * @returns The complete text from the stream
 */
export async function processStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: StreamingCallback
): Promise<string> {
  const decoder = new TextDecoder();
  let fullText = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // Signal completion
        onChunk('', true);
        break;
      }
      
      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      
      // Process the chunk (handle SSE format)
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.substring(6));
            let content = '';
            
            // Extract content based on response format
            if (data.choices && data.choices[0]) {
              if (data.choices[0].text) {
                // Hyperbolic completion format
                content = data.choices[0].text;
              } else if (data.choices[0].delta && data.choices[0].delta.content) {
                // OpenRouter streaming format (newer API versions)
                content = data.choices[0].delta.content;
              } else if (data.choices[0].message && data.choices[0].message.content) {
                // OpenRouter format (older API versions)
                content = data.choices[0].message.content;
              }
            }
            
            if (content) {
              fullText += content;
              onChunk(content, false);
            } else {
              console.warn('No content extracted from response:', JSON.stringify(data));
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
  } catch (error) {
    // Check if this is an abort error (request was cancelled)
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('Stream reading was cancelled');
      throw new Error('Request cancelled');
    } else {
      console.error('Error reading stream:', error);
      throw error;
    }
  }
  
  return fullText;
}