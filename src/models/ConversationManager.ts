/**
 * Manages conversations between different models
 */
import { Message, ApiKeys, StreamingCallback } from '../types';
import { getModelInfo } from './ModelRegistry';
import { hyperbolicCompletionConversation } from '../services/api/HyperbolicService';
import { openrouterConversation } from '../services/api/OpenRouterService';
import { loadFromLocalStorage } from '../services/storage/LocalStorageService';

/**
 * Generates a response from a model
 * @param modelKey The key of the model to use
 * @param actor The actor name
 * @param context The conversation context
 * @param systemPrompt The system prompt
 * @param apiKeys API keys for different services
 * @param maxOutputLength Maximum output length
 * @param modelIndex Model index for custom model selection
 * @param onChunk Callback for streaming chunks
 * @param abortSignal Signal to abort the request
 * @returns The generated response
 */
export function generateModelResponse(
  modelKey: string,
  actor: string,
  context: Message[],
  systemPrompt: string | null,
  apiKeys: ApiKeys,
  maxOutputLength: number = 1024,
  modelIndex?: number,
  onChunk?: StreamingCallback,
  abortSignal?: AbortSignal
): Promise<string> {
  // Get model information
  const modelInfo = getModelInfo(modelKey);
  if (!modelInfo) {
    throw new Error(`Model information not found for ${modelKey}`);
  }
  
  // Determine which API to use based on the company
  const company = modelInfo.company;
  
  if (company === 'hyperbolic_completion') {
    return hyperbolicCompletionConversation(
      actor,
      modelInfo.api_name,
      context,
      systemPrompt,
      apiKeys.hyperbolicApiKey,
      maxOutputLength,
      onChunk,
      abortSignal
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
      maxOutputLength,
      onChunk,
      abortSignal
    );
  } else {
    throw new Error(`Unsupported model company: ${company}`);
  }
}

/**
 * Class to manage a conversation between multiple models
 */
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

  /**
   * Creates a new Conversation instance
   * @param models Array of model identifiers
   * @param systemPrompts Array of system prompts for each model
   * @param contexts Array of conversation contexts for each model
   * @param apiKeys API keys for different services
   * @param maxTurns Maximum number of turns
   * @param maxOutputLength Maximum output length
   * @param outputCallback Callback for output messages
   */
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
      const modelInfo = getModelInfo(model);
      return `${modelInfo?.display_name || model} ${index + 1}`;
    });
  }

  /**
   * Starts the conversation
   */
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

  /**
   * Stops the conversation
   */
  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    
    // Cancel any in-progress API requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Pauses the conversation
   */
  public pause(): void {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
    }
  }

  /**
   * Resumes the conversation
   */
  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
    }
  }

  /**
   * Checks if the conversation is paused
   * @returns True if paused, false otherwise
   */
  public isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Processes a single turn of the conversation
   */
  private async processTurn(): Promise<void> {
    // Create a new AbortController for this turn
    this.abortController = new AbortController();
    
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
      
      // Create a unique ID for this response
      const responseId = `response-${Date.now()}-${i}`;
      
      // Initialize empty response with retro cursor
      this.currentResponses.set(responseId, "");
      this.outputCallback(this.modelDisplayNames[i], "█", responseId, false);
      
      try {
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
          this.models[i],
          this.modelDisplayNames[i],
          this.contexts[i],
          this.systemPrompts[i],
          this.apiKeys,
          this.maxOutputLength,
          i, // Pass the model index
          streamingCallback, // Pass the streaming callback
          this.abortController.signal // Pass the abort signal
        );
        
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