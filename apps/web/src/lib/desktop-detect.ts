import { getRequestHeaders } from '@tanstack/react-start/server';

export async function isDesktopRequest(): Promise<boolean> {
  try {
    return getRequestHeaders().get('x-multipost-desktop') === '1';
  } catch {
    return false;
  }
}
