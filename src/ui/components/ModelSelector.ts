/**
 * Component for model selection
 */
import { MODEL_INFO, getModelInfo } from '../../models/ModelRegistry';
import { saveModelSelections, loadModelSelections, saveCustomOpenRouterModel, loadCustomOpenRouterModel } from '../../models/ModelConfig';
import { ApiKeys } from '../../types';
import { openRouterService } from '../../services/api/OpenRouterService';

/**
 * Class to manage model selection
 */
export class ModelSelector {
  private modelInputs: HTMLDivElement;
  private apiKeys: ApiKeys;
  private onModelSelectChange: () => void;
  
  /**
   * Creates a new ModelSelector instance
   * @param modelInputs The container for model inputs
   * @param apiKeys The API keys
   * @param onModelSelectChange Callback for model selection changes
   */
  constructor(
    modelInputs: HTMLDivElement,
    apiKeys: ApiKeys,
    onModelSelectChange: () => void = () => {}
  ) {
    this.modelInputs = modelInputs;
    this.apiKeys = apiKeys;
    this.onModelSelectChange = onModelSelectChange;
  }
  
  /**
   * Updates the API keys
   * @param apiKeys The new API keys
   */
  public updateApiKeys(apiKeys: ApiKeys): void {
    this.apiKeys = apiKeys;
    this.refreshModelSelects();
  }
  
  /**
   * Creates model inputs based on the template
   * @param modelCount The number of models required
   */
  public async updateModelInputs(modelCount: number): Promise<void> {
    try {
      // Clear existing model inputs
      this.modelInputs.innerHTML = '';
      
      // Create the required number of model selects
      for (let i = 0; i < modelCount; i++) {
        const newGroup = document.createElement('div');
        newGroup.className = 'model-input-group';
        
        const label = document.createElement('label');
        label.setAttribute('for', `model-${i}`);
        label.textContent = `Model ${i + 1}:`;
        
        const select = document.createElement('select');
        select.id = `model-${i}`;
        select.className = 'model-select';
        
        newGroup.appendChild(label);
        newGroup.appendChild(select);
        this.modelInputs.appendChild(newGroup);
        
        // Populate the select
        this.populateModelSelect(select, i);
      }
    } catch (error) {
      console.error('Error updating model inputs:', error);
      throw error;
    }
  }
  
  /**
   * Gets the currently selected models
   * @returns Array of selected model keys
   */
  public getSelectedModels(): string[] {
    const allModelSelects = this.modelInputs.querySelectorAll('.model-select') as NodeListOf<HTMLSelectElement>;
    return Array.from(allModelSelects).map(select => select.value);
  }
  
  /**
   * Refreshes all model selects
   */
  public refreshModelSelects(): void {
    const allModelSelects = this.modelInputs.querySelectorAll('.model-select') as NodeListOf<HTMLSelectElement>;
    allModelSelects.forEach((select, index) => {
      const selectedValue = select.value;
      this.populateModelSelect(select, index);
      select.value = selectedValue;
    });
  }
  
  /**
   * Populates a single model select
   * @param select The select element to populate
   * @param index The index of the model
   */
  private populateModelSelect(select: HTMLSelectElement, index?: number): void {
    select.innerHTML = '';

    // Add model options
    Object.keys(MODEL_INFO).forEach(modelKey => {
      const modelInfo = getModelInfo(modelKey);
      if (!modelInfo) return;
      
      const company = modelInfo.company;
      
      // Create option element
      const option = document.createElement('option');
      option.value = modelKey;
      
      // Determine if this model's API key is available
      let apiKeyAvailable = false;
      let apiKeyName = '';
      
      if (company === 'hyperbolic' || company === 'hyperbolic_completion') {
        apiKeyAvailable = !!this.apiKeys.hyperbolicApiKey;
        apiKeyName = 'Hyperbolic';
      } else if (company === 'openrouter') {
        apiKeyAvailable = !!this.apiKeys.openrouterApiKey;
        apiKeyName = 'OpenRouter';
      }
      
      // Set option text with API key info
      option.textContent = `${modelInfo.display_name} (${modelKey}) - ${apiKeyName}`;
      
      // Add a visual indicator if API key is missing
      if (!apiKeyAvailable) {
        option.textContent += ' [API Key Missing]';
        option.style.color = '#999';
      }
      
      select.appendChild(option);
    });
    
    // Set selected value if available and index is provided
    const savedModelSelections = loadModelSelections();
    if (index !== undefined && savedModelSelections && savedModelSelections[index]) {
      select.value = savedModelSelections[index];
    }
    
    // Add change event listener to save selection and handle OpenRouter custom selector
    select.addEventListener('change', (event) => {
      this.saveModelSelections();
      
      // Check if this is the OpenRouter custom selector
      if (index !== undefined) {
        const selectedModelKey = select.value;
        const modelInfo = getModelInfo(selectedModelKey);
        
        // Remove any existing autocomplete field
        const existingAutocomplete = document.getElementById(`openrouter-autocomplete-${index}`);
        if (existingAutocomplete) {
          existingAutocomplete.remove();
        }
        
        // If this is the OpenRouter custom selector and API key is available, show autocomplete
        if (modelInfo && modelInfo.is_custom_selector && this.apiKeys.openrouterApiKey) {
          this.createOpenRouterAutocomplete(select, index);
        }
      }
      
      // Call the change callback
      this.onModelSelectChange();
    });
    
    // Check if the current selection is the OpenRouter custom selector and show autocomplete if needed
    if (index !== undefined) {
      const currentValue = select.value;
      const modelInfo = getModelInfo(currentValue);
      if (modelInfo && modelInfo.is_custom_selector && this.apiKeys.openrouterApiKey) {
        this.createOpenRouterAutocomplete(select, index);
      }
    }
  }
  
  /**
   * Saves the current model selections
   */
  private saveModelSelections(): void {
    const allModelSelects = this.modelInputs.querySelectorAll('.model-select') as NodeListOf<HTMLSelectElement>;
    saveModelSelections(allModelSelects);
  }
  
  /**
   * Creates an autocomplete field for OpenRouter custom models
   * @param select The select element
   * @param index The model index
   */
  private async createOpenRouterAutocomplete(select: HTMLSelectElement, index: number): Promise<void> {
    // Create container for autocomplete
    const container = document.createElement('div');
    container.id = `openrouter-autocomplete-${index}`;
    container.className = 'openrouter-autocomplete-container';
    
    // Create subgroup with label (similar to model-input-group)
    const subgroup = document.createElement('div');
    subgroup.className = 'model-input-subgroup';
    
    // Create label
    const labelElement = document.createElement('label');
    labelElement.textContent = 'OpenRouter:';
    labelElement.setAttribute('for', `openrouter-model-${index}`);
    
    // Create input field
    const input = document.createElement('input');
    input.id = `openrouter-model-${index}`;
    input.type = 'text';
    input.className = 'openrouter-autocomplete-input';
    input.placeholder = 'Search OpenRouter models...';
    
    // Create dropdown for results
    const dropdown = document.createElement('div');
    dropdown.className = 'openrouter-autocomplete-dropdown';
    dropdown.style.display = 'none';
    
    // Add elements to container
    subgroup.appendChild(labelElement);
    subgroup.appendChild(input);
    container.appendChild(subgroup);
    container.appendChild(dropdown);
    
    // Find the model-input-group parent and insert after it
    const modelInputGroup = select.closest('.model-input-group');
    if (modelInputGroup && modelInputGroup.parentNode) {
      modelInputGroup.parentNode.insertBefore(container, modelInputGroup.nextSibling);
    } else {
      console.error('Cannot insert autocomplete: model input group not found');
      return;
    }
    
    // Try to load previously selected model
    const savedModel = loadCustomOpenRouterModel(index);
    if (savedModel) {
      input.value = savedModel.name || '';
      input.dataset.id = savedModel.id || '';
    }
    
    // Load OpenRouter models
    try {
      const models = await openRouterService.fetchAvailableModels(this.apiKeys.openrouterApiKey);
      
      // Function to filter and display models
      const filterModels = (query: string) => {
        dropdown.innerHTML = '';
        dropdown.style.display = 'block';
        
        const filteredModels = query
          ? models.filter(model =>
              model.id.toLowerCase().includes(query.toLowerCase()) ||
              (model.name && model.name.toLowerCase().includes(query.toLowerCase()))
            )
          : models;
        
        // Limit to first 10 results
        const displayModels = filteredModels.slice(0, 10);
        
        if (displayModels.length === 0) {
          const noResults = document.createElement('div');
          noResults.className = 'openrouter-autocomplete-item';
          noResults.textContent = 'No models found';
          dropdown.appendChild(noResults);
        } else {
          displayModels.forEach(model => {
            const item = document.createElement('div');
            item.className = 'openrouter-autocomplete-item';
            item.textContent = model.name || model.id;
            
            // Add click handler
            item.addEventListener('click', () => {
              input.value = model.name || model.id;
              input.dataset.id = model.id;
              dropdown.style.display = 'none';
              
              // Save selected model
              saveCustomOpenRouterModel(index, model.id, model.name || model.id);
            });
            
            dropdown.appendChild(item);
          });
        }
      };
      
      // Initial filter
      filterModels('');
      
      // Add input event listener
      input.addEventListener('input', () => {
        filterModels(input.value);
      });
      
      // Add focus event listener
      input.addEventListener('focus', () => {
        filterModels(input.value);
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (event) => {
        if (!container.contains(event.target as Node)) {
          dropdown.style.display = 'none';
        }
      });
      
    } catch (error) {
      console.error('Error loading OpenRouter models:', error);
      
      // Show error in dropdown
      const errorItem = document.createElement('div');
      errorItem.className = 'openrouter-autocomplete-item error';
      errorItem.textContent = 'Error loading models. Please check your API key.';
      dropdown.innerHTML = '';
      dropdown.appendChild(errorItem);
      dropdown.style.display = 'block';
    }
  }
}