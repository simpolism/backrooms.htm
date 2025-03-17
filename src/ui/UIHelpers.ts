/**
 * UI helper functions for common operations
 */
import { saveToLocalStorage } from '../services/storage/LocalStorageService';

/**
 * Creates an element with specified attributes and properties
 * @param tag The HTML tag name
 * @param attributes Object containing attributes to set
 * @param properties Object containing properties to set
 * @param children Array of child elements or text content
 * @returns The created element
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  properties: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = []
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  // Set properties
  Object.entries(properties).forEach(([key, value]) => {
    (element as any)[key] = value;
  });
  
  // Add children
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });
  
  return element;
}

/**
 * Shows a temporary message
 * @param container The container element
 * @param message The message to show
 * @param isError Whether this is an error message
 * @param duration How long to show the message (ms)
 */
export function showTemporaryMessage(
  container: HTMLElement,
  message: string,
  isError: boolean = false,
  duration: number = 5000
): void {
  // Set message and styling
  container.textContent = message;
  
  // Apply styling based on message type
  if (isError) {
    container.style.backgroundColor = '#EEEEEE';
    container.style.color = '#FF0000';
  } else {
    container.style.backgroundColor = '#EEEEEE';
    container.style.color = '#000000';
  }
  
  // Show the message with a fade-in effect
  container.style.opacity = '0';
  container.style.display = 'block';
  
  // Trigger reflow to ensure transition works
  void container.offsetWidth;
  container.style.opacity = '1';
  
  // Clear any existing timeout
  const existingTimeout = container.dataset.timeoutId;
  if (existingTimeout) {
    window.clearTimeout(parseInt(existingTimeout));
  }
  
  // Set timeout to hide the message with fade-out effect
  const timeoutId = window.setTimeout(() => {
    container.style.opacity = '0';
    
    // After fade-out completes, hide the element
    setTimeout(() => {
      container.style.display = 'none';
    }, 300); // Match the transition duration
  }, duration);
  
  // Store timeout ID in dataset
  container.dataset.timeoutId = timeoutId.toString();
}

/**
 * Creates a message container for temporary messages
 * @param className Optional CSS class name
 * @returns The created container element
 */
export function createMessageContainer(className: string = 'message-container'): HTMLDivElement {
  const container = createElement('div', { class: className });
  
  // Set styles
  container.style.display = 'none';
  container.style.marginTop = '15px';
  container.style.marginBottom = '10px';
  container.style.padding = '8px 10px';
  container.style.border = '1px solid #000000';
  container.style.fontSize = '14px';
  container.style.fontFamily = 'Times New Roman, serif';
  container.style.textAlign = 'center';
  container.style.transition = 'opacity 0.3s ease';
  container.style.width = '100%';
  container.style.boxSizing = 'border-box';
  
  return container;
}

/**
 * Initializes a collapsible section
 * @param section The section element
 * @param header The header element
 */
export function initializeCollapsibleSection(section: HTMLElement, header: HTMLElement): void {
  if (!section) return;
  
  // Get section ID or create one based on its content
  const sectionId = section.id ||
    header.querySelector('h2')?.textContent?.toLowerCase().replace(/\\s+/g, '-') ||
    'section-' + Math.random().toString(36).substring(2, 9);
  
  // Set ID if not already set
  if (!section.id) {
    section.id = sectionId;
  }
  
  // Load saved collapse state
  const savedState = localStorage.getItem(`collapse-${sectionId}`);
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
  
  // Add click handler
  header.addEventListener('click', () => {
    section.classList.toggle('collapsed');
    // Save collapse state
    saveToLocalStorage(`collapse-${sectionId}`, section.classList.contains('collapsed').toString());
  });
}

/**
 * Creates a toggle switch
 * @param id The input element ID
 * @param labelText The label text
 * @param checked Whether the switch is initially checked
 * @param onChange Callback for change events
 * @returns The created toggle switch container
 */
export function createToggleSwitch(
  id: string,
  labelText: string,
  checked: boolean = false,
  onChange?: (checked: boolean) => void
): HTMLDivElement {
  const container = createElement('div', { class: 'toggle-switch' });
  
  const label = createElement('label', { for: id }, {}, [labelText]);
  
  const input = createElement('input', { type: 'checkbox', id }, {
    checked
  });
  
  const slider = createElement('span', { class: 'slider' });
  
  if (onChange) {
    input.addEventListener('change', () => {
      onChange(input.checked);
    });
    
    // Also add click handler to the container for better usability
    container.addEventListener('click', (e) => {
      // Prevent double triggering when clicking directly on the checkbox
      if (e.target !== input) {
        input.checked = !input.checked;
        onChange(input.checked);
      }
    });
  }
  
  container.appendChild(label);
  container.appendChild(input);
  container.appendChild(slider);
  
  return container;
}