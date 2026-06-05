import bundleEntries from './bundleEntries.json'
import type { PlatformType, SyncContentData, SyncContentType } from '@shared/types'

export interface ExtensionSyncDataPlatform {
  name: string
  injectUrl?: string
  extraConfig?: unknown
}

export interface ExtensionSyncData {
  platforms: ExtensionSyncDataPlatform[]
  isAutoPublish: boolean
  data: SyncContentData
  origin?: SyncContentData
}

export interface DesktopInjectorManifestEntry {
  desktopPlatform: PlatformType
  contentType: SyncContentType
  extensionKey: string
  injectUrl: string
  accountKey: string
}

interface DesktopInjectorBundleEntry extends DesktopInjectorManifestEntry {
  source: string
  exportName: string
}

const desktopInjectorBundleEntries = bundleEntries as DesktopInjectorBundleEntry[]

export const desktopInjectorManifest: DesktopInjectorManifestEntry[] = desktopInjectorBundleEntries.map(
  ({ source: _source, exportName: _exportName, ...entry }) => entry
)

export function getDesktopInjectorManifestEntry(
  desktopPlatform: PlatformType,
  contentType: SyncContentType
): DesktopInjectorManifestEntry | undefined {
  return desktopInjectorManifest.find(
    (entry) => entry.desktopPlatform === desktopPlatform && entry.contentType === contentType
  )
}
