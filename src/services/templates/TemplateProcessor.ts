/**
 * Service for processing templates
 */
import { TemplateConfig, Message } from '../../types';
import { getModelInfo } from '../../models/ModelRegistry';
import { getCustomTemplate } from './TemplateService';

/**
 * Loads and processes a template
 * @param templateName The name of the template to load
 * @param models Array of model identifiers
 * @returns Array of processed template configurations
 */
export async function loadTemplate(
  templateName: string,
  models: string[]
): Promise<TemplateConfig[]> {
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
    const configs: TemplateConfig[] = lines.map(line => JSON.parse(line));
    
    const companies: string[] = [];
    const actors: string[] = [];
    
    for (let i = 0; i < models.length; i++) {
      const modelInfo = getModelInfo(models[i]);
      if (!modelInfo) {
        throw new Error(`Model information not found for ${models[i]}`);
      }
      companies.push(modelInfo.company);
      actors.push(`${modelInfo.display_name} ${i+1}`);
    }
    
    for (let i = 0; i < configs.length; i++) {
      // Format system prompts and context with actor and company names
      if (configs[i].system_prompt) {
        let formattedPrompt = configs[i].system_prompt;
        
        // Replace placeholders
        for (let j = 0; j < companies.length; j++) {
          formattedPrompt = formattedPrompt.replace(new RegExp(`\\{lm${j+1}_company\\}`, 'g'), companies[j]);
          formattedPrompt = formattedPrompt.replace(new RegExp(`\\{lm${j+1}_actor\\}`, 'g'), actors[j]);
        }
        
        configs[i].system_prompt = formattedPrompt;
      }
      
      // Format context messages
      for (const message of configs[i].context) {
        let formattedContent = message.content;
        
        // Replace placeholders
        for (let j = 0; j < companies.length; j++) {
          formattedContent = formattedContent.replace(new RegExp(`\\{lm${j+1}_company\\}`, 'g'), companies[j]);
          formattedContent = formattedContent.replace(new RegExp(`\\{lm${j+1}_actor\\}`, 'g'), actors[j]);
        }
        
        message.content = formattedContent;
      }
      
      // OpenAI models need system prompt in a different format
      if (
        models[i] in getModelInfo &&
        getModelInfo(models[i])?.company === 'openai' &&
        configs[i].system_prompt
      ) {
        let systemPromptAdded = false;
        
        for (const message of configs[i].context) {
          if (message.role === 'user') {
            message.content = `<SYSTEM>${configs[i].system_prompt}</SYSTEM>\n\n${message.content}`;
            systemPromptAdded = true;
            break;
          }
        }
        
        if (!systemPromptAdded) {
          configs[i].context.push({
            role: 'user',
            content: `<SYSTEM>${configs[i].system_prompt}</SYSTEM>`
          });
        }
      }
    }
    
    return configs;
  } catch (error) {
    console.error(`Error loading template: ${error}`);
    throw error;
  }
}

/**
 * Gets the number of models required for a template
 * @param templateName The name of the template
 * @returns The number of models required
 */
export async function getTemplateModelCount(templateName: string): Promise<number> {
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