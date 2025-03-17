/**
 * Component for displaying conversation output
 */
import { generateDistinctColors, getRgbColor } from '../../utils/ColorGenerator';
import { formatDisplayTime } from '../../utils/FormatUtils';
import { saveToLocalStorage, loadFromLocalStorage } from '../../services/storage/LocalStorageService';

/**
 * Class to manage the conversation output display
 */
export class ConversationOutput {
  private outputElement: HTMLDivElement;
  private colorGenerator = generateDistinctColors();
  private actorColors: Record<string, string> = {};
  private currentFontSize: number;
  private fontSizeSpan: HTMLSpanElement;
  private wordWrapToggle: HTMLInputElement;
  
  /**
   * Creates a new ConversationOutput instance
   * @param outputElement The output container element
   * @param fontSizeSpan The element to display the current font size
   * @param wordWrapToggle The word wrap toggle input
   */
  constructor(
    outputElement: HTMLDivElement,
    fontSizeSpan: HTMLSpanElement,
    wordWrapToggle: HTMLInputElement
  ) {
    this.outputElement = outputElement;
    this.fontSizeSpan = fontSizeSpan;
    this.wordWrapToggle = wordWrapToggle;
    
    // Initialize font size from local storage
    const savedFontSize = loadFromLocalStorage('outputFontSize', '14');
    this.currentFontSize = parseInt(savedFontSize);
    this.fontSizeSpan.textContent = `${this.currentFontSize}px`;
    this.outputElement.style.fontSize = `${this.currentFontSize}px`;
    
    // Initialize word wrap from local storage
    const savedWordWrap = loadFromLocalStorage('outputWordWrap', 'true');
    this.wordWrapToggle.checked = savedWordWrap === 'true';
    this.updateWordWrap();
    
    // Set up event listeners
    this.wordWrapToggle.addEventListener('change', () => this.updateWordWrap());
  }
  
  /**
   * Adds a message to the conversation output
   * @param actor The actor name
   * @param content The message content
   * @param elementId Optional ID for the message element
   * @param isLoading Whether this is a loading message
   */
  public addMessage(actor: string, content: string, elementId?: string, isLoading: boolean = false): void {
    // Get or assign color for this actor
    if (!this.actorColors[actor]) {
      this.actorColors[actor] = getRgbColor(this.colorGenerator.next());
    }
    
    // Format current timestamp
    const timestamp = formatDisplayTime();
    
    // If elementId is provided, try to update existing element
    if (elementId) {
      const existingMessage = document.getElementById(elementId);
      if (existingMessage) {
        const contentDiv = existingMessage.querySelector('.response-content');
        if (contentDiv) {
          // Update content
          contentDiv.textContent = content;
          
          // Scroll to bottom
          this.outputElement.scrollTop = this.outputElement.scrollHeight;
          return;
        }
      }
    }
    
    // Create new message element
    const messageDiv = document.createElement('div');
    messageDiv.className = 'actor-response';
    if (elementId) {
      messageDiv.id = elementId;
    }
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'actor-header';
    headerDiv.textContent = `### ${actor} [${timestamp}] ###`;
    headerDiv.style.color = this.actorColors[actor];
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'response-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    this.outputElement.appendChild(messageDiv);
    
    // Scroll to bottom
    this.outputElement.scrollTop = this.outputElement.scrollHeight;
  }
  
  /**
   * Clears all messages from the output
   */
  public clearMessages(): void {
    this.outputElement.innerHTML = '';
  }
  
  /**
   * Increases the font size
   */
  public increaseFontSize(): void {
    if (this.currentFontSize < 32) {
      this.currentFontSize += 2;
      this.updateFontSize();
    }
  }
  
  /**
   * Decreases the font size
   */
  public decreaseFontSize(): void {
    if (this.currentFontSize > 8) {
      this.currentFontSize -= 2;
      this.updateFontSize();
    }
  }
  
  /**
   * Updates the font size display and saves to local storage
   */
  private updateFontSize(): void {
    this.fontSizeSpan.textContent = `${this.currentFontSize}px`;
    this.outputElement.style.fontSize = `${this.currentFontSize}px`;
    saveToLocalStorage('outputFontSize', this.currentFontSize.toString());
  }
  
  /**
   * Updates the word wrap setting and saves to local storage
   */
  private updateWordWrap(): void {
    this.outputElement.style.whiteSpace = this.wordWrapToggle.checked ? 'pre-wrap' : 'pre';
    saveToLocalStorage('outputWordWrap', this.wordWrapToggle.checked.toString());
  }
  
  /**
   * Exports the conversation to a text file
   */
  public exportConversation(): void {
    const conversationText = Array.from(this.outputElement.children)
      .map(child => {
        const header = child.querySelector('.actor-header')?.textContent || '';
        const content = child.querySelector('.response-content')?.textContent || '';
        return `${header}\n${content}\n`;
      })
      .join('\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Include date in the filename
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  /**
   * Loads a conversation from text
   * @param text The conversation text
   */
  public loadConversation(text: string): void {
    // Clear existing conversation
    this.clearMessages();
    
    try {
      // Use regex to find all message blocks
      // Each message starts with a header line "### Actor [timestamp] ###"
      const messageRegex = /### (.*?) \[(.*?)\] ###\n([\s\S]*?)(?=\n### |$)/g;
      let match;
      
      while ((match = messageRegex.exec(text)) !== null) {
        const actor = match[1];
        const timestamp = match[2];
        const content = match[3].trim();
        
        if (content) {
          // Add the message to the UI
          this.addMessage(actor, content);
        }
      }
      
      // Add a system message indicating successful load
      this.addMessage('System', 'Conversation loaded successfully.');
    } catch (error) {
      console.error('Error parsing conversation:', error);
      this.addMessage('System', `Error loading conversation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}