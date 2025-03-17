import React, { useState, useEffect, useCallback } from 'react';
import { ModelSelectionProps } from '../types';
import { MODEL_INFO } from '../models';
import { getTemplateModelCount } from '../templates';
import { useLocalStorage } from '../hooks/useLocalStorage';

const ModelSelection: React.FC<ModelSelectionProps> = ({
  selectedModels,
  setSelectedModels,
  apiKeys,
  selectedTemplate,
  isConversationRunning
}) => {
  const [modelCount, setModelCount] = useState<number>(2);
  const [openRouterModels, setOpenRouterModels] = useState<any[]>([]);
  const [openRouterModelsLoading, setOpenRouterModelsLoading] = useState<boolean>(false);
  const [openRouterModelsError, setOpenRouterModelsError] = useState<string | null>(null);
  
  // Custom OpenRouter model selections
  const [customOpenRouterModels, setCustomOpenRouterModels] = useLocalStorage<Record<string, { id: string; name: string }>>('openrouter_custom_models', {});

  // Fetch OpenRouter models
  const fetchOpenRouterModels = useCallback(async (apiKey: string) => {
    if (!apiKey) return [];
    
    try {
      setOpenRouterModelsLoading(true);
      setOpenRouterModelsError(null);
      
      // Check if we have cached models and they're not expired
      const cachedData = localStorage.getItem('openrouterModelsCache');
      if (cachedData) {
        try {
          const { models, timestamp } = JSON.parse(cachedData);
          // Cache expires after 1 hour (3600000 ms)
          if (Date.now() - timestamp < 3600000) {
            setOpenRouterModelsLoading(false);
            setOpenRouterModels(models);
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
      localStorage.setItem('openrouterModelsCache', JSON.stringify({
        models: data.data,
        timestamp: Date.now()
      }));
      
      setOpenRouterModels(data.data);
      setOpenRouterModelsLoading(false);
      return data.data;
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      setOpenRouterModelsError(error instanceof Error ? error.message : String(error));
      setOpenRouterModelsLoading(false);
      return [];
    }
  }, []);

  // Update model count based on template
  useEffect(() => {
    if (!selectedTemplate) return;
    
    const updateModelCount = async () => {
      try {
        const count = await getTemplateModelCount(selectedTemplate);
        setModelCount(count);
        
        // Ensure we have enough models selected
        if (selectedModels.length < count) {
          const newSelectedModels = [...selectedModels];
          while (newSelectedModels.length < count) {
            // Add default models
            const defaultModel = Object.keys(MODEL_INFO)[0];
            newSelectedModels.push(defaultModel);
          }
          setSelectedModels(newSelectedModels);
        } else if (selectedModels.length > count) {
          // Trim excess models
          setSelectedModels(selectedModels.slice(0, count));
        }
      } catch (error) {
        console.error('Error getting template model count:', error);
      }
    };
    
    updateModelCount();
  }, [selectedTemplate, selectedModels]);

  // Fetch OpenRouter models when API key changes
  useEffect(() => {
    if (apiKeys.openrouterApiKey) {
      fetchOpenRouterModels(apiKeys.openrouterApiKey);
    }
  }, [apiKeys.openrouterApiKey, fetchOpenRouterModels]);

  // Handle model selection change
  const handleModelChange = (index: number, value: string) => {
    const newSelectedModels = [...selectedModels];
    newSelectedModels[index] = value;
    setSelectedModels(newSelectedModels);
  };

  // Handle custom OpenRouter model selection
  const handleCustomOpenRouterModelSelect = (index: number, modelId: string, modelName: string) => {
    setCustomOpenRouterModels({
      ...customOpenRouterModels,
      [`model_${index}`]: { id: modelId, name: modelName }
    });
  };

  // Render OpenRouter model autocomplete
  const renderOpenRouterAutocomplete = (index: number) => {
    if (!apiKeys.openrouterApiKey || openRouterModelsLoading) return null;
    
    const customModel = customOpenRouterModels[`model_${index}`];
    
    return (
      <div className="model-input-subgroup">
        <label htmlFor={`openrouter-model-${index}`}>OpenRouter:</label>
        <div className="openrouter-autocomplete-container">
          <input
            id={`openrouter-model-${index}`}
            type="text"
            className="openrouter-autocomplete-input"
            placeholder="Search OpenRouter models..."
            value={customModel?.name || ''}
            onChange={() => {}} // Handled by dropdown
            disabled={isConversationRunning}
          />
          <div className="openrouter-autocomplete-dropdown">
            {openRouterModelsError ? (
              <div className="openrouter-autocomplete-item error">
                Error loading models: {openRouterModelsError}
              </div>
            ) : (
              openRouterModels.slice(0, 10).map((model) => (
                <div
                  key={model.id}
                  className="openrouter-autocomplete-item"
                  onClick={() => handleCustomOpenRouterModelSelect(index, model.id, model.name || model.id)}
                >
                  {model.name || model.id}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="model-selection">
      <h2>Models</h2>
      <div id="model-inputs" className="model-inputs">
        {Array.from({ length: modelCount }).map((_, index) => (
          <div key={index} className="model-input-group">
            <label htmlFor={`model-${index}`}>Model {index + 1}:</label>
            <select
              id={`model-${index}`}
              className="model-select"
              value={selectedModels[index] || ''}
              onChange={(e) => handleModelChange(index, e.target.value)}
              disabled={isConversationRunning}
            >
              {Object.keys(MODEL_INFO).map((modelKey) => {
                const modelInfo = MODEL_INFO[modelKey];
                const company = modelInfo.company;
                
                // Determine if this model's API key is available
                let apiKeyAvailable = false;
                let apiKeyName = '';
                
                if (company === 'hyperbolic' || company === 'hyperbolic_completion') {
                  apiKeyAvailable = !!apiKeys.hyperbolicApiKey;
                  apiKeyName = 'Hyperbolic';
                } else if (company === 'openrouter') {
                  apiKeyAvailable = !!apiKeys.openrouterApiKey;
                  apiKeyName = 'OpenRouter';
                }
                
                return (
                  <option 
                    key={modelKey} 
                    value={modelKey}
                    style={{ color: apiKeyAvailable ? undefined : '#999' }}
                  >
                    {modelInfo.display_name} ({modelKey}) - {apiKeyName}
                    {!apiKeyAvailable && ' [API Key Missing]'}
                  </option>
                );
              })}
            </select>
            
            {/* Show OpenRouter autocomplete for custom selector */}
            {selectedModels[index] === 'openrouter_custom' && 
             MODEL_INFO[selectedModels[index]]?.is_custom_selector && 
             apiKeys.openrouterApiKey && 
             renderOpenRouterAutocomplete(index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModelSelection;