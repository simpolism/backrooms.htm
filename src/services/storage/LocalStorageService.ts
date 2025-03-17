/**
 * Service for managing local storage operations
 */

/**
 * Saves a value to local storage with error handling
 * @param key The key to store the value under
 * @param value The value to store (will be JSON stringified)
 */
export function saveToLocalStorage(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to local storage: ${error}`);
  }
}

/**
 * Loads a value from local storage with error handling
 * @param key The key to retrieve
 * @param defaultValue The default value to return if the key doesn't exist or an error occurs
 * @returns The parsed value from local storage, or the default value
 */
export function loadFromLocalStorage(key: string, defaultValue: any = null): any {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error(`Error loading from local storage: ${error}`);
    return defaultValue;
  }
}

/**
 * Removes a value from local storage
 * @param key The key to remove
 */
export function removeFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from local storage: ${error}`);
  }
}

/**
 * Checks if a key exists in local storage
 * @param key The key to check
 * @returns True if the key exists, false otherwise
 */
export function existsInLocalStorage(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Error checking local storage: ${error}`);
    return false;
  }
}