/**
 * Component for editing templates
 */
import { CustomTemplate } from '../../types';
import { saveCustomTemplate, getCustomTemplate, clearCustomTemplate, validateTemplate, exportTemplate } from '../../services/templates/TemplateService';
import { createMessageContainer, showTemporaryMessage } from '../../ui/UIHelpers';

/**
 * Class to manage template editing
 */
export class TemplateEditor {
  private editorForm: HTMLDivElement;
  private nameInput: HTMLInputElement;
  private descriptionInput: HTMLInputElement;
  private contentTextarea: HTMLTextAreaElement;
  private saveButton: HTMLButtonElement;
  private exportButton: HTMLButtonElement;
  private clearButton: HTMLButtonElement;
  private cancelButton: HTMLButtonElement;
  private errorContainer: HTMLDivElement;
  private onTemplateChange: () => void;
  
  /**
   * Creates a new TemplateEditor instance
   * @param editorForm The editor form container
   * @param nameInput The template name input
   * @param descriptionInput The template description input
   * @param contentTextarea The template content textarea
   * @param saveButton The save button
   * @param exportButton The export button
   * @param clearButton The clear button
   * @param cancelButton The cancel button
   * @param onTemplateChange Callback for template changes
   */
  constructor(
    editorForm: HTMLDivElement,
    nameInput: HTMLInputElement,
    descriptionInput: HTMLInputElement,
    contentTextarea: HTMLTextAreaElement,
    saveButton: HTMLButtonElement,
    exportButton: HTMLButtonElement,
    clearButton: HTMLButtonElement,
    cancelButton: HTMLButtonElement,
    onTemplateChange: () => void
  ) {
    this.editorForm = editorForm;
    this.nameInput = nameInput;
    this.descriptionInput = descriptionInput;
    this.contentTextarea = contentTextarea;
    this.saveButton = saveButton;
    this.exportButton = exportButton;
    this.clearButton = clearButton;
    this.cancelButton = cancelButton;
    this.onTemplateChange = onTemplateChange;
    
    // Create error container
    this.errorContainer = createMessageContainer('template-error-container');
    this.editorForm.appendChild(this.errorContainer);
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Sets up event listeners
   */
  private setupEventListeners(): void {
    // Save template
    this.saveButton.addEventListener('click', () => {
      this.saveTemplate();
    });
    
    // Export template
    this.exportButton.addEventListener('click', () => {
      this.exportTemplate();
    });
    
    // Clear custom template
    this.clearButton.addEventListener('click', () => {
      this.clearCustomTemplate();
    });
    
    // Cancel editing
    this.cancelButton.addEventListener('click', () => {
      this.cancelEditing();
    });
  }
  
  /**
   * Shows the editor with the specified template
   * @param templateId The ID of the template to edit
   */
  public async showEditor(templateId: string): Promise<void> {
    try {
      let templateContent: string;
      let templateName: string;
      let templateDescription: string = '';
      
      if (templateId === 'custom') {
        // Edit existing custom template
        const customTemplate = getCustomTemplate();
        if (customTemplate) {
          templateContent = customTemplate.content;
          templateName = customTemplate.name;
          templateDescription = customTemplate.description || '';
        } else {
          throw new Error('Custom template not found');
        }
      } else {
        // Load built-in template
        const response = await fetch(`./public/templates/${templateId}.jsonl`);
        if (!response.ok) {
          throw new Error(`Template '${templateId}' not found.`);
        }
        templateContent = await response.text();
        templateName = `${templateId} (Custom)`;
      }
      
      // Populate editor form
      this.nameInput.value = templateName;
      this.descriptionInput.value = templateDescription;
      this.contentTextarea.value = templateContent;
      
      // Show editor form
      this.editorForm.style.display = 'block';
    } catch (error) {
      console.error('Error loading template for editing:', error);
      this.showError(`Error loading template: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Shows the editor with content from a file
   * @param file The file to load
   */
  public loadFromFile(file: File): void {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      // Validate JSONL content
      if (this.validateContent(content)) {
        // Populate editor form
        this.nameInput.value = file.name.replace('.jsonl', '');
        this.descriptionInput.value = ''; // Clear description field for imported templates
        this.contentTextarea.value = content;
        
        // Show editor form
        this.editorForm.style.display = 'block';
      }
    };
    
    reader.onerror = () => {
      this.showError('Failed to read the file.');
    };
    
    reader.readAsText(file);
  }
  
  /**
   * Validates template content
   * @param content The content to validate
   * @returns True if valid, false otherwise
   */
  private validateContent(content: string): boolean {
    try {
      if (!validateTemplate(content)) {
        this.showError('Invalid JSONL content. Please check the format.');
        return false;
      }
      return true;
    } catch (error) {
      this.showError('Invalid JSONL file. Please check the file format.');
      return false;
    }
  }
  
  /**
   * Saves the template
   */
  private saveTemplate(): void {
    const name = this.nameInput.value.trim();
    const content = this.contentTextarea.value.trim();
    
    if (!name) {
      this.showError('Template name is required.');
      return;
    }
    
    if (!content) {
      this.showError('Template content is required.');
      return;
    }
    
    // Validate JSONL content
    if (!this.validateContent(content)) {
      return;
    }
    
    // Get description
    const description = this.descriptionInput.value.trim();
    
    // Save custom template
    saveCustomTemplate({
      name,
      description,
      content,
      lastModified: Date.now()
    });
    
    // Update UI
    this.editorForm.style.display = 'none';
    
    // Notify about template change
    this.onTemplateChange();
    
    // Show success message
    this.showError(`Custom template "${name}" saved successfully.`);
  }
  
  /**
   * Exports the template
   */
  private exportTemplate(): void {
    const name = this.nameInput.value.trim() || 'template';
    const content = this.contentTextarea.value.trim();
    
    if (!content) {
      this.showError('No content to export.');
      return;
    }
    
    exportTemplate(name, content);
  }
  
  /**
   * Clears the custom template
   */
  private clearCustomTemplate(): void {
    clearCustomTemplate();
    
    // Notify about template change
    this.onTemplateChange();
    
    // Show success message
    this.showError('Custom template cleared.');
  }
  
  /**
   * Cancels editing
   */
  private cancelEditing(): void {
    this.editorForm.style.display = 'none';
    this.nameInput.value = '';
    this.descriptionInput.value = '';
    this.contentTextarea.value = '';
  }
  
  /**
   * Shows an error message
   * @param message The message to show
   */
  private showError(message: string): void {
    showTemporaryMessage(this.errorContainer, message, false, 5000);
  }
}