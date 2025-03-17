/**
 * Component for managing API keys
 */
import { ApiKeys } from '../../types';
import { saveToLocalStorage, loadFromLocalStorage } from '../../services/storage/LocalStorageService';
import { initiateOAuthFlow, handleOAuthCallback, getAuthorizationCode } from '../../services/auth/OAuthService';
import { createMessageContainer, showTemporaryMessage } from '../../ui/UIHelpers';

/**
 * Storage keys for API keys
 */
const HYPERBOLIC_API_KEY = 'hyperbolicApiKey';
const OPENROUTER_API_KEY = 'openrouterApiKey';

/**
 * Class to manage API keys
 */
export class ApiKeyManager {
  private hyperbolicKeyInput: HTMLInputElement;
  private openrouterKeyInput: HTMLInputElement;
  private openrouterOAuthButton: HTMLButtonElement;
  private openrouterAuthContainer: HTMLDivElement;
  private onApiKeysChange: (apiKeys: ApiKeys) => void;
  
  /**
   * Creates a new ApiKeyManager instance
   * @param hyperbolicKeyInput The Hyperbolic API key input
   * @param openrouterKeyInput The OpenRouter API key input
   * @param openrouterOAuthButton The OpenRouter OAuth button
   * @param onApiKeysChange Callback for API key changes
   */
  constructor(
    hyperbolicKeyInput: HTMLInputElement,
    openrouterKeyInput: HTMLInputElement,
    openrouterOAuthButton: HTMLButtonElement,
    onApiKeysChange: (apiKeys: ApiKeys) => void
  ) {
    this.hyperbolicKeyInput = hyperbolicKeyInput;
    this.openrouterKeyInput = openrouterKeyInput;
    this.openrouterOAuthButton = openrouterOAuthButton;
    this.onApiKeysChange = onApiKeysChange;
    
    // Create a container for OpenRouter auth messages
    this.openrouterAuthContainer = createMessageContainer('auth-message-container');
    
    // Find the parent container of the OAuth button's parent
    // This places the message in a more appropriate location in the hierarchy
    const openrouterOAuthParent = openrouterOAuthButton.closest('.input-group');
    if (openrouterOAuthParent && openrouterOAuthParent.parentElement) {
      // Insert after the input group containing the OAuth button
      openrouterOAuthParent.parentElement.insertBefore(
        this.openrouterAuthContainer,
        openrouterOAuthParent.nextSibling
      );
    }
    
    // Load saved API keys
    this.loadApiKeys();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Check for OAuth callback
    this.checkForOAuthCallback();
  }
  
  /**
   * Gets the current API keys
   * @returns The current API keys
   */
  public getApiKeys(): ApiKeys {
    return {
      hyperbolicApiKey: this.hyperbolicKeyInput.value,
      openrouterApiKey: this.openrouterKeyInput.value
    };
  }
  
  /**
   * Loads saved API keys from local storage
   */
  private loadApiKeys(): void {
    this.hyperbolicKeyInput.value = loadFromLocalStorage(HYPERBOLIC_API_KEY, '');
    this.openrouterKeyInput.value = loadFromLocalStorage(OPENROUTER_API_KEY, '');
  }
  
  /**
   * Sets up event listeners for API key inputs and OAuth button
   */
  private setupEventListeners(): void {
    // Save API keys when changed
    this.hyperbolicKeyInput.addEventListener('change', () => {
      saveToLocalStorage(HYPERBOLIC_API_KEY, this.hyperbolicKeyInput.value);
      this.onApiKeysChange(this.getApiKeys());
    });
    
    this.openrouterKeyInput.addEventListener('change', () => {
      saveToLocalStorage(OPENROUTER_API_KEY, this.openrouterKeyInput.value);
      this.onApiKeysChange(this.getApiKeys());
    });
    
    // Handle OpenRouter OAuth button click
    this.openrouterOAuthButton.addEventListener('click', async () => {
      try {
        // Show loading message
        this.showAuthMessage('Initiating authentication with OpenRouter...', false);
        
        // Start the OAuth flow
        await initiateOAuthFlow();
        // The page will be redirected to OpenRouter, so no need to do anything else here
      } catch (error) {
        console.error('Error initiating OAuth flow:', error);
        this.showAuthMessage(`Error initiating OAuth flow: ${error instanceof Error ? error.message : String(error)}`, true);
      }
    });
  }
  
  /**
   * Checks if this is a callback from OpenRouter OAuth
   */
  private checkForOAuthCallback(): void {
    if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
      // Show initial processing message
      this.showAuthMessage('Processing authentication response...', false, 60000);
      
      // Check for error parameter in URL
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      if (errorParam) {
        // Handle explicit error from OAuth provider
        console.error('OAuth error:', errorParam, errorDescription);
        this.showAuthMessage(
          `Authentication denied: ${errorDescription || errorParam}`,
          true,
          10000
        );
        
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      else if (getAuthorizationCode()) {
        // Handle the OAuth callback for successful code
        handleOAuthCallback(
          // Success callback
          (apiKey) => {
            // Save the API key to localStorage
            saveToLocalStorage(OPENROUTER_API_KEY, apiKey);
            
            // Update the input field
            this.openrouterKeyInput.value = apiKey;
            
            // Notify about API key change
            this.onApiKeysChange(this.getApiKeys());
            
            // Show success message
            this.showAuthMessage('Successfully authenticated with OpenRouter!', false, 8000);
            
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
          },
          // Error callback
          (error) => {
            console.error('Error handling OAuth callback:', error);
            this.showAuthMessage(`Error authenticating with OpenRouter: ${error.message}`, true, 10000);
            
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        );
      }
    }
  }
  
  /**
   * Shows a temporary auth message
   * @param message The message to show
   * @param isError Whether this is an error message
   * @param duration How long to show the message (ms)
   */
  private showAuthMessage(message: string, isError: boolean = false, duration: number = 5000): void {
    showTemporaryMessage(this.openrouterAuthContainer, message, isError, duration);
  }
}