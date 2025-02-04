import { v4 as uuidv4 } from 'uuid';

export type ExtensionExternalRequest<T> = {
  type: 'request';
  traceId: string;
  action: string;
  data: T;
};

export interface ExtensionExternalResponse<T> {
  type: 'response';
  traceId: string;
  action: string;
  code: number;
  message: string;
  data: T;
}

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

export async function openOptions(timeout: number = 5000): Promise<boolean> {
  try {
    await sendRequest<void>('MUTLIPOST_EXTENSION_OPEN_OPTIONS', undefined, timeout);
    return true;
  } catch (error) {
    console.error('Failed to open extension options:', error);
    return false;
  }
}
