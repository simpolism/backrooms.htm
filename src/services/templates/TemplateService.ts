/**
 * Service for managing templates
 */
import { CustomTemplate, TemplateConfig } from '../../types';
import { saveToLocalStorage, loadFromLocalStorage } from '../storage/LocalStorageService';

/**
 * Custom template storage key
 */
const CUSTOM_TEMPLATE_STORAGE_KEY = 'customTemplate';

/**
 * Saves a custom template to local storage
 * @param template The template to save
 */
export function saveCustomTemplate(template: CustomTemplate): void {
  saveToLocalStorage(CUSTOM_TEMPLATE_STORAGE_KEY, template);
}

/**
 * Gets the custom template from local storage
 * @returns The custom template or null if not found
 */
export function getCustomTemplate(): CustomTemplate | null {
  return loadFromLocalStorage(CUSTOM_TEMPLATE_STORAGE_KEY, null);
}

/**
 * Clears the custom template from local storage
 */
export function clearCustomTemplate(): void {
  localStorage.removeItem(CUSTOM_TEMPLATE_STORAGE_KEY);
}

/**
 * Interface for template information
 */
export interface TemplateInfo {
  name: string;
  description: string;
}

/**
 * Gets available templates from the server
 * @returns Array of template information
 */
export async function getAvailableTemplates(): Promise<TemplateInfo[]> {
  try {
    // In a browser environment, we'd typically have a predefined list or fetch from an API
    // This is a simplified version that could be expanded with backend support
    const response = await fetch('./public/templates/index.json');
    if (!response.ok) {
      throw new Error('Could not fetch template list');
    }
    
    const data = await response.json();
    
    // Handle both old and new format for backward compatibility
    if (Array.isArray(data.templates)) {
      // Old format: just an array of template names
      return data.templates.map((name: string) => ({
        name,
        description: '' // No description available
      }));
    } else {
      // New format: object with template names as keys and descriptions as values
      return Object.entries(data.templates).map(([name, description]) => ({
        name,
        description: description as string
      }));
    }
  } catch (error) {
    console.error('Error fetching templates:', error);
    // Return a default template if fetch fails
    return [{ name: 'example', description: 'Default example template' }];
  }
}

/**
 * Validates a template
 * @param content The template content to validate
 * @returns True if valid, false otherwise
 */
export function validateTemplate(content: string): boolean {
  try {
    const lines = content.trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        JSON.parse(line); // This will throw if invalid JSON
      }
    }
    return true;
  } catch (error) {
    console.error('Invalid template content:', error);
    return false;
  }
}

/**
 * Exports a template to a file
 * @param name The template name
 * @param content The template content
 */
export function exportTemplate(name: string, content: string): void {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.jsonl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}