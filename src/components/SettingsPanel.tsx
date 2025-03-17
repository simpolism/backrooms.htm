import React, { useState, useEffect, useCallback } from 'react';
import { SettingsPanelProps, ConversationOutputItem } from '../types';
import ApiKeysSection from './ApiKeysSection';
import TemplateSelection from './TemplateSelection';
import TemplateEditor from './TemplateEditor';
import ModelSelection from './ModelSelection';
import OutputSettings from './OutputSettings';
import ConversationControls from './ConversationControls';
import { Conversation } from '../conversation';
import { loadTemplate } from '../templates';
import { getCurrentTimestamp, generateUniqueId } from '../utils';

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  apiKeys,
  setApiKeys,
  fontSize,
  setFontSize,
  wordWrap,
  setWordWrap,
  maxTurns,
  setMaxTurns,
  maxOutputLength,
  setMaxOutputLength,
  selectedTemplate,
  setSelectedTemplate,
  selectedModels,
  setSelectedModels,
  isConversationRunning,
  setIsConversationRunning,
  isPaused,
  setIsPaused,
  showExportButton,
  setShowExportButton,
  conversationOutput,
  setConversationOutput
}) => {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [refreshTemplatesTrigger, setRefreshTemplatesTrigger] = useState<number>(0);

  // Function to refresh templates
  const refreshTemplates = useCallback(() => {
    setRefreshTemplatesTrigger(prev => prev + 1);
  }, []);

  // Function to add output message
  const addOutputMessage = useCallback((actor: string, content: string, elementId?: string, isLoading: boolean = false) => {
    const timestamp = getCurrentTimestamp();
    const id = elementId || generateUniqueId();
    
    setConversationOutput((prev: ConversationOutputItem[]) => {
      // Check if we're updating an existing message
      if (elementId) {
        return prev.map((message: ConversationOutputItem) =>
          message.id === elementId
            ? { ...message, content, timestamp }
            : message
        );
      }
      
      // Otherwise add a new message
      const newOutput = [...prev, { actor, content, timestamp, id }];
      return newOutput;
    });
  }, [setConversationOutput]);

  // Start conversation
  const startConversation = useCallback(async () => {
    // Hide export button when starting a new conversation
    setShowExportButton(false);
    
    // Clear previous output
    setConversationOutput([]);
    
    // Validate required API keys
    const requiredApis: Record<string, string> = {};
    
    for (const model of selectedModels) {
      const company = model.includes('hyperbolic') ? 'hyperbolic' : 
                     model.includes('openrouter') ? 'openrouter' : '';
      
      if (company === 'hyperbolic') {
        requiredApis['hyperbolicApiKey'] = 'Hyperbolic API Key';
      } else if (company === 'openrouter') {
        requiredApis['openrouterApiKey'] = 'OpenRouter API Key';
      }
    }
    
    // Check if any required API keys are missing
    const missingKeys: string[] = [];
    for (const [key, name] of Object.entries(requiredApis)) {
      if (!apiKeys[key as keyof typeof apiKeys]) {
        missingKeys.push(name);
      }
    }
    
    if (missingKeys.length > 0) {
      addOutputMessage('System', `Error: Missing required API key(s): ${missingKeys.join(', ')}`);
      return;
    }
    
    try {
      // Update UI to show we're in conversation mode
      setIsConversationRunning(true);
      setIsPaused(false);
      
      // Verify template exists and has the correct number of models
      try {
        const configs = await loadTemplate(selectedTemplate, selectedModels);
        if (configs.length !== selectedModels.length) {
          throw new Error(`Invalid template: Number of models (${selectedModels.length}) does not match the number of elements in the template (${configs.length})`);
        }
        
        // Extract system prompts and contexts
        const systemPrompts = configs.map(config => config.system_prompt || null);
        const contexts = configs.map(config => config.context || []);
        
        // Start conversation
        const conversation = new Conversation(
          selectedModels,
          systemPrompts,
          contexts,
          apiKeys,
          maxTurns ? parseInt(maxTurns) : Infinity,
          maxOutputLength ? parseInt(maxOutputLength) : 512,
          addOutputMessage
        );
        
        setActiveConversation(conversation);
        
        addOutputMessage('System', `Starting conversation with template "${selectedTemplate}"...`);
        await conversation.start();
        
        // Conversation ended naturally
        setIsConversationRunning(false);
        setShowExportButton(true);
      } catch (error) {
        throw new Error(`Invalid template: ${error instanceof Error ? error.message : String(error)}`);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      addOutputMessage('System', `Error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Reset UI on error
      setIsConversationRunning(false);
      setIsPaused(false);
      setShowExportButton(true);
    }
  }, [
    selectedTemplate, 
    selectedModels, 
    apiKeys, 
    maxTurns, 
    maxOutputLength, 
    addOutputMessage, 
    setIsConversationRunning, 
    setIsPaused, 
    setShowExportButton, 
    setConversationOutput
  ]);

  // Stop conversation
  const stopConversation = useCallback(() => {
    if (activeConversation) {
      activeConversation.stop();
      addOutputMessage('System', 'Conversation stopped by user.');
      
      // Update UI
      setIsConversationRunning(false);
      setIsPaused(false);
      setShowExportButton(true);
    }
  }, [activeConversation, addOutputMessage, setIsConversationRunning, setIsPaused, setShowExportButton]);

  // Pause conversation
  const pauseConversation = useCallback(() => {
    if (activeConversation && isConversationRunning) {
      activeConversation.pause();
      setIsPaused(true);
    }
  }, [activeConversation, isConversationRunning, setIsPaused]);

  // Resume conversation
  const resumeConversation = useCallback(() => {
    if (activeConversation && isConversationRunning) {
      activeConversation.resume();
      setIsPaused(false);
    }
  }, [activeConversation, isConversationRunning, setIsPaused]);

  // Export conversation
  const exportConversation = useCallback(() => {
    const conversationText = conversationOutput
      .map(message => {
        return `### ${message.actor} [${message.timestamp}] ###\n${message.content}\n`;
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
  }, [conversationOutput]);

  // Load conversation
  const loadConversation = useCallback((file: File) => {
    // Stop any active conversation
    if (activeConversation && isConversationRunning) {
      stopConversation();
    }
    
    // Reset UI state
    setIsConversationRunning(false);
    setIsPaused(false);
    
    // Clear existing conversation
    setConversationOutput([]);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      try {
        // Use regex to find all message blocks
        // Each message starts with a header line "### Actor [timestamp] ###"
        const messageRegex = /### (.*?) \[(.*?)\] ###\n([\s\S]*?)(?=\n### |$)/g;
        let match;
        const newOutput: ConversationOutputItem[] = [];
        
        while ((match = messageRegex.exec(content)) !== null) {
          const actor = match[1];
          const timestamp = match[2];
          const messageContent = match[3].trim();
          
          if (messageContent) {
            // Add the message to the output
            newOutput.push({
              actor,
              content: messageContent,
              timestamp,
              id: generateUniqueId()
            });
          }
        }
        
        // Update conversation output
        setConversationOutput(newOutput);
        
        // Show export button after loading
        setShowExportButton(true);
        
        // Add a system message indicating successful load
        addOutputMessage('System', 'Conversation loaded successfully.');
      } catch (error) {
        console.error('Error parsing conversation:', error);
        addOutputMessage('System', `Error loading conversation: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    reader.onerror = () => {
      addOutputMessage('System', 'Error: Failed to read the file.');
    };
    
    reader.readAsText(file);
  }, [activeConversation, isConversationRunning, stopConversation, setIsConversationRunning, setIsPaused, setConversationOutput, setShowExportButton, addOutputMessage]);

  return (
    <div className="settings-panel">
      <ApiKeysSection 
        apiKeys={apiKeys}
        setApiKeys={setApiKeys}
      />
      
      <TemplateSelection 
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        isConversationRunning={isConversationRunning}
      />
      
      <TemplateEditor 
        selectedTemplate={selectedTemplate}
        refreshTemplates={refreshTemplates}
      />
      
      <ModelSelection 
        selectedModels={selectedModels}
        setSelectedModels={setSelectedModels}
        apiKeys={apiKeys}
        selectedTemplate={selectedTemplate}
        isConversationRunning={isConversationRunning}
      />
      
      <OutputSettings 
        fontSize={fontSize}
        setFontSize={setFontSize}
        wordWrap={wordWrap}
        setWordWrap={setWordWrap}
        maxTurns={maxTurns}
        setMaxTurns={setMaxTurns}
        maxOutputLength={maxOutputLength}
        setMaxOutputLength={setMaxOutputLength}
        isConversationRunning={isConversationRunning}
      />
      
      <ConversationControls 
        isConversationRunning={isConversationRunning}
        isPaused={isPaused}
        showExportButton={showExportButton}
        startConversation={startConversation}
        stopConversation={stopConversation}
        pauseConversation={pauseConversation}
        resumeConversation={resumeConversation}
        exportConversation={exportConversation}
        loadConversation={loadConversation}
      />
    </div>
  );
};

export default SettingsPanel;