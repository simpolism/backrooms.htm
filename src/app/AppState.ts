/**
 * Manages application state
 */
import { ApiKeys } from '../types';
import { Conversation } from '../models/ConversationManager';
import { loadFromLocalStorage } from '../services/storage/LocalStorageService';

/**
 * Interface for application state
 */
export interface AppState {
  // Conversation state
  activeConversation: Conversation | null;
  isConversationRunning: boolean;
  isPaused: boolean;
  
  // API keys
  apiKeys: ApiKeys;
  
  // Template and model state
  currentTemplateModelCount: number;
  
  // UI state
  currentFontSize: number;
  wordWrapEnabled: boolean;
}

/**
 * Class to manage application state
 */
export class AppStateManager {
  private state: AppState;
  private listeners: Map<string, ((state: AppState) => void)[]> = new Map();
  
  /**
   * Creates a new AppStateManager instance
   */
  constructor() {
    // Initialize state with default values
    this.state = {
      activeConversation: null,
      isConversationRunning: false,
      isPaused: false,
      apiKeys: {
        hyperbolicApiKey: loadFromLocalStorage('hyperbolicApiKey', ''),
        openrouterApiKey: loadFromLocalStorage('openrouterApiKey', '')
      },
      currentTemplateModelCount: 2, // Default to 2 models
      currentFontSize: parseInt(loadFromLocalStorage('outputFontSize', '14')),
      wordWrapEnabled: loadFromLocalStorage('outputWordWrap', 'true') === 'true'
    };
  }
  
  /**
   * Gets the current state
   * @returns The current application state
   */
  public getState(): AppState {
    return { ...this.state };
  }
  
  /**
   * Updates the state
   * @param updates Partial state updates
   */
  public updateState(updates: Partial<AppState>): void {
    // Update state
    this.state = { ...this.state, ...updates };
    
    // Notify listeners
    this.notifyListeners();
  }
  
  /**
   * Adds a listener for state changes
   * @param key Unique key for the listener
   * @param listener The listener function
   */
  public addListener(key: string, listener: (state: AppState) => void): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    
    this.listeners.get(key)?.push(listener);
  }
  
  /**
   * Removes a listener
   * @param key The key of the listener to remove
   */
  public removeListener(key: string): void {
    this.listeners.delete(key);
  }
  
  /**
   * Notifies all listeners of state changes
   */
  private notifyListeners(): void {
    const state = this.getState();
    
    for (const listeners of this.listeners.values()) {
      for (const listener of listeners) {
        listener(state);
      }
    }
  }
  
  /**
   * Sets the active conversation
   * @param conversation The conversation instance
   */
  public setActiveConversation(conversation: Conversation | null): void {
    this.updateState({ activeConversation: conversation });
  }
  
  /**
   * Sets the conversation running state
   * @param isRunning Whether the conversation is running
   */
  public setConversationRunning(isRunning: boolean): void {
    this.updateState({ isConversationRunning: isRunning });
    
    // If stopping, also ensure not paused
    if (!isRunning) {
      this.updateState({ isPaused: false });
    }
  }
  
  /**
   * Sets the conversation paused state
   * @param isPaused Whether the conversation is paused
   */
  public setConversationPaused(isPaused: boolean): void {
    this.updateState({ isPaused });
  }
  
  /**
   * Updates API keys
   * @param apiKeys The new API keys
   */
  public updateApiKeys(apiKeys: ApiKeys): void {
    this.updateState({ apiKeys });
  }
  
  /**
   * Sets the current template model count
   * @param count The number of models
   */
  public setTemplateModelCount(count: number): void {
    this.updateState({ currentTemplateModelCount: count });
  }
  
  /**
   * Updates font size
   * @param size The new font size
   */
  public setFontSize(size: number): void {
    this.updateState({ currentFontSize: size });
  }
  
  /**
   * Updates word wrap setting
   * @param enabled Whether word wrap is enabled
   */
  public setWordWrap(enabled: boolean): void {
    this.updateState({ wordWrapEnabled: enabled });
  }
}

/**
 * Singleton instance of the AppStateManager
 */
export const appState = new AppStateManager();