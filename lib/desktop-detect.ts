import { headers } from 'next/headers';

/**
 * Server-side desktop detection.
 *
 * Electron 主进程通过 session.webRequest.onBeforeSendHeaders
 * 为每个发往 Web 端的请求注入 X-MultiPost-Desktop: 1 header。
 *
 * Client-side 使用 useIsDesktop() (lib/desktop-bridge.ts)
 * 检查 window.desktopBridge 是否存在。
 */
export async function isDesktopRequest(): Promise<boolean> {
  const headersList = await headers();
  return headersList.get('x-multipost-desktop') === '1';
}
