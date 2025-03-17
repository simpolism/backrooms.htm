import React, { useState, useEffect } from 'react';
import { TemplateEditorProps, CustomTemplate } from '../types';
import CollapsibleSection from './CollapsibleSection';
import { 
  getAvailableTemplates, 
  getCustomTemplate, 
  saveCustomTemplate, 
  clearCustomTemplate 
} from '../templates';

const TemplateEditor: React.FC<TemplateEditorProps> = ({ 
  selectedTemplate,
  refreshTemplates
}) => {
  const [showEditorForm, setShowEditorForm] = useState<boolean>(false);
  const [templateName, setTemplateName] = useState<string>('');
  const [templateDescription, setTemplateDescription] = useState<string>('');
  const [templateContent, setTemplateContent] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customTemplate, setCustomTemplate] = useState<CustomTemplate | null>(null);

  // Load custom template on mount
  useEffect(() => {
    const template = getCustomTemplate();
    setCustomTemplate(template);
  }, []);

  // Show error message with auto-dismiss
  const showError = (message: string) => {
    setErrorMessage(message);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setErrorMessage(null);
    }, 5000);
  };

  // Edit current template
  const handleEditCurrentTemplate = async () => {
    try {
      let content: string;
      let name: string;
      let description: string = '';
      
      if (selectedTemplate === 'custom') {
        // Edit existing custom template
        if (customTemplate) {
          content = customTemplate.content;
          name = customTemplate.name;
          description = customTemplate.description || '';
        } else {
          throw new Error('Custom template not found');
        }
      } else {
        // Load built-in template
        const response = await fetch(`./public/templates/${selectedTemplate}.jsonl`);
        if (!response.ok) {
          throw new Error(`Template '${selectedTemplate}' not found.`);
        }
        content = await response.text();
        name = `${selectedTemplate} (Custom)`;
        
        // Try to get description from available templates
        const templates = await getAvailableTemplates();
        const templateInfo = templates.find(t => t.name === selectedTemplate);
        if (templateInfo) {
          description = templateInfo.description || '';
        }
      }
      
      // Populate editor form
      setTemplateName(name);
      setTemplateDescription(description);
      setTemplateContent(content);
      
      // Show editor form
      setShowEditorForm(true);
    } catch (error) {
      console.error('Error loading template for editing:', error);
      showError(`Error loading template: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Import template from file
  const handleImportTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jsonl';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
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
          setTemplateName(file.name.replace('.jsonl', ''));
          setTemplateDescription('');
          setTemplateContent(content);
          
          // Show editor form
          setShowEditorForm(true);
        } catch (error) {
          console.error('Invalid JSONL file:', error);
          showError('Invalid JSONL file. Please check the file format.');
        }
      };
      
      reader.onerror = () => {
        showError('Failed to read the file.');
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  // Save template
  const handleSaveTemplate = () => {
    const name = templateName.trim();
    const content = templateContent.trim();
    
    if (!name) {
      showError('Template name is required.');
      return;
    }
    
    if (!content) {
      showError('Template content is required.');
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
      const description = templateDescription.trim();
      
      // Save custom template
      saveCustomTemplate({
        name,
        description,
        content,
        originalName: selectedTemplate !== 'custom' ? selectedTemplate : undefined,
        lastModified: Date.now()
      });
      
      // Update UI
      setShowEditorForm(false);
      setCustomTemplate(getCustomTemplate());
      refreshTemplates();
      
      // Show success message
      showError(`Custom template "${name}" saved successfully.`);
    } catch (error) {
      console.error('Invalid JSONL content:', error);
      showError('Invalid JSONL content. Please check the format.');
    }
  };

  // Export template
  const handleExportTemplate = () => {
    const name = templateName.trim() || 'template';
    const content = templateContent.trim();
    
    if (!content) {
      showError('No content to export.');
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
  };

  // Clear custom template
  const handleClearCustomTemplate = () => {
    clearCustomTemplate();
    setCustomTemplate(null);
    refreshTemplates();
    
    showError('Custom template cleared.');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setShowEditorForm(false);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateContent('');
  };

  return (
    <CollapsibleSection id="template-editor" title="Template Editor" defaultCollapsed={true}>
      {/* Template Editor Controls */}
      <div className="template-editor-controls">
        <button 
          id="edit-current-template" 
          className="secondary-button"
          onClick={handleEditCurrentTemplate}
        >
          Edit Current Template
        </button>
        <button 
          id="import-template" 
          className="secondary-button"
          onClick={handleImportTemplate}
        >
          Import Template
        </button>
      </div>
      
      {/* Error Message */}
      {errorMessage && (
        <div 
          className="template-error-container"
          style={{
            display: 'block',
            marginTop: '15px',
            marginBottom: '15px',
            padding: '8px 10px',
            border: '1px solid #000000',
            fontSize: '14px',
            fontFamily: 'Times New Roman, serif',
            backgroundColor: '#EEEEEE',
            color: '#FF0000',
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <button
            style={{
              position: 'absolute',
              right: '5px',
              top: '5px',
              background: 'none',
              border: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '0 5px',
              lineHeight: '1'
            }}
            onClick={() => setErrorMessage(null)}
            title="Dismiss"
          >
            ×
          </button>
          <div style={{ paddingRight: '20px' }}>
            {errorMessage}
          </div>
        </div>
      )}
      
      {/* Template Editor Form */}
      {showEditorForm && (
        <div id="template-editor-form">
          <div className="input-group">
            <label htmlFor="template-name">Template Name:</label>
            <input 
              type="text" 
              id="template-name" 
              placeholder="Enter template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="template-description">Description:</label>
            <input 
              type="text" 
              id="template-description" 
              placeholder="Brief description of what this template does"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
            />
          </div>
          
          {/* Template Content Editor */}
          <div className="template-content-editor">
            <label htmlFor="template-content">Template Content (JSONL):</label>
            <textarea 
              id="template-content" 
              rows={10}
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
            ></textarea>
          </div>
          
          {/* Template Editor Actions */}
          <div className="template-editor-actions">
            <button 
              id="save-template" 
              className="primary-button"
              onClick={handleSaveTemplate}
            >
              Save as Custom Template
            </button>
            <button 
              id="export-template" 
              className="secondary-button"
              onClick={handleExportTemplate}
            >
              Export to File
            </button>
            <button 
              id="clear-custom-template" 
              className="secondary-button"
              onClick={handleClearCustomTemplate}
            >
              Clear Custom Template
            </button>
            <button 
              id="cancel-edit" 
              className="secondary-button"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Custom Template Status */}
      {customTemplate && (
        <div id="custom-template-status">
          <p>Using custom template: <span id="custom-template-name">{customTemplate.name}</span></p>
          <button 
            id="edit-custom-template" 
            className="secondary-button"
            onClick={handleEditCurrentTemplate}
          >
            Edit
          </button>
          <button 
            id="clear-custom-template-status" 
            className="secondary-button"
            onClick={handleClearCustomTemplate}
          >
            Clear
          </button>
        </div>
      )}
    </CollapsibleSection>
  );
};

export default TemplateEditor;