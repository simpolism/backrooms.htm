import React, { useState, useEffect } from 'react';
import { TemplateSelectionProps, TemplateInfo } from '../types';
import { getAvailableTemplates, getCustomTemplate } from '../templates';

const TemplateSelection: React.FC<TemplateSelectionProps> = ({
  selectedTemplate,
  setSelectedTemplate,
  isConversationRunning
}) => {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);

  // Load available templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const availableTemplates = await getAvailableTemplates();
        setTemplates(availableTemplates);
        
        // If no template is selected and templates are available, select the first one
        if (!selectedTemplate && availableTemplates.length > 0) {
          setSelectedTemplate(availableTemplates[0].name);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };
    
    loadTemplates();
  }, []);

  // Check for custom template
  useEffect(() => {
    const customTemplate = getCustomTemplate();
    if (customTemplate) {
      // Check if custom template is already in the list
      const customExists = templates.some(t => t.name === 'custom');
      
      if (!customExists) {
        setTemplates(prev => [
          ...prev,
          { 
            name: 'custom', 
            description: `Custom: ${customTemplate.name}${customTemplate.description ? ` - ${customTemplate.description}` : ''}`
          }
        ]);
      }
    }
  }, [templates]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTemplate(e.target.value);
  };

  return (
    <div className="template-selection">
      <h2>Template</h2>
      <div className="template-input-group">
        <label htmlFor="template-select">Template:</label>
        <select 
          id="template-select"
          value={selectedTemplate}
          onChange={handleTemplateChange}
          disabled={isConversationRunning}
        >
          {templates.map((template) => (
            <option key={template.name} value={template.name}>
              {template.description || template.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default TemplateSelection;