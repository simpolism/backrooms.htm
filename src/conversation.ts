import {
  Message,
  ApiKeys,
  ModelInfo,
  StreamingCallback,
  ExploreModeSettings,
  ExploreStreamingCallback,
  ParallelResponse,
  SelectionCallback
} from './types';
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
  seed?: number
): Promise<string> {
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
      abortSignal,
      seed
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
      abortSignal,
      seed
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
  private seed?: number; // Optional seed for deterministic responses
  private currentTurn: number = 0;
  private currentResponses: Map<string, string> = new Map(); // Track responses for each model
  private abortController: AbortController | null = null; // For cancelling API requests
  
  // Explore mode properties
  private exploreModeSettings: ExploreModeSettings;
  private selectionCallback: SelectionCallback | null = null;
  private isExploreMode: boolean = false;
  private parallelResponses: Map<string, ParallelResponse> = new Map(); // Track parallel responses for explore mode
  private selectedResponseId: string | null = null; // Track which response was selected
  private exploreAbortControllers: Map<string, AbortController> = new Map(); // For cancelling parallel requests

  constructor(
    models: string[],
    systemPrompts: (string | null)[],
    contexts: Message[][],
    apiKeys: ApiKeys,
    maxTurns: number = Infinity,
    maxOutputLength: number = 1024,
    outputCallback: (actor: string, response: string, elementId?: string, isLoading?: boolean) => void,
    seed?: number,
    exploreModeSettings: ExploreModeSettings = {},
    selectionCallback: SelectionCallback | null = null
  ) {
    this.models = models;
    this.systemPrompts = systemPrompts;
    this.contexts = contexts;
    this.apiKeys = apiKeys;
    this.maxTurns = maxTurns;
    this.maxOutputLength = maxOutputLength;
    this.outputCallback = outputCallback;
    this.seed = seed;
    this.exploreModeSettings = exploreModeSettings;
    this.selectionCallback = selectionCallback;
    
    // Generate model display names
    this.modelDisplayNames = models.map((model, index) => {
      return `${MODEL_INFO[model].display_name} ${index + 1}`;
    });
    
    // Check if explore mode is enabled for any model
    this.isExploreMode = Object.values(exploreModeSettings).some(setting => setting.enabled);
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
  
  /**
   * Handles selection of a response in explore mode
   * @param responseId The ID of the selected response
   */
  public handleSelection(responseId: string): void {
    // Check if the response exists
    if (!this.parallelResponses.has(responseId)) {
      console.error(`Response with ID ${responseId} not found`);
      return;
    }
    
    // Mark this response as selected
    this.selectedResponseId = responseId;
    
    // Update all responses to reflect selection
    for (const [id, response] of this.parallelResponses.entries()) {
      const isSelected = id === responseId;
      this.parallelResponses.set(id, {
        ...response,
        isSelected
      });
      
      // Cancel all other requests
      if (!isSelected && this.exploreAbortControllers.has(id)) {
        this.exploreAbortControllers.get(id)?.abort();
        this.exploreAbortControllers.delete(id);
      }
    }
    
    // Notify the selection callback if provided
    if (this.selectionCallback) {
      this.selectionCallback(responseId);
    }
  }
  
  /**
   * Creates a streaming callback for explore mode
   * @param responseId The ID of the response
   * @returns A streaming callback function
   */
  private createExploreStreamingCallback(responseId: string): StreamingCallback {
    return (chunk: string, isDone: boolean) => {
      if (!this.isRunning) {
        return;
      }
      
      // Get current response
      const response = this.parallelResponses.get(responseId);
      if (!response) {
        return;
      }
      
      // Update content
      const updatedContent = response.content + chunk;
      
      // Update response in map
      this.parallelResponses.set(responseId, {
        ...response,
        content: updatedContent,
        isComplete: isDone
      });
      
      // Extract model index and option number from responseId
      // Format is "explore-timestamp-modelIndex-optionNumber"
      const parts = responseId.split('-');
      let modelIndex = 0;
      let optionNumber = 0;
      
      if (parts.length >= 4) {
        try {
          modelIndex = parseInt(parts[2]);
          optionNumber = parseInt(parts[3]);
        } catch (e) {
          console.error("Error parsing responseId parts:", e);
        }
      }
      
      const modelName = modelIndex < this.modelDisplayNames.length ?
        this.modelDisplayNames[modelIndex] :
        `Model ${modelIndex + 1}`;
      
      this.outputCallback(
        `${modelName} (Option ${optionNumber + 1})`,
        updatedContent,
        responseId,
        false
      );
      
      // If this is the selected response and we have a selection callback, notify it
      if (response.isSelected && this.selectionCallback) {
        this.selectionCallback(responseId);
      }
    };
  }
  
  /**
   * Makes parallel requests for explore mode
   * @param modelIndex The index of the model
   * @returns The selected response content
   */
  private async makeParallelRequests(modelIndex: number): Promise<string> {
    const modelKey = this.models[modelIndex];
    const modelInfo = MODEL_INFO[modelKey];
    const modelName = this.modelDisplayNames[modelIndex];
    const exploreSetting = this.exploreModeSettings[modelIndex];
    
    if (!exploreSetting || !exploreSetting.enabled) {
      throw new Error(`Explore mode is not enabled for model ${modelName}`);
    }
    
    const numRequests = exploreSetting.numRequests;
    
    // Clear the explore mode outputs container by sending a special message
    // This ensures the UI is cleared before new parallel requests start
    const clearContainerId = `clear-explore-outputs-${Date.now()}`;
    this.outputCallback(
      'System',
      'clear-explore-outputs',
      clearContainerId,
      true
    );
    
    // Reset parallel responses and selected response
    this.parallelResponses.clear();
    this.selectedResponseId = null;
    
    // Clear any existing abort controllers
    for (const controller of this.exploreAbortControllers.values()) {
      controller.abort();
    }
    this.exploreAbortControllers.clear();
    
    // Create promises for parallel requests
    const requestPromises: Promise<void>[] = [];
    
    // Create parallel responses
    for (let i = 0; i < numRequests; i++) {
      const responseId = `explore-${Date.now()}-${modelIndex}-${i}`;
      
      // Initialize response
      this.parallelResponses.set(responseId, {
        id: responseId,
        content: "",
        isSelected: false,
        isComplete: false
      });
      
      // Create abort controller for this request
      const abortController = new AbortController();
      this.exploreAbortControllers.set(responseId, abortController);
      
      // Create streaming callback
      const streamingCallback = this.createExploreStreamingCallback(responseId);
      
      // Make the request
      const requestPromise = generateModelResponse(
        modelInfo,
        `${modelName} (Option ${i + 1})`,
        this.contexts[modelIndex],
        this.systemPrompts[modelIndex],
        this.apiKeys,
        this.maxOutputLength,
        modelIndex,
        streamingCallback,
        abortController.signal,
        this.seed ? this.seed + i : undefined // Use different seeds for diversity
      ).then(response => {
        // Mark as complete
        const currentResponse = this.parallelResponses.get(responseId);
        if (currentResponse) {
          this.parallelResponses.set(responseId, {
            ...currentResponse,
            content: response,
            isComplete: true
          });
        }
        
        // If this is the selected response and we have a selection callback, notify it
        if (currentResponse?.isSelected && this.selectionCallback) {
          this.selectionCallback(responseId);
        }
      }).catch(error => {
        console.error(`Error in parallel request ${i} for ${modelName}:`, error);

        // If this was a cancelled request, just log it
        if (error instanceof Error && error.message === 'Request cancelled') {
          console.log(`Request ${i} for ${modelName} was cancelled`);
        } else {
          // For other errors, update the response with an error message
          const currentResponse = this.parallelResponses.get(responseId);
          if (currentResponse) {
            this.parallelResponses.set(responseId, {
              ...currentResponse,
              content: `Error: ${error instanceof Error ? error.message : String(error)}`,
              isComplete: true
            });
            
            // If this is the selected response and we have a selection callback, notify it
            if (currentResponse.isSelected && this.selectionCallback) {
              this.selectionCallback(responseId);
            }
          }
        }
      });
      
      requestPromises.push(requestPromise);
    }
    
    // Wait for user to select a response
    return new Promise<string>((resolve, reject) => {
      // Create a function to check if a response has been selected
      const checkSelection = () => {
        if (this.selectedResponseId) {
          const selectedResponse = this.parallelResponses.get(this.selectedResponseId);
          if (selectedResponse) {
            resolve(selectedResponse.content);
          } else {
            console.error("Selected response not found in parallelResponses map");
            reject(new Error('Selected response not found'));
          }
        } else if (!this.isRunning) {
          reject(new Error('Conversation stopped'));
        } else {
          // Check again in 200ms
          setTimeout(checkSelection, 200);
        }
      };
      
      // Start checking for selection
      checkSelection();
    });
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
      
      // Check if explore mode is enabled for this model
      const exploreSetting = this.exploreModeSettings[i];
      const isExploreEnabled = exploreSetting && exploreSetting.enabled;
      
      try {
        let response: string;
        
        if (isExploreEnabled) {
          // Use explore mode with parallel requests
          response = await this.makeParallelRequests(i);
          
          // Add the selected response to the conversation output
          this.outputCallback(
            this.modelDisplayNames[i],
            response,
            undefined,
            false
          );
        } else {
          // Create a unique ID for this response
          const responseId = `response-${Date.now()}-${i}`;
          
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
          response = await generateModelResponse(
            MODEL_INFO[this.models[i]],
            this.modelDisplayNames[i],
            this.contexts[i],
            this.systemPrompts[i],
            this.apiKeys,
            this.maxOutputLength,
            i, // Pass the model index
            streamingCallback, // Pass the streaming callback
            this.abortController.signal, // Pass the abort signal
            this.seed // Pass the seed if provided
          );
        }
        
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
        // Check if this was a cancelled request
        if (error instanceof Error && error.message === 'Request cancelled') {
          // For cancelled requests, just ignore it
        } else {
          // For other errors, show the error message and stop the conversation
          this.outputCallback(
            'System',
            `Error: Failed to get response from ${this.modelDisplayNames[i]}: ${error instanceof Error ? error.message : String(error)}`,
            undefined,
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