import { Message, ApiKeys, ModelInfo, StreamingCallback, ExploreCompletion, ExploreSettings } from './types';
import { MODEL_INFO } from './models';
import {
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
  modelIndex?: number,
  onChunk?: StreamingCallback,
  abortSignal?: AbortSignal,
  n: number = 1,  // New parameter for number of completions
  logprobs?: number  // New parameter for log probabilities
): Promise<string | ExploreCompletion[]> {
  // Determine which API to use based on the company
  const company = modelInfo.company;
  
  // Get explore settings if available
  const exploreSettings = modelInfo.exploreSettings;
  const useExploreMode = n > 1 || (exploreSettings?.enabled && exploreSettings.n > 1);
  
  // Determine the number of completions and max tokens to use
  const completionsCount = useExploreMode ? (exploreSettings?.n || n) : 1;
  const tokensToUse = exploreSettings?.maxTokens || maxOutputLength;
  
  if (company === 'hyperbolic_completion') {
    return hyperbolicCompletionConversation(
      actor,
      modelInfo.api_name,
      context,
      systemPrompt,
      apiKeys.hyperbolicApiKey,
      tokensToUse,
      useExploreMode ? undefined : onChunk,  // Don't use streaming in explore mode
      abortSignal,
      completionsCount,
      useExploreMode ? 5 : undefined  // Request logprobs in explore mode
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
      tokensToUse,
      useExploreMode ? undefined : onChunk,  // Don't use streaming in explore mode
      abortSignal,
      completionsCount,
      useExploreMode ? 5 : undefined  // Request logprobs in explore mode
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
  private isPaused: boolean = false; // New state for pause functionality
  private maxTurns: number;
  private maxOutputLength: number;
  private currentTurn: number = 0;
  private currentResponses: Map<string, string> = new Map(); // Track responses for each model
  private abortController: AbortController | null = null; // For cancelling API requests
  
  // Explore mode properties
  private exploreMode: boolean = false;
  private exploreCompletions: ExploreCompletion[] = [];
  private exploreHistory: ExploreCompletion[][] = [];
  private onExploreCompletionsCallback: ((completions: ExploreCompletion[]) => void) | null = null;
  private onCompletionSelectedCallback: ((completion: ExploreCompletion) => void) | null = null;

  constructor(
    models: string[],
    systemPrompts: (string | null)[],
    contexts: Message[][],
    apiKeys: ApiKeys,
    maxTurns: number = Infinity,
    maxOutputLength: number = 1024,
    outputCallback: (actor: string, response: string, elementId?: string, isLoading?: boolean) => void,
    onExploreCompletionsCallback?: (completions: ExploreCompletion[]) => void,
    onCompletionSelectedCallback?: (completion: ExploreCompletion) => void
  ) {
    this.models = models;
    this.systemPrompts = systemPrompts;
    this.contexts = contexts;
    this.apiKeys = apiKeys;
    this.maxTurns = maxTurns;
    this.maxOutputLength = maxOutputLength;
    this.outputCallback = outputCallback;
    this.onExploreCompletionsCallback = onExploreCompletionsCallback || null;
    this.onCompletionSelectedCallback = onCompletionSelectedCallback || null;
    
    // Generate model display names
    this.modelDisplayNames = models.map((model, index) => {
      return `${MODEL_INFO[model].display_name} ${index + 1}`;
    });
    
    // Check if any model has explore mode enabled
    this.exploreMode = this.isExploreMode();
  }

  public async start(): Promise<void> {
    // Clean up any existing abort controller
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    this.isRunning = true;
    this.currentTurn = 0;
    
    while (this.isRunning && this.currentTurn < this.maxTurns) {
      await this.processTurn();
      this.currentTurn++;
    }
    
    this.outputCallback(
      'System',
      `Conversation ended.`
    );
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    
    // Cancel any in-progress API requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  public pause(): void {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
    }
  }

  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
    }
  }

  public isPausedState(): boolean {
    return this.isPaused;
  }
  
  // Check if any model has explore mode enabled
  private isExploreMode(): boolean {
    return this.models.some((model) => {
      const modelInfo = MODEL_INFO[model];
      return modelInfo.exploreSettings?.enabled;
    });
  }
  
  // Method to select a completion
  public selectCompletion(index: number): void {
    const completion = this.exploreCompletions[index];
    if (completion && this.onCompletionSelectedCallback) {
      this.onCompletionSelectedCallback(completion);
    }
  }
  
  // Method to get explore history
  public getExploreHistory(): ExploreCompletion[][] {
    return this.exploreHistory;
  }

  private async processTurn(): Promise<void> {
    // Create a new AbortController for this turn
    this.abortController = new AbortController();
    
    // Update explore mode status
    this.exploreMode = this.isExploreMode();
    
    // Clear explore completions for this turn
    this.exploreCompletions = [];
    
    for (let i = 0; i < this.models.length; i++) {
      if (!this.isRunning) break;
      
      // Check if conversation is paused before starting a new API request
      // This ensures we don't start new requests while paused
      while (this.isPaused && this.isRunning) {
        // Wait while paused
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // If we're no longer running after pause, break out
      if (!this.isRunning) break;
      
      // Get model info and explore settings
      const modelInfo = MODEL_INFO[this.models[i]];
      const exploreSettings = modelInfo.exploreSettings;
      const useExploreMode = this.exploreMode && exploreSettings?.enabled;
      
      // Create a unique ID for this response
      const responseId = `response-${Date.now()}-${i}`;
      
      try {
        if (useExploreMode) {
          // Explore mode is enabled for this model
          
          // Make API call with n parameter
          const completions = await generateModelResponse(
            modelInfo,
            this.modelDisplayNames[i],
            this.contexts[i],
            this.systemPrompts[i],
            this.apiKeys,
            this.maxOutputLength,
            i, // Pass the model index
            undefined, // No streaming callback in explore mode
            this.abortController.signal, // Pass the abort signal
            exploreSettings.n || 3, // Use n from settings or default to 3
            5 // Request logprobs
          ) as ExploreCompletion[];
          
          // Set model index for each completion
          completions.forEach(completion => {
            completion.modelIndex = i;
            completion.modelName = this.modelDisplayNames[i];
          });
          
          // Add completions to explore completions
          this.exploreCompletions.push(...completions);
          
          // If all models with explore mode enabled have been processed,
          // call the callback to display completions
          const remainingModels = this.models.slice(i + 1).filter((model) => {
            const info = MODEL_INFO[model];
            return info.exploreSettings?.enabled;
          });
          
          if (remainingModels.length === 0 && this.onExploreCompletionsCallback && this.exploreCompletions.length > 0) {
            // Call the callback to display completions
            this.onExploreCompletionsCallback(this.exploreCompletions);
            
            // Pause conversation and wait for user selection
            this.pause();
            
            // Wait for user selection
            await new Promise<void>(resolve => {
              const originalOnCompletionSelected = this.onCompletionSelectedCallback;
              this.onCompletionSelectedCallback = (completion) => {
                // Add selected completion to all contexts
                for (let j = 0; j < this.contexts.length; j++) {
                  const role = j === completion.modelIndex ? 'assistant' : 'user';
                  this.contexts[j].push({ role, content: completion.content });
                }
                
                // Add to conversation output
                this.outputCallback(
                  this.modelDisplayNames[completion.modelIndex],
                  completion.content
                );
                
                // Save explore completions to history
                this.exploreHistory.push([...this.exploreCompletions]);
                
                // Clear explore completions
                this.exploreCompletions = [];
                
                // Resume conversation
                this.resume();
                
                // Restore original callback
                this.onCompletionSelectedCallback = originalOnCompletionSelected;
                
                // Resolve promise
                resolve();
              };
            });
          }
        } else {
          // Regular mode (no explore)
          
          // Initialize empty response with retro cursor
          this.currentResponses.set(responseId, "");
          this.outputCallback(this.modelDisplayNames[i], "█", responseId, false);
          
          // Create streaming callback for this model
          const streamingCallback: StreamingCallback = (chunk: string, isDone: boolean) => {
            if (!this.isRunning) return;
            
            // Get current accumulated response
            let currentResponse = this.currentResponses.get(responseId) || "";
            
            if (isDone) {
              // Final update without cursor
              this.outputCallback(this.modelDisplayNames[i], currentResponse, responseId, false);
            } else {
              // Update with new chunk and cursor
              currentResponse += chunk;
              this.currentResponses.set(responseId, currentResponse);
              
              // Always update the UI with new chunks, even when paused
              // This ensures ongoing API requests continue to display output
              this.outputCallback(this.modelDisplayNames[i], currentResponse + "█", responseId, false);
            }
          };
          
          // Make the API call with streaming and pass the abort signal
          const response = await generateModelResponse(
            modelInfo,
            this.modelDisplayNames[i],
            this.contexts[i],
            this.systemPrompts[i],
            this.apiKeys,
            this.maxOutputLength,
            i, // Pass the model index
            streamingCallback, // Pass the streaming callback
            this.abortController.signal // Pass the abort signal
          ) as string;
          
          // Check for conversation end signal
          if (response.includes('^C^C')) {
            const endMessage = `${this.modelDisplayNames[i]} has ended the conversation with ^C^C.`;
            this.outputCallback('System', endMessage);
            this.stop();
            return;
          }
          
          // Add response to all contexts
          for (let j = 0; j < this.contexts.length; j++) {
            const role = j === i ? 'assistant' : 'user';
            this.contexts[j].push({ role, content: response });
          }
          
          // Check if conversation is paused after completing this model's request
          // This ensures we don't immediately proceed to the next model while paused
          while (this.isPaused && this.isRunning) {
            // Wait while paused
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (error) {
        console.error(`Error in turn processing for ${this.modelDisplayNames[i]}:`, error);
        
        // Check if this was a cancelled request
        if (error instanceof Error && error.message === 'Request cancelled') {
          // For cancelled requests, keep the partial output but remove the cursor
          const currentResponse = this.currentResponses.get(responseId) || "";
          this.outputCallback(this.modelDisplayNames[i], currentResponse, responseId, false);
        } else {
          // For other errors, show the error message and stop the conversation
          this.outputCallback(
            'System',
            `Error: Failed to get response from ${this.modelDisplayNames[i]}`,
            responseId,
            false
          );
          this.stop();
        }
      }
    }
    
    // Clean up the abort controller after the turn is complete
    this.abortController = null;
  }
}