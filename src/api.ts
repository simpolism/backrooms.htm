import { Message } from './types';

export async function claudeConversation(
  actor: string,
  model: string,
  context: Message[],
  systemPrompt: string | null,
  anthropicKey: string
): Promise<string> {
  const messages = context.map(m => ({ role: m.role, content: m.content }));

  const requestBody: any = {
    model,
    max_tokens: 1024,
    temperature: 1.0,
    messages
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

export async function gpt4Conversation(
  actor: string,
  model: string,
  context: Message[],
  systemPrompt: string | null,
  openaiKey: string
): Promise<string> {
  const messages = context.map(m => ({ role: m.role, content: m.content }));

  // Add system prompt if provided
  if (systemPrompt) {
    // not supported by o1
    // TODO: add a config variable to determine whether system prompt is supported
    if (model.includes('o1')) {
      messages.unshift({ role: 'user', content: systemPrompt });
    } else {
      messages.unshift({ role: 'system', content: systemPrompt });
    }
  }

  const requestBody: any = {
    model,
    messages,
    temperature: 1.0,
    max_completion_tokens: model.includes('o1') ? 4000 : 1024
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

export async function hyperbolicConversation(
  actor: string,
  model: string,
  context: Message[],
  systemPrompt: string | null,
  hyperbolicKey: string
): Promise<string> {
  const messages = context.map(m => ({ role: m.role, content: m.content }));
  
  // Add system prompt if provided
  if (systemPrompt) {
    messages.unshift({ role: 'system', content: systemPrompt });
  }

  const headers = {
    'Authorization': `Bearer ${hyperbolicKey}`,
    'Content-Type': 'application/json'
  };
  
  const payload = {
    model,
    messages,
    temperature: 1.0,
    max_tokens: 1024
  };

  try {
    const response = await fetch('https://api.hyperbolic.xyz/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Hyperbolic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Hyperbolic API:', error);
    throw error;
  }
}

export async function hyperbolicCompletionConversation(
  actor: string,
  model: string,
  context: Message[],
  systemPrompt: string | null,
  hyperbolicKey: string
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

  const headers = {
    'Authorization': `Bearer ${hyperbolicKey}`,
    'Content-Type': 'application/json'
  };
  
  const payload = {
    model,
    messages,
    temperature: 1.0,
    max_tokens: 1024,
    prompt,
  };

  try {
    const response = await fetch('https://api.hyperbolic.xyz/v1/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Hyperbolic Completion API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].text.trim();
  } catch (error) {
    console.error('Error calling Hyperbolic Completion API:', error);
    throw error;
  }
}
