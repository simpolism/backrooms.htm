import { Message, ApiKeys, ModelInfo } from './types';
import { MODEL_INFO } from './models';
import {
  claudeConversation,
  gpt4Conversation,
  hyperbolicCompletionConversation,
  openrouterConversation,
} from './api';
import { loadFromLocalStorage } from './utils';

export function generateModelResponse(
  modelInfo: ModelInfo,
  actor: string,
  context: Message[],
  systemPrompt: string | null,
  apiKeys: ApiKeys,
  maxOutputLength: number = 1024,
  modelIndex?: number
): Promise<string> {
  // Determine which API to use based on the company
  const company = modelInfo.company;
  
  if (company === 'anthropic') {
    return claudeConversation(
      actor,
      modelInfo.api_name,
      context,
      systemPrompt,
      apiKeys.anthropicApiKey,
      maxOutputLength
    );
  } else if (company === 'hyperbolic_completion') {
    return hyperbolicCompletionConversation(
      actor,
      modelInfo.api_name,
      context,
      systemPrompt,
      apiKeys.hyperbolicApiKey,
      maxOutputLength
    );
  } else if (company === 'openai') {
    return gpt4Conversation(
      actor,
      modelInfo.api_name,
      context,
      systemPrompt,
      apiKeys.openaiApiKey,
      maxOutputLength
    );
  } else if (company === 'openrouter') {
    // If this is the custom OpenRouter model, use the saved API name
    let apiName = modelInfo.api_name;
    
    if (modelInfo.is_custom_selector && modelIndex !== undefined) {
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
    
    return openrouterConversation(
      actor,
      apiName,
      context,
      systemPrompt,
      apiKeys.openrouterApiKey,
      maxOutputLength
    );
  } else {
    throw new Error(`Unsupported model company: ${company}`);
  }
}

export class Conversation {
  private models: string[];
  private modelDisplayNames: string[];
  private systemPrompts: (string | null)[];
  private contexts: Message[][];
  private apiKeys: ApiKeys;
  private outputCallback: (actor: string, response: string, elementId?: string, isLoading?: boolean) => void;
  private isRunning: boolean = false;
  private maxTurns: number;
  private maxOutputLength: number;
  private currentTurn: number = 0;

  constructor(
    models: string[],
    systemPrompts: (string | null)[],
    contexts: Message[][],
    apiKeys: ApiKeys,
    maxTurns: number = Infinity,
    maxOutputLength: number = 1024,
    outputCallback: (actor: string, response: string, elementId?: string, isLoading?: boolean) => void
  ) {
    this.models = models;
    this.systemPrompts = systemPrompts;
    this.contexts = contexts;
    this.apiKeys = apiKeys;
    this.maxTurns = maxTurns;
    this.maxOutputLength = maxOutputLength;
    this.outputCallback = outputCallback;
    
    // Generate model display names
    this.modelDisplayNames = models.map((model, index) => {
      return `${MODEL_INFO[model].display_name} ${index + 1}`;
    });
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    this.currentTurn = 0;
    
    while (this.isRunning && this.currentTurn < this.maxTurns) {
      await this.processTurn();
      this.currentTurn++;
    }
    
    this.outputCallback(
      'System',
      `\nConversation ended.`
    );
  }

  public stop(): void {
    this.isRunning = false;
  }

  private async processTurn(): Promise<void> {
    for (let i = 0; i < this.models.length; i++) {
      if (!this.isRunning) break;
      
      // Add loading indicator with actor name and "..."
      const loadingId = `loading-${Date.now()}-${i}`;
      this.outputCallback(this.modelDisplayNames[i], "", loadingId, true);
      
      try {
        // Make the API call
        const response = await generateModelResponse(
          MODEL_INFO[this.models[i]],
          this.modelDisplayNames[i],
          this.contexts[i],
          this.systemPrompts[i],
          this.apiKeys,
          this.maxOutputLength,
          i // Pass the model index
        );
        
        // Replace loading indicator with actual response
        this.outputCallback(this.modelDisplayNames[i], response, loadingId, false);
        
        // Check for conversation end signal
        if (response.includes('^C^C')) {
          const endMessage = `\n${this.modelDisplayNames[i]} has ended the conversation with ^C^C.`;
          this.outputCallback('System', endMessage);
          this.stop();
          return;
        }
        
        // Add response to all contexts
        for (let j = 0; j < this.contexts.length; j++) {
          const role = j === i ? 'assistant' : 'user';
          this.contexts[j].push({ role, content: response });
        }
      } catch (error) {
        console.error(`Error in turn processing for ${this.modelDisplayNames[i]}:`, error);
        // Update loading indicator with error message
        this.outputCallback(
          'System',
          `Error: Failed to get response from ${this.modelDisplayNames[i]}`,
          loadingId,
          false
        );
        this.stop();
      }
    }
  }
}