import { Message, StreamingCallback, ExploreCompletion } from './types';

// Helper function to process streaming responses
async function processStream(
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

export async function openrouterConversation(
  actor: string,
  model: string,
  context: Message[],
  systemPrompt: string | null,
  openrouterKey: string,
  maxTokens: number = 1024,
  onChunk?: StreamingCallback,
  abortSignal?: AbortSignal,
  n: number = 1,  // New parameter for number of completions
  logprobs?: number  // New parameter for log probabilities
): Promise<string | ExploreCompletion[]> {
  const messages = context.map(m => ({ role: m.role, content: m.content }));
  
  // Add system prompt if provided
  if (systemPrompt) {
    messages.unshift({ role: 'system', content: systemPrompt });
  }

  const requestBody: any = {
    model,
    messages,
    temperature: 1.0,
    max_tokens: maxTokens,
    stream: n === 1 // Only enable streaming when n=1
  };
  
  // Add n parameter if greater than 1
  if (n > 1) {
    requestBody.n = n;
  }
  
  // Add logprobs if specified
  if (logprobs) {
    requestBody.logprobs = logprobs;
    requestBody.top_logprobs = 5;  // Request top 5 logprobs
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'backrooms.directory'
      },
      body: JSON.stringify(requestBody),
      signal: abortSignal
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    // Handle non-streaming response with multiple completions
    if (n > 1) {
      const data = await response.json();
      return data.choices.map((choice: any, index: number) => ({
        content: choice.message.content,
        logprobs: choice.logprobs,
        index: index,
        modelIndex: -1,  // Will be set by the caller
        modelName: actor
      }));
    }
    // Process the stream for single completion
    else if (onChunk && response.body) {
      const reader = response.body.getReader();
      return processStream(reader, onChunk);
    } else {
      // Fallback to non-streaming for backward compatibility
      const data = await response.json();
      return data.choices[0].message.content;
    }
  } catch (error) {
    // Check if this is an abort error (request was cancelled)
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('OpenRouter API request was cancelled');
      throw new Error('Request cancelled');
    } else {
      console.error('Error calling OpenRouter API:', error);
      throw error;
    }
  }
}

export async function hyperbolicCompletionConversation(
  actor: string,
  model: string,
  context: Message[],
  systemPrompt: string | null,
  hyperbolicKey: string,
  maxTokens: number = 1024,
  onChunk?: StreamingCallback,
  abortSignal?: AbortSignal,
  n: number = 1,  // New parameter for number of completions
  logprobs?: number  // New parameter for log probabilities
): Promise<string | ExploreCompletion[]> {
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

  const headers = {
    'Authorization': `Bearer ${hyperbolicKey}`,
    'Content-Type': 'application/json'
  };
  
  const payload: any = {
    model,
    messages,
    temperature: 1.0,
    max_tokens: maxTokens,
    prompt,
    stream: n === 1 // Only enable streaming when n=1
  };
  
  // Add n parameter if greater than 1
  if (n > 1) {
    payload.n = n;
  }
  
  // Add logprobs if specified
  if (logprobs) {
    payload.logprobs = logprobs;
    payload.top_logprobs = 5;  // Request top 5 logprobs
  }

  try {
    const response = await fetch('https://api.hyperbolic.xyz/v1/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: abortSignal
    });

    if (!response.ok) {
      throw new Error(`Hyperbolic Completion API error: ${response.status} ${response.statusText}`);
    }

    // Handle non-streaming response with multiple completions
    if (n > 1) {
      const data = await response.json();
      return data.choices.map((choice: any, index: number) => ({
        content: choice.text.trim(),
        logprobs: choice.logprobs,
        index: index,
        modelIndex: -1,  // Will be set by the caller
        modelName: actor
      }));
    }
    // Process the stream for single completion
    else if (onChunk && response.body) {
      const reader = response.body.getReader();
      return processStream(reader, onChunk);
    } else {
      // Fallback to non-streaming for backward compatibility
      const data = await response.json();
      return data.choices[0].text.trim();
    }
  } catch (error) {
    // Check if this is an abort error (request was cancelled)
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('Hyperbolic Completion API request was cancelled');
      throw new Error('Request cancelled');
    } else {
      console.error('Error calling Hyperbolic Completion API:', error);
      throw error;
    }
  }
}
