/**
 * Manages application events
 */

/**
 * Event types
 */
export enum EventType {
  // Conversation events
  CONVERSATION_START = 'conversation:start',
  CONVERSATION_STOP = 'conversation:stop',
  CONVERSATION_PAUSE = 'conversation:pause',
  CONVERSATION_RESUME = 'conversation:resume',
  CONVERSATION_TURN_COMPLETE = 'conversation:turn_complete',
  CONVERSATION_COMPLETE = 'conversation:complete',
  
  // Template events
  TEMPLATE_CHANGE = 'template:change',
  TEMPLATE_SAVE = 'template:save',
  TEMPLATE_CLEAR = 'template:clear',
  
  // Model events
  MODEL_SELECTION_CHANGE = 'model:selection_change',
  
  // API key events
  API_KEY_CHANGE = 'api_key:change',
  
  // UI events
  UI_FONT_SIZE_CHANGE = 'ui:font_size_change',
  UI_WORD_WRAP_CHANGE = 'ui:word_wrap_change',
  
  // Export/import events
  EXPORT_CONVERSATION = 'export:conversation',
  IMPORT_CONVERSATION = 'import:conversation'
}

/**
 * Event data interface
 */
export interface EventData {
  [key: string]: any;
}

/**
 * Event listener type
 */
export type EventListener = (data: EventData) => void;

/**
 * Class to manage application events
 */
export class EventBus {
  private listeners: Map<EventType, EventListener[]> = new Map();
  
  /**
   * Adds an event listener
   * @param eventType The event type to listen for
   * @param listener The listener function
   */
  public on(eventType: EventType, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType)?.push(listener);
  }
  
  /**
   * Removes an event listener
   * @param eventType The event type
   * @param listener The listener to remove
   */
  public off(eventType: EventType, listener: EventListener): void {
    const eventListeners = this.listeners.get(eventType);
    
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    }
  }
  
  /**
   * Emits an event
   * @param eventType The event type to emit
   * @param data The event data
   */
  public emit(eventType: EventType, data: EventData = {}): void {
    const eventListeners = this.listeners.get(eventType);
    
    if (eventListeners) {
      for (const listener of eventListeners) {
        listener(data);
      }
    }
  }
  
  /**
   * Adds a one-time event listener
   * @param eventType The event type to listen for
   * @param listener The listener function
   */
  public once(eventType: EventType, listener: EventListener): void {
    const onceListener = (data: EventData) => {
      this.off(eventType, onceListener);
      listener(data);
    };
    
    this.on(eventType, onceListener);
  }
  
  /**
   * Removes all listeners for an event type
   * @param eventType The event type
   */
  public removeAllListeners(eventType?: EventType): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }
}

/**
 * Singleton instance of the EventBus
 */
export const eventBus = new EventBus();

/**
 * Convenience functions for emitting events
 */

/**
 * Emits a conversation start event
 * @param data Event data
 */
export function emitConversationStart(data: EventData = {}): void {
  eventBus.emit(EventType.CONVERSATION_START, data);
}

/**
 * Emits a conversation stop event
 * @param data Event data
 */
export function emitConversationStop(data: EventData = {}): void {
  eventBus.emit(EventType.CONVERSATION_STOP, data);
}

/**
 * Emits a conversation pause event
 * @param data Event data
 */
export function emitConversationPause(data: EventData = {}): void {
  eventBus.emit(EventType.CONVERSATION_PAUSE, data);
}

/**
 * Emits a conversation resume event
 * @param data Event data
 */
export function emitConversationResume(data: EventData = {}): void {
  eventBus.emit(EventType.CONVERSATION_RESUME, data);
}

/**
 * Emits a conversation turn complete event
 * @param data Event data
 */
export function emitConversationTurnComplete(data: EventData = {}): void {
  eventBus.emit(EventType.CONVERSATION_TURN_COMPLETE, data);
}

/**
 * Emits a conversation complete event
 * @param data Event data
 */
export function emitConversationComplete(data: EventData = {}): void {
  eventBus.emit(EventType.CONVERSATION_COMPLETE, data);
}

/**
 * Emits a template change event
 * @param data Event data
 */
export function emitTemplateChange(data: EventData = {}): void {
  eventBus.emit(EventType.TEMPLATE_CHANGE, data);
}

/**
 * Emits a template save event
 * @param data Event data
 */
export function emitTemplateSave(data: EventData = {}): void {
  eventBus.emit(EventType.TEMPLATE_SAVE, data);
}

/**
 * Emits a template clear event
 * @param data Event data
 */
export function emitTemplateClear(data: EventData = {}): void {
  eventBus.emit(EventType.TEMPLATE_CLEAR, data);
}

/**
 * Emits a model selection change event
 * @param data Event data
 */
export function emitModelSelectionChange(data: EventData = {}): void {
  eventBus.emit(EventType.MODEL_SELECTION_CHANGE, data);
}

/**
 * Emits an API key change event
 * @param data Event data
 */
export function emitApiKeyChange(data: EventData = {}): void {
  eventBus.emit(EventType.API_KEY_CHANGE, data);
}

/**
 * Emits a font size change event
 * @param data Event data
 */
export function emitFontSizeChange(data: EventData = {}): void {
  eventBus.emit(EventType.UI_FONT_SIZE_CHANGE, data);
}

/**
 * Emits a word wrap change event
 * @param data Event data
 */
export function emitWordWrapChange(data: EventData = {}): void {
  eventBus.emit(EventType.UI_WORD_WRAP_CHANGE, data);
}

/**
 * Emits an export conversation event
 * @param data Event data
 */
export function emitExportConversation(data: EventData = {}): void {
  eventBus.emit(EventType.EXPORT_CONVERSATION, data);
}

/**
 * Emits an import conversation event
 * @param data Event data
 */
export function emitImportConversation(data: EventData = {}): void {
  eventBus.emit(EventType.IMPORT_CONVERSATION, data);
}