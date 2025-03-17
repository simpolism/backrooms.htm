/**
 * Utilities for formatting timestamps, filenames, and other text
 */

/**
 * Formats the current timestamp into a string suitable for filenames
 * @returns Formatted timestamp string (e.g., "2023-01-01_120000")
 */
export function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString()
    .replace(/T/, '_')
    .replace(/\..+/, '')
    .replace(/:/g, '');
}

/**
 * Formats a filename for conversation logs
 * @param models Array of model identifiers
 * @param template Template name
 * @returns Formatted filename
 */
export function formatLogFilename(models: string[], template: string): string {
  const timestamp = formatTimestamp();
  return `${models.join('_')}_${template}_${timestamp}.txt`;
}

/**
 * Formats a timestamp for display in the UI
 * @param options Optional formatting options
 * @returns Formatted time string
 */
export function formatDisplayTime(options: Intl.DateTimeFormatOptions = {}): string {
  const now = new Date();
  const defaultOptions: Intl.DateTimeFormatOptions = { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  return now.toLocaleTimeString([], mergedOptions);
}