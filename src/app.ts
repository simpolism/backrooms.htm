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
  const conversationOutput = document.getElementById('conversation-output') as HTMLDivElement;
  const addModelButton = document.getElementById('add-model') as HTMLButtonElement;
  const modelInputs = document.getElementById('model-inputs') as HTMLDivElement;

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
  
  // Handle start conversation button
  startButton.addEventListener('click', startConversation);
  
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
      // Disable UI during conversation
      startButton.disabled = true;
      addModelButton.disabled = true;
      
      // Load template config
      const configs = await loadTemplate(templateName, models);
      
      if (configs.length !== models.length) {
        throw new Error(`Number of models (${models.length}) does not match the number of elements in the template (${configs.length})`);
      }
      
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
        addOutputMessage
      );
      
      addOutputMessage('System', 'Starting conversation...');
      await conversation.start();
    } catch (error) {
      console.error('Error starting conversation:', error);
      addOutputMessage('System', `Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Re-enable UI
      startButton.disabled = false;
      addModelButton.disabled = false;
    }
  }
});