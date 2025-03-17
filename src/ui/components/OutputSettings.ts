/**
 * Component for managing output settings
 */
import { saveToLocalStorage, loadFromLocalStorage } from '../../services/storage/LocalStorageService';
import { createToggleSwitch } from '../../ui/UIHelpers';

/**
 * Storage keys for output settings
 */
const MAX_OUTPUT_LENGTH_KEY = 'maxOutputLength';

/**
 * Class to manage output settings
 */
export class OutputSettings {
  private maxOutputLengthInput: HTMLInputElement;
  private decreaseFontSizeBtn: HTMLButtonElement;
  private increaseFontSizeBtn: HTMLButtonElement;
  private conversationOutput: HTMLDivElement;
  private exportButton: HTMLButtonElement;
  private loadButton: HTMLButtonElement;
  private loadFileInput: HTMLInputElement;
  private onExport: () => void;
  private onLoad: (content: string) => void;
  
  /**
   * Creates a new OutputSettings instance
   * @param maxOutputLengthInput The max output length input
   * @param decreaseFontSizeBtn The decrease font size button
   * @param increaseFontSizeBtn The increase font size button
   * @param conversationOutput The conversation output element
   * @param exportButton The export button
   * @param onExport Callback for export button click
   * @param onLoad Callback for load file
   */
  constructor(
    maxOutputLengthInput: HTMLInputElement,
    decreaseFontSizeBtn: HTMLButtonElement,
    increaseFontSizeBtn: HTMLButtonElement,
    conversationOutput: HTMLDivElement,
    exportButton: HTMLButtonElement,
    onExport: () => void,
    onLoad: (content: string) => void
  ) {
    this.maxOutputLengthInput = maxOutputLengthInput;
    this.decreaseFontSizeBtn = decreaseFontSizeBtn;
    this.increaseFontSizeBtn = increaseFontSizeBtn;
    this.conversationOutput = conversationOutput;
    this.exportButton = exportButton;
    this.onExport = onExport;
    this.onLoad = onLoad;
    
    // Create load button and file input
    this.loadButton = document.createElement('button');
    this.loadButton.id = 'load-conversation';
    this.loadButton.textContent = 'Select Conversation File';
    this.loadButton.className = 'control-button';
    
    // Create hidden file input for loading conversation
    this.loadFileInput = document.createElement('input');
    this.loadFileInput.type = 'file';
    this.loadFileInput.id = 'load-conversation-file';
    this.loadFileInput.accept = '.txt';
    this.loadFileInput.style.display = 'none';
    
    // Add load file input to the document body
    document.body.appendChild(this.loadFileInput);
    
    // Find the output settings section to add the load button
    const outputSettingsContent = document.querySelector('.output-settings .collapsible-content');
    if (outputSettingsContent) {
      // Create a container for the load button similar to other output settings
      const loadButtonGroup = document.createElement('div');
      loadButtonGroup.className = 'output-setting-group';
      
      // Create a label for the load button
      const loadButtonLabel = document.createElement('label');
      loadButtonLabel.textContent = 'Load Conversation:';
      
      // Add the elements to the DOM
      loadButtonGroup.appendChild(loadButtonLabel);
      loadButtonGroup.appendChild(this.loadButton);
      outputSettingsContent.appendChild(loadButtonGroup);
    } else {
      // Fallback if output settings section not found
      exportButton.parentNode?.insertBefore(this.loadButton, exportButton.nextSibling);
    }
    
    // Initialize settings
    this.initialize();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Initializes output settings
   */
  private initialize(): void {
    // Load saved max output length
    this.maxOutputLengthInput.value = loadFromLocalStorage(MAX_OUTPUT_LENGTH_KEY, '512');
  }
  
  /**
   * Sets up event listeners
   */
  private setupEventListeners(): void {
    // Save max output length when changed and enforce limits
    this.maxOutputLengthInput.addEventListener('change', () => {
      let value = parseInt(this.maxOutputLengthInput.value);
      // Ensure the value is within the valid range
      value = Math.max(1, Math.min(value, 1024));
      this.maxOutputLengthInput.value = value.toString();
      saveToLocalStorage(MAX_OUTPUT_LENGTH_KEY, value.toString());
    });
    
    // Font size control event handlers
    this.decreaseFontSizeBtn.addEventListener('click', () => {
      // The actual font size change is handled by the ConversationOutput component
    });
    
    this.increaseFontSizeBtn.addEventListener('click', () => {
      // The actual font size change is handled by the ConversationOutput component
    });
    
    // Handle export conversation button
    this.exportButton.addEventListener('click', () => {
      this.onExport();
    });
    
    // Handle load conversation button
    this.loadButton.addEventListener('click', () => {
      this.loadFileInput.click();
    });
    
    // Handle file selection for loading conversation
    this.loadFileInput.addEventListener('change', (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      const file = files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        this.onLoad(content);
      };
      
      reader.onerror = () => {
        console.error('Error: Failed to read the file.');
      };
      
      reader.readAsText(file);
      
      // Reset file input
      this.loadFileInput.value = '';
    });
  }
  
  /**
   * Gets the maximum output length
   * @returns The maximum output length
   */
  public getMaxOutputLength(): number {
    return parseInt(this.maxOutputLengthInput.value) || 512;
  }
  
  /**
   * Enables or disables the output settings controls
   * @param enabled Whether the controls should be enabled
   */
  public setControlsEnabled(enabled: boolean): void {
    this.maxOutputLengthInput.disabled = !enabled;
    this.loadButton.disabled = !enabled;
    this.exportButton.style.display = enabled ? 'block' : 'none';
  }
}