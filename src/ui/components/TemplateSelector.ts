/**
 * Component for template selection
 */
import { getAvailableTemplates, getCustomTemplate } from '../../services/templates/TemplateService';
import { getTemplateModelCount } from '../../services/templates/TemplateProcessor';
import { saveToLocalStorage, loadFromLocalStorage } from '../../services/storage/LocalStorageService';

/**
 * Storage key for template selection
 */
const TEMPLATE_SELECTION_KEY = 'templateSelection';

/**
 * Class to manage template selection
 */
export class TemplateSelector {
  private templateSelect: HTMLSelectElement;
  private onTemplateChange: (templateName: string, modelCount: number) => void;
  
  /**
   * Creates a new TemplateSelector instance
   * @param templateSelect The template select element
   * @param onTemplateChange Callback for template changes
   */
  constructor(
    templateSelect: HTMLSelectElement,
    onTemplateChange: (templateName: string, modelCount: number) => void
  ) {
    this.templateSelect = templateSelect;
    this.onTemplateChange = onTemplateChange;
    
    // Set up event listener
    this.templateSelect.addEventListener('change', async () => {
      await this.handleTemplateChange();
    });
  }
  
  /**
   * Initializes the template selector
   */
  public async initialize(): Promise<void> {
    await this.populateTemplateSelect();
    await this.handleTemplateChange();
  }
  
  /**
   * Gets the currently selected template
   * @returns The selected template name
   */
  public getSelectedTemplate(): string {
    return this.templateSelect.value;
  }
  
  /**
   * Populates the template select with available templates
   */
  private async populateTemplateSelect(): Promise<void> {
    try {
      const templates = await getAvailableTemplates();
      this.templateSelect.innerHTML = '';
      
      templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.name;
        // Show both name and description in the dropdown
        option.textContent = template.description ?
          `${template.name} - ${template.description}` :
          template.name;
        this.templateSelect.appendChild(option);
      });
      
      // Check if custom template exists and add it to the dropdown
      const customTemplate = getCustomTemplate();
      if (customTemplate) {
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        // Show both name and description for custom template
        customOption.textContent = customTemplate.description ?
          `Custom: ${customTemplate.name} - ${customTemplate.description}` :
          `Custom: ${customTemplate.name}`;
        this.templateSelect.appendChild(customOption);
      }
      
      // Set selected template if available
      const savedTemplateSelection = loadFromLocalStorage(TEMPLATE_SELECTION_KEY, '');
      if (savedTemplateSelection) {
        // Check if the saved selection exists in the options
        let selectionExists = false;
        for (let i = 0; i < this.templateSelect.options.length; i++) {
          if (this.templateSelect.options[i].value === savedTemplateSelection) {
            selectionExists = true;
            break;
          }
        }
        
        if (selectionExists) {
          this.templateSelect.value = savedTemplateSelection;
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      throw error;
    }
  }
  
  /**
   * Handles template change events
   */
  private async handleTemplateChange(): Promise<void> {
    const selectedTemplate = this.templateSelect.value;
    saveToLocalStorage(TEMPLATE_SELECTION_KEY, selectedTemplate);
    
    try {
      // Get the number of models required for this template
      const modelCount = await getTemplateModelCount(selectedTemplate);
      
      // Call the change callback
      this.onTemplateChange(selectedTemplate, modelCount);
    } catch (error) {
      console.error('Error handling template change:', error);
      throw error;
    }
  }
  
  /**
   * Updates the template select when a custom template is added or removed
   */
  public updateCustomTemplateOption(): void {
    // Check if custom template exists
    const customTemplate = getCustomTemplate();
    
    // Check if custom option already exists
    let customOptionExists = false;
    let customOptionIndex = -1;
    
    for (let i = 0; i < this.templateSelect.options.length; i++) {
      if (this.templateSelect.options[i].value === 'custom') {
        customOptionExists = true;
        customOptionIndex = i;
        break;
      }
    }
    
    if (customTemplate) {
      // Custom template exists, add or update the option
      if (customOptionExists) {
        // Update existing option
        const option = this.templateSelect.options[customOptionIndex];
        option.textContent = customTemplate.description ?
          `Custom: ${customTemplate.name} - ${customTemplate.description}` :
          `Custom: ${customTemplate.name}`;
      } else {
        // Add new option
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = customTemplate.description ?
          `Custom: ${customTemplate.name} - ${customTemplate.description}` :
          `Custom: ${customTemplate.name}`;
        this.templateSelect.appendChild(customOption);
      }
      
      // Select the custom template
      this.templateSelect.value = 'custom';
      saveToLocalStorage(TEMPLATE_SELECTION_KEY, 'custom');
    } else if (customOptionExists) {
      // Custom template doesn't exist but option does, remove it
      this.templateSelect.remove(customOptionIndex);
      
      // If custom was selected, select the first option
      if (this.templateSelect.value === 'custom' && this.templateSelect.options.length > 0) {
        this.templateSelect.selectedIndex = 0;
        saveToLocalStorage(TEMPLATE_SELECTION_KEY, this.templateSelect.value);
      }
    }
    
    // Trigger change event to update model inputs
    this.handleTemplateChange();
  }
}