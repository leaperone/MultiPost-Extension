/**
 * @file Browser extension communication utilities
 * @description Provides utilities for communicating with the MultiPost browser extension
 * through window message events
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Sends a request to the browser extension and waits for a response
 * @description Uses window.postMessage for communication with the extension,
 * with timeout and cleanup handling
 * @param {string} action - The action identifier for the extension to process
 * @param {T} data - Optional data to send with the request
 * @param {number} timeout - Timeout in milliseconds before the request fails
 * @returns {Promise<T>} Promise that resolves with the extension's response
 * @throws {Error} When the request times out
 * @example
 * const response = await sendRequest('SOME_ACTION', { data: 'value' }, 5000);
 */
export async function sendRequest<T>(action: string, data?: T, timeout: number = 5000): Promise<T> {
  const traceId = uuidv4();

  return new Promise<T>((resolve, reject) => {
    // Create message handler
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'response' && event.data.action === action && event.data.traceId === traceId) {
        cleanup();
        resolve(event.data.data);
      }
    };

    // Create timeout handler
    let timeoutId: NodeJS.Timeout | undefined;
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    }

    // Cleanup function
    const cleanup = () => {
      window.removeEventListener('message', messageHandler);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    // Add event listener
    window.addEventListener('message', messageHandler);

    // Send the message
    window.postMessage(
      {
        type: 'request',
        traceId,
        action,
        data,
      },
      '*',
    );
  });
}

/**
 * Checks if the MultiPost extension service is running and accessible
 * @description Sends a status check request to the extension
 * @param {number} timeout - Timeout in milliseconds before the check fails
 * @returns {Promise<boolean>} True if the service is running, false otherwise
 * @example
 * const isServiceRunning = await checkServiceStatus(5000);
 */
export async function checkServiceStatus(timeout: number = 5000): Promise<boolean> {
  try {
    // Send request and wait for actual response
    await sendRequest<void>('MUTLIPOST_EXTENSION_CHECK_SERVICE_STATUS', undefined, timeout);
    return true;
  } catch (error) {
    console.error('Service check failed:', error);
    return false;
  }
}

/**
 * Opens the extension options page
 * @description Sends a request to the extension to open its options page
 * @param {number} timeout - Timeout in milliseconds before the request fails
 * @returns {Promise<boolean>} True if successful, false if failed
 * @example
 * const opened = await openOptions(5000);
 */
export async function openOptions(timeout: number = 5000): Promise<boolean> {
  try {
    await sendRequest<void>('MUTLIPOST_EXTENSION_OPEN_OPTIONS', undefined, timeout);
    return true;
  } catch (error) {
    console.error('Failed to open extension options:', error);
    return false;
  }
}
