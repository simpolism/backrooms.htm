import './styles'; // Import styles so webpack can process them
import { MODEL_INFO } from './models';
import { Conversation } from './conversation';
import { loadTemplate, getAvailableTemplates, saveCustomTemplate, getCustomTemplate, clearCustomTemplate } from './templates';
import { generateDistinctColors, getRgbColor, saveToLocalStorage, loadFromLocalStorage } from './utils';
import { ApiKeys, CustomTemplate, ModelInfo, ExploreCompletion, ExploreSettings } from './types';
import {
  initiateOAuthFlow,
  handleOAuthCallback,
  getAuthorizationCode
} from './oauth';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI elements
  const templateSelect = document.getElementById('template-select') as HTMLSelectElement;
  const maxTurnsInput = document.getElementById('max-turns') as HTMLInputElement;
  const maxOutputLengthInput = document.getElementById('max-output-length') as HTMLInputElement;
  const startButton = document.getElementById('start-conversation') as HTMLButtonElement;
  const exportButton = document.getElementById('export-conversation') as HTMLButtonElement;
  const conversationOutput = document.getElementById('conversation-output') as HTMLDivElement;
  const modelInputs = document.getElementById('model-inputs') as HTMLDivElement;
  
  // Create explore container for explore mode
  const exploreContainer = document.createElement('div');
  exploreContainer.id = 'explore-container';
  exploreContainer.className = 'explore-container';
  exploreContainer.style.display = 'none';
  exploreContainer.style.marginBottom = '20px';
  exploreContainer.style.border = '1px solid #000000';
  exploreContainer.style.padding = '10px';
  exploreContainer.style.backgroundColor = '#f5f5f5';
  
  const exploreHeader = document.createElement('div');
  exploreHeader.className = 'explore-header';
  exploreHeader.style.display = 'flex';
  exploreHeader.style.justifyContent = 'space-between';
  exploreHeader.style.alignItems = 'center';
  exploreHeader.style.marginBottom = '10px';
  
  const exploreTitle = document.createElement('h3');
  exploreTitle.textContent = 'Explore Mode: Select a completion';
  exploreTitle.style.margin = '0';
  
  const exploreHistoryButton = document.createElement('button');
  exploreHistoryButton.id = 'explore-history-button';
  exploreHistoryButton.className = 'secondary-button';
  exploreHistoryButton.textContent = 'Show Previous Options';
  exploreHistoryButton.style.display = 'none'; // Hide initially
  
  exploreHeader.appendChild(exploreTitle);
  exploreHeader.appendChild(exploreHistoryButton);
  
  const exploreOptions = document.createElement('div');
  exploreOptions.id = 'explore-options';
  exploreOptions.className = 'explore-options';
  exploreOptions.style.display = 'flex';
  exploreOptions.style.flexDirection = 'column';
  exploreOptions.style.gap = '10px';
  
  exploreContainer.appendChild(exploreHeader);
  exploreContainer.appendChild(exploreOptions);
  
  // Insert explore container before conversation container
  const conversationContainer = document.querySelector('.conversation-container');
  if (conversationContainer) {
    conversationContainer.parentNode?.insertBefore(exploreContainer, conversationContainer);
  }
  
  // Create load conversation button and file input
  const loadButton = document.createElement('button');
  loadButton.id = 'load-conversation';
  loadButton.textContent = 'Select Conversation File';
  loadButton.className = 'control-button';
  
  // Create hidden file input for loading conversation
  const loadFileInput = document.createElement('input');
  loadFileInput.type = 'file';
  loadFileInput.id = 'load-conversation-file';
  loadFileInput.accept = '.txt';
  loadFileInput.style.display = 'none';
  
  // Track current template model count
  let currentTemplateModelCount = 2; // Default to 2 models
  
  // Font size and word wrap controls
  const decreaseFontSizeBtn = document.getElementById('decrease-font-size') as HTMLButtonElement;
  const increaseFontSizeBtn = document.getElementById('increase-font-size') as HTMLButtonElement;
  const currentFontSizeSpan = document.getElementById('current-font-size') as HTMLSpanElement;
  const wordWrapToggle = document.getElementById('word-wrap-toggle') as HTMLInputElement;
  
  // Initialize collapsible sections
  const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
  collapsibleHeaders.forEach(header => {
    const section = header.closest('.collapsible-section');
    if (!section) return;
    
    // Get section ID or create one based on its content
    const sectionId = section.id ||
      header.querySelector('h2')?.textContent?.toLowerCase().replace(/\s+/g, '-') ||
      'section-' + Math.random().toString(36).substring(2, 9);
    
    // Set ID if not already set
    if (!section.id) {
      section.id = sectionId;
    }
    
    // Load saved collapse state
    const savedState = loadFromLocalStorage(`collapse-${sectionId}`, null);
    if (savedState !== null) {
      if (savedState === 'true') {
        section.classList.add('collapsed');
      } else {
        section.classList.remove('collapsed');
      }
    } else {
      // Set default states for sections
      if (sectionId === 'output-settings' || sectionId === 'api-keys') {
        // Output settings and API keys should be open by default
        section.classList.remove('collapsed');
      } else if (sectionId === 'template-editor') {
        // Template editor should be closed by default
        section.classList.add('collapsed');
      }
    }
    
    header.addEventListener('click', () => {
      section.classList.toggle('collapsed');
      // Save collapse state
      saveToLocalStorage(`collapse-${sectionId}`, section.classList.contains('collapsed').toString());
    });
  });
  
  // Conversation state
  let activeConversation: Conversation | null = null;
  let isConversationRunning = false;

  // API key input elements
  const hyperbolicKeyInput = document.getElementById('hyperbolic-key') as HTMLInputElement;
  const openrouterKeyInput = document.getElementById('openrouter-key') as HTMLInputElement;
  const openrouterOAuthButton = document.getElementById('openrouter-oauth-button') as HTMLButtonElement;
  
  // Create a container for OpenRouter auth messages
  const openrouterAuthContainer = document.createElement('div');
  openrouterAuthContainer.className = 'auth-message-container';
  openrouterAuthContainer.style.display = 'none';
  openrouterAuthContainer.style.marginTop = '15px';
  openrouterAuthContainer.style.marginBottom = '10px';
  openrouterAuthContainer.style.padding = '8px 10px';
  openrouterAuthContainer.style.border = '1px solid #000000';
  openrouterAuthContainer.style.fontSize = '14px';
  openrouterAuthContainer.style.fontFamily = 'Times New Roman, serif';
  openrouterAuthContainer.style.textAlign = 'center';
  openrouterAuthContainer.style.transition = 'opacity 0.3s ease';
  openrouterAuthContainer.style.width = '100%';
  openrouterAuthContainer.style.boxSizing = 'border-box';
  
  // Find the parent container of the OAuth button's parent
  // This places the message in a more appropriate location in the hierarchy
  const openrouterOAuthParent = openrouterOAuthButton.closest('.input-group');
  if (openrouterOAuthParent && openrouterOAuthParent.parentElement) {
    // Insert after the input group containing the OAuth button
    openrouterOAuthParent.parentElement.insertBefore(
      openrouterAuthContainer,
      openrouterOAuthParent.nextSibling
    );
  }

  // Load saved API keys if available
  hyperbolicKeyInput.value = loadFromLocalStorage('hyperbolicApiKey', '');
  openrouterKeyInput.value = loadFromLocalStorage('openrouterApiKey', '');
  
  // Function to show temporary auth messages
  function showAuthMessage(message: string, isError: boolean = false, duration: number = 5000) {
    // Set message and styling
    openrouterAuthContainer.textContent = message;
    
    // Apply styling based on message type
    if (isError) {
      openrouterAuthContainer.style.backgroundColor = '#EEEEEE';
      openrouterAuthContainer.style.color = '#FF0000';
    } else {
      openrouterAuthContainer.style.backgroundColor = '#EEEEEE';
      openrouterAuthContainer.style.color = '#000000';
    }
    
    // Show the message with a fade-in effect
    openrouterAuthContainer.style.opacity = '0';
    openrouterAuthContainer.style.display = 'block';
    
    // Trigger reflow to ensure transition works
    void openrouterAuthContainer.offsetWidth;
    openrouterAuthContainer.style.opacity = '1';
    
    // Clear any existing timeout
    const existingTimeout = openrouterAuthContainer.dataset.timeoutId;
    if (existingTimeout) {
      window.clearTimeout(parseInt(existingTimeout));
    }
    
    // Set timeout to hide the message with fade-out effect
    const timeoutId = window.setTimeout(() => {
      openrouterAuthContainer.style.opacity = '0';
      
      // After fade-out completes, hide the element
      setTimeout(() => {
        openrouterAuthContainer.style.display = 'none';
      }, 300); // Match the transition duration
    }, duration);
    
    // Store timeout ID in dataset
    openrouterAuthContainer.dataset.timeoutId = timeoutId.toString();
  }
  
  // Load saved max output length if available
  maxOutputLengthInput.value = loadFromLocalStorage('maxOutputLength', '512');
  // Load saved font size, word wrap, and explore mode settings
  const savedFontSize = loadFromLocalStorage('outputFontSize', '14');
  const savedWordWrap = loadFromLocalStorage('outputWordWrap', 'true');
  const savedExploreMode = loadFromLocalStorage('exploreMode', 'false');
  
  // Initialize font size and word wrap with saved values
  let currentFontSize = parseInt(savedFontSize);
  currentFontSizeSpan.textContent = `${currentFontSize}px`;
  conversationOutput.style.fontSize = `${currentFontSize}px`;
  
  // Initialize word wrap with saved value
  wordWrapToggle.checked = savedWordWrap === 'true';
  conversationOutput.style.whiteSpace = wordWrapToggle.checked ? 'pre-wrap' : 'pre';
  
  // Initialize explore mode toggle
  const exploreModeToggle = document.getElementById('explore-mode-toggle') as HTMLInputElement;
  exploreModeToggle.checked = savedExploreMode === 'true';
  
  // Add event listener for explore mode toggle
  exploreModeToggle.addEventListener('change', () => {
    saveToLocalStorage('exploreMode', exploreModeToggle.checked.toString());
    
    // Update all model explore settings based on the global toggle
    const allModelSelects = document.querySelectorAll('.model-select') as NodeListOf<HTMLSelectElement>;
    const exploreCheckboxes = document.querySelectorAll('.explore-enabled-checkbox') as NodeListOf<HTMLInputElement>;
    
    for (let i = 0; i < exploreCheckboxes.length; i++) {
      const checkbox = exploreCheckboxes[i];
      const select = allModelSelects[i];
      
      // Only update if the checkbox exists and the select exists
      if (checkbox && select) {
        checkbox.checked = exploreModeToggle.checked;
        
        // Get the n input and max tokens input
        const nInput = document.getElementById(`explore-n-${i}`) as HTMLInputElement;
        const maxTokensInput = document.getElementById(`model-max-tokens-${i}`) as HTMLInputElement;
        
        if (nInput) {
          nInput.disabled = !exploreModeToggle.checked;
        }
        
        // Save the explore settings
        if (select.value) {
          saveExploreSettings(
            i,
            select.value,
            exploreModeToggle.checked,
            nInput ? parseInt(nInput.value) : 3,
            maxTokensInput ? parseInt(maxTokensInput.value) : parseInt(maxOutputLengthInput.value)
          );
        }
      }
    }
  });
  conversationOutput.style.whiteSpace = wordWrapToggle.checked ? 'pre-wrap' : 'pre';

  // Function to refresh model selects when API keys change
  function refreshModelSelects() {
    const allModelSelects = document.querySelectorAll('.model-select') as NodeListOf<HTMLSelectElement>;
    allModelSelects.forEach((select, index) => {
      const selectedValue = select.value;
      populateModelSelect(select, index);
      select.value = selectedValue;
    });
  }

  // Save API keys when changed and refresh model selects
  hyperbolicKeyInput.addEventListener('change', () => {
    saveToLocalStorage('hyperbolicApiKey', hyperbolicKeyInput.value);
    refreshModelSelects();
  });
  
  openrouterKeyInput.addEventListener('change', () => {
    saveToLocalStorage('openrouterApiKey', openrouterKeyInput.value);
    refreshModelSelects();
  });
  
  // Handle OpenRouter OAuth button click
  openrouterOAuthButton.addEventListener('click', async () => {
    try {
      // Show loading message
      showAuthMessage('Initiating authentication with OpenRouter...', false);
      
      // Start the OAuth flow
      await initiateOAuthFlow();
      // The page will be redirected to OpenRouter, so no need to do anything else here
    } catch (error) {
      console.error('Error initiating OAuth flow:', error);
      showAuthMessage(`Error initiating OAuth flow: ${error instanceof Error ? error.message : String(error)}`, true);
    }
  });
  
  // Check if this is a callback from OpenRouter OAuth
  if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
    // Show initial processing message
    showAuthMessage('Processing authentication response...', false, 60000);
    
    // Check for error parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (errorParam) {
      // Handle explicit error from OAuth provider
      console.error('OAuth error:', errorParam, errorDescription);
      showAuthMessage(
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
          saveToLocalStorage('openrouterApiKey', apiKey);
          
          // Update the input field
          openrouterKeyInput.value = apiKey;
          
          // Refresh model selects
          refreshModelSelects();
          
          // Show success message
          showAuthMessage('Successfully authenticated with OpenRouter!', false, 8000);
          
          // Clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        },
        // Error callback
        (error) => {
          console.error('Error handling OAuth callback:', error);
          showAuthMessage(`Error authenticating with OpenRouter: ${error.message}`, true, 10000);
          
          // Clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      );
    }
  }
  
  // Font size control event handlers
  decreaseFontSizeBtn.addEventListener('click', () => {
    if (currentFontSize > 8) {
      currentFontSize -= 2;
      updateFontSize();
    }
  });
  
  increaseFontSizeBtn.addEventListener('click', () => {
    if (currentFontSize < 32) {
      currentFontSize += 2;
      updateFontSize();
    }
  });
  
  // Update font size and save to localStorage
  function updateFontSize() {
    currentFontSizeSpan.textContent = `${currentFontSize}px`;
    conversationOutput.style.fontSize = `${currentFontSize}px`;
    saveToLocalStorage('outputFontSize', currentFontSize.toString());
  }
  
  // Word wrap toggle event handler
  wordWrapToggle.addEventListener('change', () => {
    updateWordWrap();
  });
  
  // Also add click handler to the toggle switch container for better usability
  const toggleSwitch = wordWrapToggle.closest('.toggle-switch') as HTMLElement;
  if (toggleSwitch) {
    toggleSwitch.addEventListener('click', (e) => {
      // Prevent double triggering when clicking directly on the checkbox
      if (e.target !== wordWrapToggle) {
        wordWrapToggle.checked = !wordWrapToggle.checked;
        updateWordWrap();
      }
    });
  }
  
  // Update word wrap and save to localStorage
  function updateWordWrap() {
    conversationOutput.style.whiteSpace = wordWrapToggle.checked ? 'pre-wrap' : 'pre';
    saveToLocalStorage('outputWordWrap', wordWrapToggle.checked.toString());
  }
  
  // Load saved model and template selections if available
  const savedModelSelections = loadFromLocalStorage('modelSelections', []);
  const savedTemplateSelection = loadFromLocalStorage('templateSelection', '');
  
  // Function to save all model selections
  function saveModelSelections() {
    const allModelSelects = document.querySelectorAll('.model-select') as NodeListOf<HTMLSelectElement>;
    const models: string[] = Array.from(allModelSelects).map(select => select.value);
    saveToLocalStorage('modelSelections', models);
  }
  
  // Function to save explore settings for a model
  function saveExploreSettings(modelIndex: number, modelKey: string, enabled: boolean, n: number, maxTokens: number) {
    // Save to localStorage
    saveToLocalStorage(`explore_settings_${modelIndex}`, JSON.stringify({
      enabled,
      n,
      maxTokens
    }));
    
    // Update MODEL_INFO
    if (MODEL_INFO[modelKey]) {
      MODEL_INFO[modelKey].exploreSettings = {
        enabled,
        n,
        maxTokens
      };
    }
  }
  
  // Function to fetch OpenRouter models
  async function fetchOpenRouterModels(apiKey: string): Promise<any[]> {
    try {
      // Check if we have cached models and they're not expired
      const cachedData = loadFromLocalStorage('openrouterModelsCache', null);
      if (cachedData) {
        try {
          const { models, timestamp } = JSON.parse(cachedData);
          // Cache expires after 1 hour (3600000 ms)
          if (Date.now() - timestamp < 3600000) {
            return models;
          }
        } catch (e) {
          console.error('Error parsing cached models:', e);
          // Continue to fetch fresh data if cache parsing fails
        }
      }

      // Fetch fresh data
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'backrooms.directory'
        }
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the results with timestamp
      saveToLocalStorage('openrouterModelsCache', JSON.stringify({
        models: data.data,
        timestamp: Date.now()
      }));
      
      return data.data;
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      throw error;
    }
  }
  
  // Color generator for actors
  const colorGenerator = generateDistinctColors();
  const actorColors: Record<string, string> = {};
  
  // Get the number of models from the template file
  async function getTemplateModelCount(templateName: string): Promise<number> {
    try {
      let text: string;
      
      // Check if this is the custom template
      if (templateName === 'custom') {
        const customTemplate = getCustomTemplate();
        
        if (!customTemplate) {
          throw new Error('Custom template not found.');
        }
        
        text = customTemplate.content;
      } else {
        // Load built-in template
        const response = await fetch(`./public/templates/${templateName}.jsonl`);
        if (!response.ok) {
          throw new Error(`Template '${templateName}' not found.`);
        }
        text = await response.text();
      }
      
      const lines = text.trim().split('\n');
      return lines.length;
    } catch (error) {
      console.error(`Error loading template: ${error}`);
      throw error;
    }
  }
  
  // Update model inputs based on template
  async function updateModelInputs(templateName: string) {
    try {
      // Get the number of models from the template
      const modelCount = await getTemplateModelCount(templateName);
      currentTemplateModelCount = modelCount;
      
      // Clear existing model inputs
      modelInputs.innerHTML = '';
      
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
        
        // Create explore mode settings
        const exploreGroup = document.createElement('div');
        exploreGroup.className = 'model-explore-settings';
        exploreGroup.style.marginTop = '5px';
        exploreGroup.style.display = 'flex';
        exploreGroup.style.alignItems = 'center';
        exploreGroup.style.gap = '10px';
        
        // Create explore mode checkbox
        const exploreCheckboxContainer = document.createElement('div');
        exploreCheckboxContainer.style.display = 'flex';
        exploreCheckboxContainer.style.alignItems = 'center';
        
        const exploreCheckbox = document.createElement('input');
        exploreCheckbox.type = 'checkbox';
        exploreCheckbox.id = `explore-enabled-${i}`;
        exploreCheckbox.className = 'explore-enabled-checkbox';
        
        const exploreLabel = document.createElement('label');
        exploreLabel.setAttribute('for', `explore-enabled-${i}`);
        exploreLabel.textContent = 'Explore Mode';
        exploreLabel.style.marginLeft = '5px';
        
        exploreCheckboxContainer.appendChild(exploreCheckbox);
        exploreCheckboxContainer.appendChild(exploreLabel);
        
        // Create n parameter input
        const nInputContainer = document.createElement('div');
        nInputContainer.style.display = 'flex';
        nInputContainer.style.alignItems = 'center';
        
        const nInputLabel = document.createElement('label');
        nInputLabel.setAttribute('for', `explore-n-${i}`);
        nInputLabel.textContent = 'n:';
        nInputLabel.style.marginRight = '5px';
        
        const nInput = document.createElement('input');
        nInput.type = 'number';
        nInput.id = `explore-n-${i}`;
        nInput.className = 'explore-n-input';
        nInput.placeholder = 'n';
        nInput.min = '2';
        nInput.max = '5';
        nInput.value = '3';
        nInput.style.width = '40px';
        nInput.disabled = true; // Disabled by default
        
        nInputContainer.appendChild(nInputLabel);
        nInputContainer.appendChild(nInput);
        
        // Create max tokens input
        const maxTokensContainer = document.createElement('div');
        maxTokensContainer.style.display = 'flex';
        maxTokensContainer.style.alignItems = 'center';
        
        const maxTokensLabel = document.createElement('label');
        maxTokensLabel.setAttribute('for', `model-max-tokens-${i}`);
        maxTokensLabel.textContent = 'Max Tokens:';
        maxTokensLabel.style.marginRight = '5px';
        
        const maxTokensInput = document.createElement('input');
        maxTokensInput.type = 'number';
        maxTokensInput.id = `model-max-tokens-${i}`;
        maxTokensInput.className = 'model-max-tokens-input';
        maxTokensInput.placeholder = 'Max Tokens';
        maxTokensInput.min = '1';
        maxTokensInput.max = '1024';
        maxTokensInput.value = maxOutputLengthInput.value || '512'; // Default value
        maxTokensInput.style.width = '60px';
        
        maxTokensContainer.appendChild(maxTokensLabel);
        maxTokensContainer.appendChild(maxTokensInput);
        
        // Add elements to explore group
        exploreGroup.appendChild(exploreCheckboxContainer);
        exploreGroup.appendChild(nInputContainer);
        exploreGroup.appendChild(maxTokensContainer);
        
        // Add elements to main group
        newGroup.appendChild(label);
        newGroup.appendChild(select);
        newGroup.appendChild(document.createElement('br'));
        newGroup.appendChild(exploreGroup);
        modelInputs.appendChild(newGroup);
        
        // Populate the select
        populateModelSelect(select, i);
        
        // Load saved explore settings
        const savedExploreSettings = loadFromLocalStorage(`explore_settings_${i}`, null);
        if (savedExploreSettings) {
          try {
            const settings = JSON.parse(savedExploreSettings);
            exploreCheckbox.checked = settings.enabled;
            nInput.value = settings.n.toString();
            nInput.disabled = !settings.enabled;
            if (settings.maxTokens) {
              maxTokensInput.value = settings.maxTokens.toString();
            }
          } catch (e) {
            console.error('Error parsing saved explore settings:', e);
          }
        }
        
        // Add event listeners for explore settings
        exploreCheckbox.addEventListener('change', () => {
          nInput.disabled = !exploreCheckbox.checked;
          saveExploreSettings(i, select.value, exploreCheckbox.checked, parseInt(nInput.value), parseInt(maxTokensInput.value));
        });
        
        nInput.addEventListener('change', () => {
          saveExploreSettings(i, select.value, exploreCheckbox.checked, parseInt(nInput.value), parseInt(maxTokensInput.value));
        });
        
        maxTokensInput.addEventListener('change', () => {
          saveExploreSettings(i, select.value, exploreCheckbox.checked, parseInt(nInput.value), parseInt(maxTokensInput.value));
        });
      }
    } catch (error) {
      // Display error message
      const errorMessage = `Error: ${error instanceof Error ? error.message : String(error)}`;
      
      // If this is an OpenRouter-related error, show it in the auth message container
      if (errorMessage.toLowerCase().includes('openrouter')) {
        showAuthMessage(errorMessage, true);
      } else {
        // For other errors, use the conversation output
        addOutputMessage('System', errorMessage);
      }
    }
  }
  
  // Create OpenRouter autocomplete field
  async function createOpenRouterAutocomplete(select: HTMLSelectElement, index: number) {
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
    const savedModel = loadFromLocalStorage(`openrouter_custom_model_${index}`, null);
    if (savedModel) {
      try {
        const savedModelData = JSON.parse(savedModel);
        input.value = savedModelData.name || '';
        input.dataset.id = savedModelData.id || '';
      } catch (e) {
        console.error('Error parsing saved model:', e);
      }
    }
    
    // Load OpenRouter models
    try {
      const models = await fetchOpenRouterModels(openrouterKeyInput.value);
      
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
              saveToLocalStorage(`openrouter_custom_model_${index}`, JSON.stringify({
                id: model.id,
                name: model.name || model.id
              }));
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

  // Populate a single model select
  function populateModelSelect(select: HTMLSelectElement, index?: number) {
    select.innerHTML = '';

    // Get current API keys
    const apiKeys = {
      hyperbolic: hyperbolicKeyInput.value,
      openrouter: openrouterKeyInput.value
    };

    // Remove any existing autocomplete field
    if (index !== undefined) {
      const existingAutocomplete = document.getElementById(`openrouter-autocomplete-${index}`);
      if (existingAutocomplete) {
        existingAutocomplete.remove();
      }
    }

    // Add model options
    Object.keys(MODEL_INFO).forEach(modelKey => {
      const modelInfo = MODEL_INFO[modelKey];
      const company = modelInfo.company;
      
      // Create option element
      const option = document.createElement('option');
      option.value = modelKey;
      
      // Determine if this model's API key is available
      let apiKeyAvailable = false;
      let apiKeyName = '';
      
      if (company === 'hyperbolic' || company === 'hyperbolic_completion') {
        apiKeyAvailable = !!apiKeys.hyperbolic;
        apiKeyName = 'Hyperbolic';
      } else if (company === 'openrouter') {
        apiKeyAvailable = !!apiKeys.openrouter;
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
    if (index !== undefined && savedModelSelections && savedModelSelections[index]) {
      select.value = savedModelSelections[index];
    }
    
    // Add change event listener to save selection and handle OpenRouter custom selector
    select.addEventListener('change', (event) => {
      saveModelSelections();
      
      // Check if this is the OpenRouter custom selector
      if (index !== undefined) {
        const selectedModelKey = select.value;
        const modelInfo = MODEL_INFO[selectedModelKey];
        
        // Remove any existing autocomplete field
        const existingAutocomplete = document.getElementById(`openrouter-autocomplete-${index}`);
        if (existingAutocomplete) {
          existingAutocomplete.remove();
        }
        
        // If this is the OpenRouter custom selector and API key is available, show autocomplete
        if (modelInfo && modelInfo.is_custom_selector && apiKeys.openrouter) {
          createOpenRouterAutocomplete(select, index);
        }
      }
    });
    
    // Check if the current selection is the OpenRouter custom selector and show autocomplete if needed
    if (index !== undefined) {
      const currentValue = select.value;
      const modelInfo = MODEL_INFO[currentValue];
      if (modelInfo && modelInfo.is_custom_selector && apiKeys.openrouter) {
        createOpenRouterAutocomplete(select, index);
      }
    }
  }
  
  // Populate template select
  async function populateTemplateSelect() {
    try {
      const templates = await getAvailableTemplates();
      templateSelect.innerHTML = '';
      
      templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.name;
        // Show both name and description in the dropdown
        option.textContent = template.description ?
          `${template.name} - ${template.description}` :
          template.name;
        templateSelect.appendChild(option);
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
        templateSelect.appendChild(customOption);
      }
      
      // Set selected template if available
      if (savedTemplateSelection) {
        // Check if the saved selection exists in the options
        let selectionExists = false;
        for (let i = 0; i < templateSelect.options.length; i++) {
          if (templateSelect.options[i].value === savedTemplateSelection) {
            selectionExists = true;
            break;
          }
        }
        
        if (selectionExists) {
          templateSelect.value = savedTemplateSelection;
        }
      }
      
      // Update model inputs based on selected template
      await updateModelInputs(templateSelect.value);
    } catch (error) {
      console.error('Error loading templates:', error);
      addOutputMessage('System', 'Error loading templates. Please check the console for details.');
    }
  }
  
  // Save max output length when changed and enforce limits
  maxOutputLengthInput.addEventListener('change', () => {
    let value = parseInt(maxOutputLengthInput.value);
    // Ensure the value is within the valid range
    value = Math.max(1, Math.min(value, 1024));
    maxOutputLengthInput.value = value.toString();
    saveToLocalStorage('maxOutputLength', value.toString());
  });
  
  // Save template selection when changed and update model inputs
  templateSelect.addEventListener('change', async () => {
    saveToLocalStorage('templateSelection', templateSelect.value);
    await updateModelInputs(templateSelect.value);
  });
  
  // Initialize UI
  populateTemplateSelect();
  initializeTemplateEditor();
  
  // Create pause/resume buttons
  const pauseButton = document.createElement('button');
  pauseButton.id = 'pause-conversation';
  pauseButton.textContent = 'Pause';
  pauseButton.className = 'control-button pause';
  pauseButton.style.display = 'none';
  
  const resumeButton = document.createElement('button');
  resumeButton.id = 'resume-conversation';
  resumeButton.textContent = 'Resume';
  resumeButton.className = 'control-button resume';
  resumeButton.style.display = 'none';
  
  // Add buttons to the DOM after the start button
  startButton.parentNode?.insertBefore(pauseButton, startButton.nextSibling);
  pauseButton.parentNode?.insertBefore(resumeButton, pauseButton.nextSibling);
  
  // Handle button clicks
  startButton.addEventListener('click', handleStartStopButton);
  pauseButton.addEventListener('click', handlePauseButton);
  resumeButton.addEventListener('click', handleResumeButton);
  
  // Add load file input to the document body
  document.body.appendChild(loadFileInput);
  
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
    loadButtonGroup.appendChild(loadButton);
    outputSettingsContent.appendChild(loadButtonGroup);
  } else {
    // Fallback if output settings section not found
    exportButton.parentNode?.insertBefore(loadButton, exportButton.nextSibling);
  }
  
  // Handle export conversation button
  exportButton.addEventListener('click', exportConversation);
  
  // Handle load conversation button
  loadButton.addEventListener('click', () => {
    loadFileInput.click();
  });
  
  // Handle file selection for loading conversation
  loadFileInput.addEventListener('change', (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      loadConversation(content);
    };
    
    reader.onerror = () => {
      addOutputMessage('System', 'Error: Failed to read the file.');
    };
    
    reader.readAsText(file);
    
    // Reset file input
    loadFileInput.value = '';
  });
  
  // Initialize template editor
  function initializeTemplateEditor() {
    const editCurrentTemplateBtn = document.getElementById('edit-current-template') as HTMLButtonElement;
    const importTemplateBtn = document.getElementById('import-template') as HTMLButtonElement;
    const templateFileInput = document.getElementById('template-file-input') as HTMLInputElement;
    const templateEditorForm = document.getElementById('template-editor-form') as HTMLDivElement;
    const templateNameInput = document.getElementById('template-name') as HTMLInputElement;
    const templateDescriptionInput = document.getElementById('template-description') as HTMLInputElement;
    const templateContentTextarea = document.getElementById('template-content') as HTMLTextAreaElement;
    const saveTemplateBtn = document.getElementById('save-template') as HTMLButtonElement;
    const exportTemplateBtn = document.getElementById('export-template') as HTMLButtonElement;
    const clearCustomTemplateBtn = document.getElementById('clear-custom-template') as HTMLButtonElement;
    const clearCustomTemplateStatusBtn = document.getElementById('clear-custom-template-status') as HTMLButtonElement;
    const cancelEditBtn = document.getElementById('cancel-edit') as HTMLButtonElement;
    const customTemplateStatus = document.getElementById('custom-template-status') as HTMLDivElement;
    const customTemplateName = document.getElementById('custom-template-name') as HTMLSpanElement;
    const editCustomTemplateBtn = document.getElementById('edit-custom-template') as HTMLButtonElement;
    
    // Create a container for template editor error messages
    const templateErrorContainer = document.createElement('div');
    templateErrorContainer.className = 'template-error-container';
    templateErrorContainer.style.display = 'none';
    templateErrorContainer.style.marginTop = '15px';
    templateErrorContainer.style.marginBottom = '15px';
    templateErrorContainer.style.padding = '8px 10px';
    templateErrorContainer.style.border = '1px solid #000000';
    templateErrorContainer.style.fontSize = '14px';
    templateErrorContainer.style.fontFamily = 'Times New Roman, serif';
    templateErrorContainer.style.backgroundColor = '#EEEEEE';
    templateErrorContainer.style.color = '#FF0000';
    templateErrorContainer.style.position = 'relative';
    templateErrorContainer.style.width = '100%';
    templateErrorContainer.style.boxSizing = 'border-box';
    
    // Create dismiss button (X)
    const dismissButton = document.createElement('button');
    dismissButton.textContent = '×'; // × is the multiplication sign, looks like an X
    dismissButton.style.position = 'absolute';
    dismissButton.style.right = '5px';
    dismissButton.style.top = '5px';
    dismissButton.style.background = 'none';
    dismissButton.style.border = 'none';
    dismissButton.style.fontSize = '16px';
    dismissButton.style.fontWeight = 'bold';
    dismissButton.style.cursor = 'pointer';
    dismissButton.style.padding = '0 5px';
    dismissButton.style.lineHeight = '1';
    dismissButton.title = 'Dismiss';
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.style.paddingRight = '20px'; // Make room for the X button
    
    // Add elements to container
    templateErrorContainer.appendChild(dismissButton);
    templateErrorContainer.appendChild(messageElement);
    
    // Add container to the template editor form
    templateEditorForm.appendChild(templateErrorContainer);
    
    // Add click handler to dismiss button
    dismissButton.addEventListener('click', () => {
      templateErrorContainer.style.display = 'none';
    });
    
    // Function to show template error messages
    function showTemplateError(message: string) {
      messageElement.textContent = message;
      templateErrorContainer.style.display = 'block';
    }
    
    // Check if custom template exists and update UI
    function updateCustomTemplateStatus() {
      const customTemplate = getCustomTemplate();
      
      if (customTemplate) {
        customTemplateName.textContent = customTemplate.name;
        customTemplateStatus.style.display = 'block';
        
        // Add "Custom" option to template select if not already present
        let customOptionExists = false;
        for (let i = 0; i < templateSelect.options.length; i++) {
          if (templateSelect.options[i].value === 'custom') {
            customOptionExists = true;
            break;
          }
        }
        
        if (!customOptionExists) {
          const customOption = document.createElement('option');
          customOption.value = 'custom';
          // Show both name and description
          customOption.textContent = customTemplate.description ?
            `Custom: ${customTemplate.name} - ${customTemplate.description}` :
            `Custom: ${customTemplate.name}`;
          templateSelect.appendChild(customOption);
        } else {
          // Update the text of the custom option
          for (let i = 0; i < templateSelect.options.length; i++) {
            if (templateSelect.options[i].value === 'custom') {
              // Show both name and description
              templateSelect.options[i].textContent = customTemplate.description ?
                `Custom: ${customTemplate.name} - ${customTemplate.description}` :
                `Custom: ${customTemplate.name}`;
              break;
            }
          }
        }
      } else {
        customTemplateStatus.style.display = 'none';
        
        // Remove "Custom" option from template select if present
        for (let i = 0; i < templateSelect.options.length; i++) {
          if (templateSelect.options[i].value === 'custom') {
            templateSelect.remove(i);
            break;
          }
        }
      }
    }
    
    // Edit current template
    editCurrentTemplateBtn.addEventListener('click', async () => {
      const currentTemplate = templateSelect.value;
      
      try {
        let templateContent: string;
        let templateName: string;
        let templateDescription: string = '';
        
        if (currentTemplate === 'custom') {
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
          const response = await fetch(`./public/templates/${currentTemplate}.jsonl`);
          if (!response.ok) {
            throw new Error(`Template '${currentTemplate}' not found.`);
          }
          templateContent = await response.text();
          templateName = `${currentTemplate} (Custom)`;
          
          // Try to get description from available templates
          const templates = await getAvailableTemplates();
          const templateInfo = templates.find(t => t.name === currentTemplate);
          if (templateInfo) {
            templateDescription = templateInfo.description || '';
          }
        }
        
        // Populate editor form
        templateNameInput.value = templateName;
        templateDescriptionInput.value = templateDescription;
        templateContentTextarea.value = templateContent;
        
        // Show editor form
        templateEditorForm.style.display = 'block';
      } catch (error) {
        console.error('Error loading template for editing:', error);
        showTemplateError(`Error loading template: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    
    // Import template
    importTemplateBtn.addEventListener('click', () => {
      templateFileInput.click();
    });
    
    // Handle file selection
    templateFileInput.addEventListener('change', (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      const file = files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        // Validate JSONL content
        try {
          const lines = content.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              JSON.parse(line); // This will throw if invalid JSON
            }
          }
          
          // Populate editor form
          templateNameInput.value = file.name.replace('.jsonl', '');
          templateDescriptionInput.value = ''; // Clear description field for imported templates
          templateContentTextarea.value = content;
          
          // Show editor form
          templateEditorForm.style.display = 'block';
        } catch (error) {
          console.error('Invalid JSONL file:', error);
          showTemplateError('Invalid JSONL file. Please check the file format.');
        }
      };
      
      reader.onerror = () => {
        showTemplateError('Failed to read the file.');
      };
      
      reader.readAsText(file);
      
      // Reset file input
      templateFileInput.value = '';
    });
    
    // Save template
    saveTemplateBtn.addEventListener('click', () => {
      const name = templateNameInput.value.trim();
      const content = templateContentTextarea.value.trim();
      
      if (!name) {
        showTemplateError('Template name is required.');
        return;
      }
      
      if (!content) {
        showTemplateError('Template content is required.');
        return;
      }
      
      // Validate JSONL content
      try {
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            JSON.parse(line); // This will throw if invalid JSON
          }
        }
        
        // Get description
        const description = templateDescriptionInput.value.trim();
        
        // Save custom template
        saveCustomTemplate({
          name,
          description,
          content,
          originalName: templateSelect.value !== 'custom' ? templateSelect.value : undefined,
          lastModified: Date.now()
        });
        
        // Update UI
        templateEditorForm.style.display = 'none';
        updateCustomTemplateStatus();
        
        // Select custom template
        for (let i = 0; i < templateSelect.options.length; i++) {
          if (templateSelect.options[i].value === 'custom') {
            templateSelect.selectedIndex = i;
            break;
          }
        }
        
        // Trigger change event to update model inputs
        const event = new Event('change');
        templateSelect.dispatchEvent(event);
        
        // Show success message
        showTemplateError(`Custom template "${name}" saved successfully.`);
      } catch (error) {
        console.error('Invalid JSONL content:', error);
        showTemplateError('Invalid JSONL content. Please check the format.');
      }
    });
    
    // Export template
    exportTemplateBtn.addEventListener('click', () => {
      const name = templateNameInput.value.trim() || 'template';
      const content = templateContentTextarea.value.trim();
      
      if (!content) {
        showTemplateError('No content to export.');
        return;
      }
      
      // Create blob and download
      const blob = new Blob([content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    
    // Clear custom template
    const handleClearCustomTemplate = () => {
      clearCustomTemplate();
      updateCustomTemplateStatus();
      
      // If custom template was selected, switch to first available template
      if (templateSelect.value === 'custom' && templateSelect.options.length > 0) {
        templateSelect.selectedIndex = 0;
        
        // Trigger change event to update model inputs
        const event = new Event('change');
        templateSelect.dispatchEvent(event);
      }
      
      showTemplateError('Custom template cleared.');
    };
    
    clearCustomTemplateBtn.addEventListener('click', handleClearCustomTemplate);
    clearCustomTemplateStatusBtn.addEventListener('click', handleClearCustomTemplate);
    
    // Cancel editing
    cancelEditBtn.addEventListener('click', () => {
      templateEditorForm.style.display = 'none';
      templateNameInput.value = '';
      templateDescriptionInput.value = '';
      templateContentTextarea.value = '';
    });
    
    // Edit custom template
    editCustomTemplateBtn.addEventListener('click', () => {
      const customTemplate = getCustomTemplate();
      
      if (customTemplate) {
        templateNameInput.value = customTemplate.name;
        templateDescriptionInput.value = customTemplate.description || '';
        templateContentTextarea.value = customTemplate.content;
        templateEditorForm.style.display = 'block';
      }
    });
    
    // Initialize
    updateCustomTemplateStatus();
  }
  
  // Handle start/stop button click
  function handleStartStopButton() {
    if (isConversationRunning) {
      stopConversation();
    } else {
      startConversation();
    }
  }
  
  // Handle pause button click
  function handlePauseButton() {
    if (activeConversation && isConversationRunning) {
      activeConversation.pause();
      
      // Update UI
      pauseButton.style.display = 'none';
      resumeButton.style.display = 'inline-block';
      
      // Ensure max turns, max output length, and load conversation button remain disabled
      maxTurnsInput.disabled = true;
      maxOutputLengthInput.disabled = true;
      loadButton.disabled = true;
    }
  }

  // Handle resume button click
  function handleResumeButton() {
    if (activeConversation && isConversationRunning) {
      activeConversation.resume();
      
      // Update UI
      pauseButton.style.display = 'inline-block';
      resumeButton.style.display = 'none';
      
      // Ensure max turns, max output length, and load conversation button remain disabled
      maxTurnsInput.disabled = true;
      maxOutputLengthInput.disabled = true;
      loadButton.disabled = true;
    }
  }
  
  // Stop the active conversation
  function stopConversation() {
    if (activeConversation) {
      activeConversation.stop();
      addOutputMessage('System', 'Conversation stopped by user.');
      
      // Update UI
      isConversationRunning = false;
      startButton.textContent = 'Start Conversation';
      startButton.classList.remove('stop');
      pauseButton.style.display = 'none';
      resumeButton.style.display = 'none';
      exportButton.style.display = 'block';
      
      // Re-enable max turns and max output length fields and load conversation button
      maxTurnsInput.disabled = false;
      maxOutputLengthInput.disabled = false;
      loadButton.disabled = false;
    }
  }
  
  // Load conversation from a text file
  function loadConversation(text: string) {
    // Stop any active conversation
    if (activeConversation && isConversationRunning) {
      stopConversation();
    }
    
    // Reset UI state
    isConversationRunning = false;
    startButton.textContent = 'Start Conversation';
    startButton.classList.remove('stop');
    pauseButton.style.display = 'none';
    resumeButton.style.display = 'none';
    
    // Ensure max turns, max output length, and load conversation button are enabled
    maxTurnsInput.disabled = false;
    maxOutputLengthInput.disabled = false;
    loadButton.disabled = false;
    
    // Clear existing conversation
    conversationOutput.innerHTML = '';
    
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
          addOutputMessage(actor, content);
        }
      }
      
      // Show export button after loading
      exportButton.style.display = 'block';
      
      // Add a system message indicating successful load
      addOutputMessage('System', 'Conversation loaded successfully.');
    } catch (error) {
      console.error('Error parsing conversation:', error);
      addOutputMessage('System', `Error loading conversation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Export conversation to a file
  function exportConversation() {
    const conversationText = Array.from(conversationOutput.children)
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
  
  // Function to display explore completions
  function displayExploreCompletions(completions: ExploreCompletion[]): void {
    // Clear existing options
    exploreOptions.innerHTML = '';
    
    // Create options for each completion
    completions.forEach((completion, index) => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'explore-option';
      optionDiv.style.padding = '10px';
      optionDiv.style.border = '1px solid #000000';
      optionDiv.style.backgroundColor = '#ffffff';
      optionDiv.style.cursor = 'pointer';
      optionDiv.style.marginBottom = '10px';
      optionDiv.style.transition = 'background-color 0.2s';
      
      // Add hover effect
      optionDiv.addEventListener('mouseover', () => {
        optionDiv.style.backgroundColor = '#f0f0f0';
      });
      optionDiv.addEventListener('mouseout', () => {
        optionDiv.style.backgroundColor = '#ffffff';
      });
      
      const headerDiv = document.createElement('div');
      headerDiv.className = 'explore-option-header';
      headerDiv.style.display = 'flex';
      headerDiv.style.justifyContent = 'space-between';
      headerDiv.style.marginBottom = '5px';
      headerDiv.style.fontWeight = 'bold';
      
      const modelSpan = document.createElement('span');
      modelSpan.textContent = `${completion.modelName} - Option ${index + 1}`;
      
      const probabilitySpan = document.createElement('span');
      probabilitySpan.textContent = completion.logprobs ? `Probability: ${formatProbability(completion.logprobs)}` : '';
      
      headerDiv.appendChild(modelSpan);
      headerDiv.appendChild(probabilitySpan);
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'explore-option-content';
      contentDiv.style.whiteSpace = 'pre-wrap';
      contentDiv.textContent = completion.content;
      
      optionDiv.appendChild(headerDiv);
      optionDiv.appendChild(contentDiv);
      
      // Add click handler
      optionDiv.addEventListener('click', () => {
        handleExploreCompletionSelected(completion);
      });
      
      exploreOptions.appendChild(optionDiv);
    });
    
    // Show the explore container
    exploreContainer.style.display = 'block';
    
    // Hide the explore history button for now (will be implemented later)
    exploreHistoryButton.style.display = 'none';
  }
  
  // Function to format probability
  function formatProbability(logprobs: any): string {
    if (!logprobs) return 'N/A';
    
    // This is a placeholder - the actual implementation would depend on the format of logprobs
    // returned by the API
    return 'N/A';
  }
  
  // Function to handle when a completion is selected
  function handleExploreCompletionSelected(completion: ExploreCompletion): void {
    // Hide the explore container
    exploreContainer.style.display = 'none';
    
    // Add the selected completion to the conversation output
    addOutputMessage(completion.modelName, completion.content);
    
    // Resume the conversation
    if (activeConversation) {
      activeConversation.resume();
      
      // Update UI
      pauseButton.style.display = 'inline-block';
      resumeButton.style.display = 'none';
    }
  }
  
  // Add message to conversation output
  function addOutputMessage(actor: string, content: string, elementId?: string, isLoading: boolean = false) {
    // Get or assign color for this actor
    if (!actorColors[actor]) {
      actorColors[actor] = getRgbColor(colorGenerator.next());
    }
    
    // Format current timestamp
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // If elementId is provided, try to update existing element
    if (elementId) {
      const existingMessage = document.getElementById(elementId);
      if (existingMessage) {
        const contentDiv = existingMessage.querySelector('.response-content');
        if (contentDiv) {
          // Update content
          contentDiv.textContent = content;
          
          // Scroll to bottom
          conversationOutput.scrollTop = conversationOutput.scrollHeight;
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
    headerDiv.style.color = actorColors[actor];
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'response-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    conversationOutput.appendChild(messageDiv);
    
    // Scroll to bottom
    conversationOutput.scrollTop = conversationOutput.scrollHeight;
  }
  
  // Start conversation
  async function startConversation() {
    // Hide export button when starting a new conversation
    exportButton.style.display = 'none';
    
    // Clear previous output
    conversationOutput.innerHTML = '';
    
    // Get all model selects
    const allModelSelects = document.querySelectorAll('.model-select') as NodeListOf<HTMLSelectElement>;
    
    // Get selected models
    const models: string[] = Array.from(allModelSelects).map(select => select.value);
    
    // Get template
    const templateName = templateSelect.value;
    
    // Get max turns
    const maxTurns = maxTurnsInput.value ? parseInt(maxTurnsInput.value) : Infinity;
    
    // Get max output length (limited to 1-1024)
    let maxOutputLength = maxOutputLengthInput.value ? parseInt(maxOutputLengthInput.value) : 512;
    // Ensure the value is within the valid range
    maxOutputLength = Math.max(1, Math.min(maxOutputLength, 1024));
    
    // Disable max turns and max output length fields and load conversation button
    // when conversation is in the "started" state (even if paused)
    maxTurnsInput.disabled = true;
    maxOutputLengthInput.disabled = true;
    loadButton.disabled = true;
    
    // Get API keys
    const apiKeys: ApiKeys = {
      hyperbolicApiKey: hyperbolicKeyInput.value,
      openrouterApiKey: openrouterKeyInput.value,
    };
    
    // Validate required API keys
    const requiredApis: Record<string, string> = {};
    
    for (const model of models) {
      const company = MODEL_INFO[model].company;
      if (company === 'hyperbolic' || company === 'hyperbolic_completion') {
        requiredApis['hyperbolicApiKey'] = 'Hyperbolic API Key';
      } else if (company === 'openrouter') {
        requiredApis['openrouterApiKey'] = 'OpenRouter API Key';
      }
    }
    
    // Check if any required API keys are missing
    const missingKeys: string[] = [];
    for (const [key, name] of Object.entries(requiredApis)) {
      if (!apiKeys[key as keyof ApiKeys]) {
        missingKeys.push(name);
      }
    }
    
    if (missingKeys.length > 0) {
      addOutputMessage('System', `Error: Missing required API key(s): ${missingKeys.join(', ')}`);
      return;
    }
    
    try {
      // Update UI to show we're in conversation mode
      startButton.textContent = 'Stop Conversation';
      startButton.classList.add('stop');
      pauseButton.style.display = 'inline-block';
      isConversationRunning = true;
      
      // Verify template exists and has the correct number of models
      try {
        const templateModelCount = await getTemplateModelCount(templateName);
        if (templateModelCount !== models.length) {
          throw new Error(`Invalid template: Number of models (${models.length}) does not match the number of elements in the template (${templateModelCount})`);
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
      activeConversation = new Conversation(
        models,
        systemPrompts,
        contexts,
        apiKeys,
        maxTurns,
        maxOutputLength,
        addOutputMessage,
        displayExploreCompletions,
        handleExploreCompletionSelected
      );
      
      addOutputMessage('System', `Starting conversation with template "${templateName}"...`);
      await activeConversation.start();
      // Conversation ended naturally
      isConversationRunning = false;
      startButton.textContent = 'Start Conversation';
      startButton.classList.remove('stop');
      pauseButton.style.display = 'none';
      exportButton.style.display = 'block';
      
      // Re-enable max turns and max output length fields and load conversation button
      maxTurnsInput.disabled = false;
      maxOutputLengthInput.disabled = false;
      loadButton.disabled = false;
    } catch (error) {
      console.error('Error starting conversation:', error);
      addOutputMessage('System', `Error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Reset UI on error
      isConversationRunning = false;
      startButton.textContent = 'Start Conversation';
      startButton.classList.remove('stop');
      pauseButton.style.display = 'none';
      resumeButton.style.display = 'none';
      exportButton.style.display = 'block';
      
      // Re-enable max turns and max output length fields and load conversation button
      maxTurnsInput.disabled = false;
      maxOutputLengthInput.disabled = false;
      loadButton.disabled = false;
    }
  }
});