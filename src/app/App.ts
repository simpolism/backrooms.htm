/**
 * Main application entry point
 */
import { appState, AppState } from './AppState';
import { eventBus, EventType } from './AppEvents';
import { ApiKeys } from '../types';
import { Conversation } from '../models/ConversationManager';
import { loadTemplate } from '../services/templates/TemplateProcessor';
import { validateRequiredApiKeys } from '../models/ModelConfig';
import { initializeCollapsibleSections } from '../ui/components/CollapsibleSection';
import { ConversationOutput } from '../ui/components/ConversationOutput';
import { ModelSelector } from '../ui/components/ModelSelector';
import { TemplateSelector } from '../ui/components/TemplateSelector';
import { ApiKeyManager } from '../ui/components/ApiKeyManager';
import { OutputSettings } from '../ui/components/OutputSettings';
import { TemplateEditor } from '../ui/components/TemplateEditor';

/**
 * Main application class
 */
export class App {
  // UI components
  private conversationOutput!: ConversationOutput;
  private modelSelector!: ModelSelector;
  private templateSelector!: TemplateSelector;
  private apiKeyManager!: ApiKeyManager;
  private outputSettings!: OutputSettings;
  private templateEditor!: TemplateEditor;
  
  // UI elements
  private startButton!: HTMLButtonElement;
  private pauseButton!: HTMLButtonElement;
  private resumeButton!: HTMLButtonElement;
  private maxTurnsInput!: HTMLInputElement;
  
  /**
   * Creates a new App instance
   */
  constructor() {
    // Initialize UI elements
    this.startButton = document.getElementById('start-conversation') as HTMLButtonElement;
    this.pauseButton = document.getElementById('pause-conversation') as HTMLButtonElement;
    this.resumeButton = document.getElementById('resume-conversation') as HTMLButtonElement;
    this.maxTurnsInput = document.getElementById('max-turns') as HTMLInputElement;
    
    // Initialize UI components
    this.initializeComponents();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Initializes UI components
   */
  private initializeComponents(): void {
    // Initialize collapsible sections
    initializeCollapsibleSections();
    
    // Initialize conversation output
    const conversationOutputElement = document.getElementById('conversation-output') as HTMLDivElement;
    const currentFontSizeSpan = document.getElementById('current-font-size') as HTMLSpanElement;
    const wordWrapToggle = document.getElementById('word-wrap-toggle') as HTMLInputElement;
    
    this.conversationOutput = new ConversationOutput(
      conversationOutputElement,
      currentFontSizeSpan,
      wordWrapToggle
    );
    
    // Initialize API key manager
    const hyperbolicKeyInput = document.getElementById('hyperbolic-key') as HTMLInputElement;
    const openrouterKeyInput = document.getElementById('openrouter-key') as HTMLInputElement;
    const openrouterOAuthButton = document.getElementById('openrouter-oauth-button') as HTMLButtonElement;
    
    this.apiKeyManager = new ApiKeyManager(
      hyperbolicKeyInput,
      openrouterKeyInput,
      openrouterOAuthButton,
      this.handleApiKeysChange.bind(this)
    );
    
    // Initialize template selector
    const templateSelect = document.getElementById('template-select') as HTMLSelectElement;
    
    this.templateSelector = new TemplateSelector(
      templateSelect,
      this.handleTemplateChange.bind(this)
    );
    
    // Initialize model selector
    const modelInputs = document.getElementById('model-inputs') as HTMLDivElement;
    
    this.modelSelector = new ModelSelector(
      modelInputs,
      this.apiKeyManager.getApiKeys(),
      this.handleModelSelectionChange.bind(this)
    );
    
    // Initialize output settings
    const maxOutputLengthInput = document.getElementById('max-output-length') as HTMLInputElement;
    const decreaseFontSizeBtn = document.getElementById('decrease-font-size') as HTMLButtonElement;
    const increaseFontSizeBtn = document.getElementById('increase-font-size') as HTMLButtonElement;
    const exportButton = document.getElementById('export-conversation') as HTMLButtonElement;
    
    this.outputSettings = new OutputSettings(
      maxOutputLengthInput,
      decreaseFontSizeBtn,
      increaseFontSizeBtn,
      conversationOutputElement,
      exportButton,
      this.handleExportConversation.bind(this),
      this.handleLoadConversation.bind(this)
    );
    
    // Initialize template editor
    const templateEditorForm = document.getElementById('template-editor-form') as HTMLDivElement;
    const templateNameInput = document.getElementById('template-name') as HTMLInputElement;
    const templateDescriptionInput = document.getElementById('template-description') as HTMLInputElement;
    const templateContentTextarea = document.getElementById('template-content') as HTMLTextAreaElement;
    const saveTemplateBtn = document.getElementById('save-template') as HTMLButtonElement;
    const exportTemplateBtn = document.getElementById('export-template') as HTMLButtonElement;
    const clearCustomTemplateBtn = document.getElementById('clear-custom-template') as HTMLButtonElement;
    const cancelEditBtn = document.getElementById('cancel-edit') as HTMLButtonElement;
    
    this.templateEditor = new TemplateEditor(
      templateEditorForm,
      templateNameInput,
      templateDescriptionInput,
      templateContentTextarea,
      saveTemplateBtn,
      exportTemplateBtn,
      clearCustomTemplateBtn,
      cancelEditBtn,
      this.handleTemplateEditorChange.bind(this)
    );
    
    // Initialize template selector
    this.templateSelector.initialize();
  }
  
  /**
   * Sets up event listeners
   */
  private setupEventListeners(): void {
    // Button event listeners
    this.startButton.addEventListener('click', this.handleStartStopButton.bind(this));
    this.pauseButton.addEventListener('click', this.handlePauseButton.bind(this));
    this.resumeButton.addEventListener('click', this.handleResumeButton.bind(this));
    
    // Edit template button
    const editCurrentTemplateBtn = document.getElementById('edit-current-template') as HTMLButtonElement;
    editCurrentTemplateBtn.addEventListener('click', () => {
      this.templateEditor.showEditor(this.templateSelector.getSelectedTemplate());
    });
    
    // Import template button
    const importTemplateBtn = document.getElementById('import-template') as HTMLButtonElement;
    const templateFileInput = document.getElementById('template-file-input') as HTMLInputElement;
    
    importTemplateBtn.addEventListener('click', () => {
      templateFileInput.click();
    });
    
    templateFileInput.addEventListener('change', (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      this.templateEditor.loadFromFile(files[0]);
      
      // Reset file input
      templateFileInput.value = '';
    });
    
    // Edit custom template button
    const editCustomTemplateBtn = document.getElementById('edit-custom-template') as HTMLButtonElement;
    if (editCustomTemplateBtn) {
      editCustomTemplateBtn.addEventListener('click', () => {
        this.templateEditor.showEditor('custom');
      });
    }
    
    // Event bus listeners
    eventBus.on(EventType.CONVERSATION_COMPLETE, () => {
      this.handleConversationComplete();
    });
  }
  
  /**
   * Handles API keys change
   * @param apiKeys The new API keys
   */
  private handleApiKeysChange(apiKeys: ApiKeys): void {
    appState.updateApiKeys(apiKeys);
    this.modelSelector.updateApiKeys(apiKeys);
  }
  
  /**
   * Handles template change
   * @param templateName The new template name
   * @param modelCount The number of models required
   */
  private handleTemplateChange(templateName: string, modelCount: number): void {
    appState.setTemplateModelCount(modelCount);
    this.modelSelector.updateModelInputs(modelCount);
  }
  
  /**
   * Handles model selection change
   */
  private handleModelSelectionChange(): void {
    // Nothing to do here for now
  }
  
  /**
   * Handles template editor change
   */
  private handleTemplateEditorChange(): void {
    this.templateSelector.updateCustomTemplateOption();
  }
  
  /**
   * Handles export conversation
   */
  private handleExportConversation(): void {
    this.conversationOutput.exportConversation();
  }
  
  /**
   * Handles load conversation
   * @param content The conversation content
   */
  private handleLoadConversation(content: string): void {
    this.conversationOutput.loadConversation(content);
  }
  
  /**
   * Handles start/stop button click
   */
  private handleStartStopButton(): void {
    const state = appState.getState();
    
    if (state.isConversationRunning) {
      this.stopConversation();
    } else {
      this.startConversation();
    }
  }
  
  /**
   * Handles pause button click
   */
  private handlePauseButton(): void {
    const state = appState.getState();
    
    if (state.activeConversation && state.isConversationRunning) {
      state.activeConversation.pause();
      
      // Update UI
      this.pauseButton.style.display = 'none';
      this.resumeButton.style.display = 'inline-block';
      
      // Update state
      appState.setConversationPaused(true);
    }
  }
  
  /**
   * Handles resume button click
   */
  private handleResumeButton(): void {
    const state = appState.getState();
    
    if (state.activeConversation && state.isConversationRunning) {
      state.activeConversation.resume();
      
      // Update UI
      this.pauseButton.style.display = 'inline-block';
      this.resumeButton.style.display = 'none';
      
      // Update state
      appState.setConversationPaused(false);
    }
  }
  
  /**
   * Starts a conversation
   */
  private async startConversation(): Promise<void> {
    // Hide export button when starting a new conversation
    this.outputSettings.setControlsEnabled(false);
    
    // Clear previous output
    this.conversationOutput.clearMessages();
    
    // Get selected models
    const models = this.modelSelector.getSelectedModels();
    
    // Get template
    const templateName = this.templateSelector.getSelectedTemplate();
    
    // Get max turns
    const maxTurns = this.maxTurnsInput.value ? parseInt(this.maxTurnsInput.value) : Infinity;
    
    // Get max output length
    const maxOutputLength = this.outputSettings.getMaxOutputLength();
    
    // Get API keys
    const apiKeys = this.apiKeyManager.getApiKeys();
    
    // Validate required API keys
    const validation = validateRequiredApiKeys(models, apiKeys);
    if (!validation.valid) {
      this.conversationOutput.addMessage('System', `Error: Missing required API key(s): ${validation.missingKeys.join(', ')}`);
      return;
    }
    
    try {
      // Update UI to show we're in conversation mode
      this.startButton.textContent = 'Stop Conversation';
      this.startButton.classList.add('stop');
      this.pauseButton.style.display = 'inline-block';
      
      // Update state
      appState.setConversationRunning(true);
      
      // Verify template exists and has the correct number of models
      try {
        if (appState.getState().currentTemplateModelCount !== models.length) {
          throw new Error(`Invalid template: Number of models (${models.length}) does not match the number of elements in the template (${appState.getState().currentTemplateModelCount})`);
        }
      } catch (error) {
        throw new Error(`Invalid template: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Load template config
      const configs = await loadTemplate(templateName, models);
      
      // Extract system prompts and contexts
      const systemPrompts = configs.map(config => config.system_prompt || null);
      const contexts = configs.map(config => config.context || []);
      
      // Start conversation
      const conversation = new Conversation(
        models,
        systemPrompts,
        contexts,
        apiKeys,
        maxTurns,
        maxOutputLength,
        this.addOutputMessage.bind(this)
      );
      
      // Update state
      appState.setActiveConversation(conversation);
      
      this.conversationOutput.addMessage('System', `Starting conversation with template "${templateName}"...`);
      await conversation.start();
      
      // Conversation ended naturally
      this.handleConversationComplete();
    } catch (error) {
      console.error('Error starting conversation:', error);
      this.conversationOutput.addMessage('System', `Error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Reset UI on error
      this.handleConversationComplete();
    }
  }
  
  /**
   * Stops the active conversation
   */
  private stopConversation(): void {
    const state = appState.getState();
    
    if (state.activeConversation) {
      state.activeConversation.stop();
      this.conversationOutput.addMessage('System', 'Conversation stopped by user.');
      
      this.handleConversationComplete();
    }
  }
  
  /**
   * Handles conversation completion
   */
  private handleConversationComplete(): void {
    // Update state
    appState.setConversationRunning(false);
    appState.setConversationPaused(false);
    
    // Update UI
    this.startButton.textContent = 'Start Conversation';
    this.startButton.classList.remove('stop');
    this.pauseButton.style.display = 'none';
    this.resumeButton.style.display = 'none';
    
    // Re-enable controls
    this.outputSettings.setControlsEnabled(true);
  }
  
  /**
   * Adds a message to the conversation output
   * @param actor The actor name
   * @param response The message content
   * @param elementId Optional element ID
   * @param isLoading Whether this is a loading message
   */
  private addOutputMessage(actor: string, response: string, elementId?: string, isLoading: boolean = false): void {
    this.conversationOutput.addMessage(actor, response, elementId, isLoading);
  }
}

/**
 * Initialize the application when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
  new App();
});