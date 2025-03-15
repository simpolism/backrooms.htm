import { MODEL_INFO } from './models';
import { Conversation } from './conversation';
import { loadTemplate, getAvailableTemplates } from './templates';
import { generateDistinctColors, getRgbColor, saveToLocalStorage, loadFromLocalStorage } from './utils';
import { ApiKeys } from './types';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI elements
  const modelSelects = document.querySelectorAll('.model-select') as NodeListOf<HTMLSelectElement>;
  const templateSelect = document.getElementById('template-select') as HTMLSelectElement;
  const maxTurnsInput = document.getElementById('max-turns') as HTMLInputElement;
  const startButton = document.getElementById('start-conversation') as HTMLButtonElement;
  const exportButton = document.getElementById('export-conversation') as HTMLButtonElement;
  const conversationOutput = document.getElementById('conversation-output') as HTMLDivElement;
  const addModelButton = document.getElementById('add-model') as HTMLButtonElement;
  const modelInputs = document.getElementById('model-inputs') as HTMLDivElement;
  
  // Conversation state
  let activeConversation: Conversation | null = null;
  let isConversationRunning = false;

  // API key input elements
  const anthropicKeyInput = document.getElementById('anthropic-key') as HTMLInputElement;
  const openaiKeyInput = document.getElementById('openai-key') as HTMLInputElement;
  const hyperbolicKeyInput = document.getElementById('hyperbolic-key') as HTMLInputElement;
  const worldInterfaceKeyInput = document.getElementById('world-interface-key') as HTMLInputElement;

  // Load saved API keys if available
  anthropicKeyInput.value = loadFromLocalStorage('anthropicApiKey', '');
  openaiKeyInput.value = loadFromLocalStorage('openaiApiKey', '');
  hyperbolicKeyInput.value = loadFromLocalStorage('hyperbolicApiKey', '');
  worldInterfaceKeyInput.value = loadFromLocalStorage('worldInterfaceKey', '');

  // Save API keys when changed
  anthropicKeyInput.addEventListener('change', () => saveToLocalStorage('anthropicApiKey', anthropicKeyInput.value));
  openaiKeyInput.addEventListener('change', () => saveToLocalStorage('openaiApiKey', openaiKeyInput.value));
  hyperbolicKeyInput.addEventListener('change', () => saveToLocalStorage('hyperbolicApiKey', hyperbolicKeyInput.value));
  worldInterfaceKeyInput.addEventListener('change', () => saveToLocalStorage('worldInterfaceKey', worldInterfaceKeyInput.value));

  // Color generator for actors
  const colorGenerator = generateDistinctColors();
  const actorColors: Record<string, string> = {};
  
  // Populate model selects
  function populateModelSelects() {
    modelSelects.forEach(select => {
      select.innerHTML = '';
      
      // Add CLI option
      const cliOption = document.createElement('option');
      cliOption.value = 'cli';
      cliOption.textContent = 'CLI';
      select.appendChild(cliOption);
      
      // Add model options
      Object.keys(MODEL_INFO).forEach(modelKey => {
        const option = document.createElement('option');
        option.value = modelKey;
        option.textContent = `${MODEL_INFO[modelKey].display_name} (${modelKey})`;
        select.appendChild(option);
      });
    });
  }
  
  // Add a new model select
  function addModelSelect() {
    const modelCount = modelInputs.children.length;
    const newGroup = document.createElement('div');
    newGroup.className = 'model-input-group';
    
    const label = document.createElement('label');
    label.setAttribute('for', `model-${modelCount}`);
    label.textContent = `Model ${modelCount + 1}:`;
    
    const select = document.createElement('select');
    select.id = `model-${modelCount}`;
    select.className = 'model-select';
    
    newGroup.appendChild(label);
    newGroup.appendChild(select);
    modelInputs.appendChild(newGroup);
    
    // Populate the new select
    populateModelSelect(select);
  }
  
  // Populate a single model select
  function populateModelSelect(select: HTMLSelectElement) {
    // Add CLI option
    const cliOption = document.createElement('option');
    cliOption.value = 'cli';
    cliOption.textContent = 'CLI';
    select.appendChild(cliOption);
    
    // Add model options
    Object.keys(MODEL_INFO).forEach(modelKey => {
      const option = document.createElement('option');
      option.value = modelKey;
      option.textContent = `${MODEL_INFO[modelKey].display_name} (${modelKey})`;
      select.appendChild(option);
    });
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
    } catch (error) {
      console.error('Error loading templates:', error);
      addOutputMessage('System', 'Error loading templates. Please check the console for details.');
    }
  }
  
  // Initialize UI
  populateModelSelects();
  populateTemplateSelect();
  
  // Handle add model button
  addModelButton.addEventListener('click', addModelSelect);
  
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
      addModelButton.disabled = false;
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
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
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
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'actor-response';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'actor-header';
    headerDiv.textContent = `### ${actor} ###`;
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
    
    // Get all model selects (including dynamically added ones)
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
      worldInterfaceKey: worldInterfaceKeyInput.value
    };
    
    // Validate required API keys
    const requiredApis: Record<string, string> = {};
    
    for (const model of models) {
      if (model.toLowerCase() === 'cli') {
        requiredApis['worldInterfaceKey'] = 'World Interface Key';
        continue;
      }
      
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
      addModelButton.disabled = true;
      isConversationRunning = true;
      
      // Load template config
      const configs = await loadTemplate(templateName, models);
      
      if (configs.length !== models.length) {
        throw new Error(`Number of models (${models.length}) does not match the number of elements in the template (${configs.length})`);
      }
      
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
      addModelButton.disabled = false;
    } catch (error) {
      console.error('Error starting conversation:', error);
      addOutputMessage('System', `Error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Reset UI on error
      isConversationRunning = false;
      startButton.textContent = 'Start Conversation';
      startButton.classList.remove('stop');
      addModelButton.disabled = false;
      exportButton.style.display = 'block';
    }
  }
});