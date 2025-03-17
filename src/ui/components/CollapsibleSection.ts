/**
 * Component for managing collapsible sections
 */
import { saveToLocalStorage, loadFromLocalStorage } from '../../services/storage/LocalStorageService';

/**
 * Class to manage a collapsible section
 */
export class CollapsibleSection {
  private section: HTMLElement;
  private header: HTMLElement;
  private sectionId: string;
  
  /**
   * Creates a new CollapsibleSection instance
   * @param section The section element
   * @param header The header element
   */
  constructor(section: HTMLElement, header: HTMLElement) {
    this.section = section;
    this.header = header;
    
    // Get section ID or create one based on its content
    this.sectionId = section.id ||
      header.querySelector('h2')?.textContent?.toLowerCase().replace(/\s+/g, '-') ||
      'section-' + Math.random().toString(36).substring(2, 9);
    
    // Set ID if not already set
    if (!section.id) {
      section.id = this.sectionId;
    }
    
    this.initialize();
    this.setupEventListeners();
  }
  
  /**
   * Initializes the section state
   */
  private initialize(): void {
    // Load saved collapse state
    const savedState = loadFromLocalStorage(`collapse-${this.sectionId}`, null);
    if (savedState !== null) {
      if (savedState === 'true') {
        this.section.classList.add('collapsed');
      } else {
        this.section.classList.remove('collapsed');
      }
    } else {
      // Set default states for sections
      if (this.sectionId === 'output-settings' || this.sectionId === 'api-keys') {
        // Output settings and API keys should be open by default
        this.section.classList.remove('collapsed');
      } else if (this.sectionId === 'template-editor') {
        // Template editor should be closed by default
        this.section.classList.add('collapsed');
      }
    }
  }
  
  /**
   * Sets up event listeners
   */
  private setupEventListeners(): void {
    this.header.addEventListener('click', () => {
      this.toggleCollapse();
    });
  }
  
  /**
   * Toggles the collapse state
   */
  public toggleCollapse(): void {
    this.section.classList.toggle('collapsed');
    this.saveCollapseState();
  }
  
  /**
   * Expands the section
   */
  public expand(): void {
    this.section.classList.remove('collapsed');
    this.saveCollapseState();
  }
  
  /**
   * Collapses the section
   */
  public collapse(): void {
    this.section.classList.add('collapsed');
    this.saveCollapseState();
  }
  
  /**
   * Saves the current collapse state
   */
  private saveCollapseState(): void {
    saveToLocalStorage(
      `collapse-${this.sectionId}`,
      this.section.classList.contains('collapsed').toString()
    );
  }
  
  /**
   * Checks if the section is collapsed
   * @returns True if collapsed, false otherwise
   */
  public isCollapsed(): boolean {
    return this.section.classList.contains('collapsed');
  }
  
  /**
   * Gets the section ID
   * @returns The section ID
   */
  public getSectionId(): string {
    return this.sectionId;
  }
}

/**
 * Initializes all collapsible sections on the page
 * @returns Array of CollapsibleSection instances
 */
export function initializeCollapsibleSections(): CollapsibleSection[] {
  const sections: CollapsibleSection[] = [];
  const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
  
  collapsibleHeaders.forEach(header => {
    const section = header.closest('.collapsible-section');
    if (!section) return;
    
    sections.push(new CollapsibleSection(section as HTMLElement, header as HTMLElement));
  });
  
  return sections;
}