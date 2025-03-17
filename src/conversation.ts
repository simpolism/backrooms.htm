import { Message, ApiKeys, ModelInfo, StreamingCallback } from './types';
import { MODEL_INFO } from './models';
import { generateModelResponse } from './api';

export class Conversation {
  private models: string[];
  private modelDisplayNames: string[];
  private systemPrompts: (string | null)[];
  private contexts: Message[][];
  private apiKeys: ApiKeys;
  private outputCallback: (actor: string, response: string, elementId?: string, isLoading?: boolean) => void;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private maxTurns: number;
  private maxOutputLength: number;
  private currentTurn: number = 0;
  private currentResponses: Map<string, string> = new Map();
  private abortController: AbortController | null = null;

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
          MODEL_INFO[this.models[i]],
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