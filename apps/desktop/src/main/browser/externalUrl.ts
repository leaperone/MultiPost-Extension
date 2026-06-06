import { shell } from 'electron'

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

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
