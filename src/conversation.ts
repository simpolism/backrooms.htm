import { Message, ApiKeys } from './types';
import { MODEL_INFO } from './models';
import { 
  claudeConversation,
  gpt4Conversation,
  hyperbolicConversation,
  hyperbolicCompletionConversation,
  cliConversation
} from './api';

export function generateModelResponse(
  model: string,
  actor: string,
  context: Message[],
  systemPrompt: string | null,
  apiKeys: ApiKeys
): Promise<string> {
  if (model.startsWith('claude-')) {
    return claudeConversation(
      actor,
      model,
      context,
      systemPrompt,
      apiKeys.anthropicApiKey
    );
  } else if (model.startsWith('meta-llama/Meta-Llama-3.1-405B-Instruct')) {
    return hyperbolicConversation(
      actor,
      model,
      context,
      systemPrompt,
      apiKeys.hyperbolicApiKey
    );
  } else if (model.startsWith('meta-llama/Meta-Llama-3.1-405B')) {
    return hyperbolicCompletionConversation(
      actor,
      model,
      context,
      systemPrompt,
      apiKeys.hyperbolicApiKey
    );
  } else {
    return gpt4Conversation(
      actor,
      model,
      context,
      systemPrompt,
      apiKeys.openaiApiKey
    );
  }
}

export class Conversation {
  private models: string[];
  private modelDisplayNames: string[];
  private systemPrompts: (string | null)[];
  private contexts: Message[][];
  private apiKeys: ApiKeys;
  private outputCallback: (actor: string, response: string) => void;
  private isRunning: boolean = false;
  private maxTurns: number;
  private currentTurn: number = 0;

  constructor(
    models: string[],
    systemPrompts: (string | null)[],
    contexts: Message[][],
    apiKeys: ApiKeys,
    maxTurns: number = Infinity,
    outputCallback: (actor: string, response: string) => void
  ) {
    this.models = models;
    this.systemPrompts = systemPrompts;
    this.contexts = contexts;
    this.apiKeys = apiKeys;
    this.maxTurns = maxTurns;
    this.outputCallback = outputCallback;
    
    // Generate model display names
    this.modelDisplayNames = models.map((model, index) => {
      if (model.toLowerCase() === 'cli') {
        return 'CLI';
      } else {
        return `${MODEL_INFO[model].display_name} ${index + 1}`;
      }
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
      `\nReached maximum number of turns (${this.maxTurns}). Conversation ended.`
    );
  }

  public stop(): void {
    this.isRunning = false;
  }

  private async processTurn(): Promise<void> {
    for (let i = 0; i < this.models.length; i++) {
      if (!this.isRunning) break;
      
      let response: string;
      
      try {
        if (this.models[i].toLowerCase() === 'cli') {
          response = await cliConversation(
            this.contexts[i],
            this.apiKeys.worldInterfaceKey
          );
        } else {
          response = await generateModelResponse(
            MODEL_INFO[this.models[i]].api_name,
            this.modelDisplayNames[i],
            this.contexts[i],
            this.systemPrompts[i],
            this.apiKeys
          );
        }
        
        // Process the response
        this.outputCallback(this.modelDisplayNames[i], response);
        
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
        this.outputCallback(
          'System',
          `Error: Failed to get response from ${this.modelDisplayNames[i]}`
        );
        this.stop();
      }
    }
  }
}