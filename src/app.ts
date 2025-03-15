import { MODEL_INFO } from './models';
import { Conversation } from './conversation';
import { loadTemplate, getAvailableTemplates } from './templates';
import { generateDistinctColors, getRgbColor, saveToLocalStorage, loadFromLocalStorage } from './utils';
import { ApiKeys } from './types';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI elements
  const templateSelect = document.getElementById('template-select') as HTMLSelectElement;
  const maxTurnsInput = document.getElementById('max-turns') as HTMLInputElement;
  const startButton = document.getElementById('start-conversation') as HTMLButtonElement;
  const exportButton = document.getElementById('export-conversation') as HTMLButtonElement;
  const conversationOutput = document.getElementById('conversation-output') as HTMLDivElement;
  const modelInputs = document.getElementById('model-inputs') as HTMLDivElement;
  
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
    header.addEventListener('click', () => {
      const section = header.closest('.collapsible-section');
      section?.classList.toggle('collapsed');
    });
  });
  
  // Conversation state
  let activeConversation: Conversation | null = null;
  let isConversationRunning = false;

  // API key input elements
  const anthropicKeyInput = document.getElementById('anthropic-key') as HTMLInputElement;
  const openaiKeyInput = document.getElementById('openai-key') as HTMLInputElement;
  const hyperbolicKeyInput = document.getElementById('hyperbolic-key') as HTMLInputElement;

  // Load saved API keys if available
  anthropicKeyInput.value = loadFromLocalStorage('anthropicApiKey', '');
  openaiKeyInput.value = loadFromLocalStorage('openaiApiKey', '');
  hyperbolicKeyInput.value = loadFromLocalStorage('hyperbolicApiKey', '');
  
  // Load saved font size and word wrap settings
  const savedFontSize = loadFromLocalStorage('outputFontSize', '14');
  const savedWordWrap = loadFromLocalStorage('outputWordWrap', 'true');
  
  // Initialize font size and word wrap with saved values
  let currentFontSize = parseInt(savedFontSize);
  currentFontSizeSpan.textContent = `${currentFontSize}px`;
  conversationOutput.style.fontSize = `${currentFontSize}px`;
  
  // Initialize word wrap with saved value
  wordWrapToggle.checked = savedWordWrap === 'true';
  conversationOutput.style.whiteSpace = wordWrapToggle.checked ? 'pre-wrap' : 'pre';

  // Save API keys when changed
  anthropicKeyInput.addEventListener('change', () => saveToLocalStorage('anthropicApiKey', anthropicKeyInput.value));
  openaiKeyInput.addEventListener('change', () => saveToLocalStorage('openaiApiKey', openaiKeyInput.value));
  hyperbolicKeyInput.addEventListener('change', () => saveToLocalStorage('hyperbolicApiKey', hyperbolicKeyInput.value));
  
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
  
  // Color generator for actors
  const colorGenerator = generateDistinctColors();
  const actorColors: Record<string, string> = {};
  
  // Get the number of models from the template file
  async function getTemplateModelCount(templateName: string): Promise<number> {
    try {
      const response = await fetch(`./templates/${templateName}.jsonl`);
      if (!response.ok) {
        throw new Error(`Template '${templateName}' not found.`);
      }
      
      const text = await response.text();
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
        
        newGroup.appendChild(label);
        newGroup.appendChild(select);
        modelInputs.appendChild(newGroup);
        
        // Populate the select
        populateModelSelect(select, i);
      }
    } catch (error) {
      // Display error message
      addOutputMessage('System', `Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Populate a single model select
  function populateModelSelect(select: HTMLSelectElement, index?: number) {
    select.innerHTML = '';

    // Add model options
    Object.keys(MODEL_INFO).forEach(modelKey => {
      const option = document.createElement('option');
      option.value = modelKey;
      option.textContent = `${MODEL_INFO[modelKey].display_name} (${modelKey})`;
      select.appendChild(option);
    });
    
    // Set selected value if available and index is provided
    if (index !== undefined && savedModelSelections && savedModelSelections[index]) {
      select.value = savedModelSelections[index];
    }
    
    // Add change event listener to save selection
    select.addEventListener('change', saveModelSelections);
  }
  
  // Populate template select
  async function populateTemplateSelect() {
    try {
      const templates = await getAvailableTemplates();
      templateSelect.innerHTML = '';
      
      templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template;
        option.textContent = template;
        templateSelect.appendChild(option);
      });
      
      // Set selected template if available
      if (savedTemplateSelection && templates.includes(savedTemplateSelection)) {
        templateSelect.value = savedTemplateSelection;
      }
      
      // Update model inputs based on selected template
      await updateModelInputs(templateSelect.value);
    } catch (error) {
      console.error('Error loading templates:', error);
      addOutputMessage('System', 'Error loading templates. Please check the console for details.');
    }
  }
  
  // Save template selection when changed and update model inputs
  templateSelect.addEventListener('change', async () => {
    saveToLocalStorage('templateSelection', templateSelect.value);
    await updateModelInputs(templateSelect.value);
  });
  
  // Initialize UI
  populateTemplateSelect();
  
  // Handle start/stop conversation button
  startButton.addEventListener('click', handleStartStopButton);
  
  // Handle export conversation button
  exportButton.addEventListener('click', exportConversation);
  
  // Handle start/stop button click
  function handleStartStopButton() {
    if (isConversationRunning) {
      stopConversation();
    } else {
      startConversation();
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
      exportButton.style.display = 'block';
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
  
  // Add message to conversation output
  function addOutputMessage(actor: string, content: string) {
    // Get or assign color for this actor
    if (!actorColors[actor]) {
      actorColors[actor] = getRgbColor(colorGenerator.next());
    }
    
    // Format current timestamp
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'actor-response';
    
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
    
    // Get API keys
    const apiKeys: ApiKeys = {
      anthropicApiKey: anthropicKeyInput.value,
      openaiApiKey: openaiKeyInput.value,
      hyperbolicApiKey: hyperbolicKeyInput.value,
    };
    
    // Validate required API keys
    const requiredApis: Record<string, string> = {};
    
    for (const model of models) {
      const company = MODEL_INFO[model].company;
      if (company === 'anthropic') {
        requiredApis['anthropicApiKey'] = 'Anthropic API Key';
      } else if (company === 'openai') {
        requiredApis['openaiApiKey'] = 'OpenAI API Key';
      } else if (company.startsWith('hyperbolic')) {
        requiredApis['hyperbolicApiKey'] = 'Hyperbolic API Key';
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
        addOutputMessage
      );
      
      addOutputMessage('System', 'Starting conversation...');
      await activeConversation.start();
      
      // Conversation ended naturally
      isConversationRunning = false;
      startButton.textContent = 'Start Conversation';
      startButton.classList.remove('stop');
      exportButton.style.display = 'block';
    } catch (error) {
      console.error('Error starting conversation:', error);
      addOutputMessage('System', `Error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Reset UI on error
      isConversationRunning = false;
      startButton.textContent = 'Start Conversation';
      startButton.classList.remove('stop');
      exportButton.style.display = 'block';
    }
  }
});