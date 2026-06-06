import { shell } from 'electron'

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const SUPPORTED_BROWSER_NAVIGATION_PROTOCOLS = new Set([
  'http:',
  'https:',
  'about:',
  'file:',
  'local-file:',
  'data:',
  'blob:',
  'devtools:'
])

export function isSupportedBrowserNavigationUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    return SUPPORTED_BROWSER_NAVIGATION_PROTOCOLS.has(parsedUrl.protocol)
  } catch {
    return false
  }
}

export async function openExternalUrl(url: string): Promise<boolean> {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(url)
  } catch {
    console.warn('[ExternalUrl] Blocked invalid external URL:', url)
    return false
  }

  if (!ALLOWED_EXTERNAL_PROTOCOLS.has(parsedUrl.protocol)) {
    console.warn('[ExternalUrl] Blocked unsupported external protocol:', parsedUrl.protocol, url)
    return false
  }

  try {
    await shell.openExternal(parsedUrl.toString())
    return true
  } catch (error) {
    console.warn('[ExternalUrl] Failed to open external URL:', error)
    return false
  }
}
