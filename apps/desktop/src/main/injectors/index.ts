import type { WebContents } from 'electron'
import injectorBundles, { injectorGlobalName } from 'virtual:injector-bundles'
import type {
  ArticleData,
  DynamicData,
  PodcastData,
  PlatformType,
  SyncContentData,
  SyncContentType,
  VideoData
} from '@shared/types'
import {
  getDesktopInjectorManifestEntry,
  type DesktopInjectorManifestEntry,
  type ExtensionSyncData
} from './manifest'

export interface ToExtensionSyncDataOptions {
  platform: string
  contentType: SyncContentType
  injectUrl: string
  isAutoPublish: boolean
}

export interface ExtensionFillResult {
  handled: boolean
  ok: boolean
  skipAdapterSubmit: boolean
  error?: string
  reason?: string
  extensionKey?: string
  injectUrl?: string
  accountKey?: string
}

interface InjectedExecutionResult {
  ok: boolean
  error?: string
}

function escapeJsonForScript(json: string): string {
  return json.replace(/[<>&\u2028\u2029]/g, (char) => {
    switch (char) {
      case '<':
        return '\\u003c'
      case '>':
        return '\\u003e'
      case '&':
        return '\\u0026'
      case '\u2028':
        return '\\u2028'
      case '\u2029':
        return '\\u2029'
      default:
        return char
    }
  })
}

function safeJsonStringify(value: unknown): string {
  const json = JSON.stringify(value)
  return escapeJsonForScript(json ?? 'null')
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function prepareDynamicData(data: SyncContentData): SyncContentData {
  const dynamicData = data as DynamicData
  return {
    ...dynamicData,
    images: dynamicData.images ?? [],
    videos: dynamicData.videos ?? []
  }
}

function prepareVideoData(data: SyncContentData): SyncContentData {
  const videoData = data as VideoData
  return {
    ...videoData,
    tags: videoData.tags ?? []
  }
}

function prepareArticleData(data: SyncContentData): SyncContentData {
  const articleData = data as ArticleData
  const htmlContent = articleData.htmlContent ?? ''
  const markdownContent = articleData.markdownContent || htmlContent

  return {
    ...articleData,
    htmlContent,
    markdownContent,
    images: articleData.images ?? []
  }
}

function preparePodcastData(data: SyncContentData): SyncContentData {
  const podcastData = data as PodcastData
  return {
    ...podcastData,
    tags: podcastData.tags ?? []
  }
}

function prepareDataForExtension(data: SyncContentData, contentType: SyncContentType): SyncContentData {
  if (contentType === 'DYNAMIC') {
    return prepareDynamicData(data)
  }
  if (contentType === 'VIDEO') {
    return prepareVideoData(data)
  }
  if (contentType === 'ARTICLE') {
    return prepareArticleData(data)
  }
  if (contentType === 'PODCAST') {
    return preparePodcastData(data)
  }
  return data
}

function getInjectorBundle(entry: DesktopInjectorManifestEntry): string {
  const bundle = injectorBundles[entry.extensionKey]
  if (!bundle) {
    throw new Error(`Missing desktop injector bundle for ${entry.extensionKey}`)
  }
  return bundle
}

function buildExecutionScript(entry: DesktopInjectorManifestEntry, syncData: ExtensionSyncData): string {
  const injectorCall = serializeInjector(getInjectorBundle(entry), syncData)

  return `
    (async () => {
      const __multipostErrors = [];
      const __multipostOriginalConsoleError = console.error;

      function __multipostFormatConsoleArg(arg) {
        if (arg instanceof Error) return arg.message;
        if (typeof arg === "string") return arg;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }

      console.error = (...args) => {
        __multipostErrors.push(args.map(__multipostFormatConsoleArg).join(" "));
        __multipostOriginalConsoleError.apply(console, args);
      };

      try {
        await ${injectorCall};
        if (__multipostErrors.length > 0) {
          return { ok: false, error: __multipostErrors.join("\\n") };
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, error: __multipostFormatConsoleArg(error) };
      } finally {
        console.error = __multipostOriginalConsoleError;
      }
    })()
  `
}

function getInjectorGlobalIdentifier(): string {
  if (!/^[A-Za-z_$][\w$]*$/.test(injectorGlobalName)) {
    throw new Error(`Invalid injector bundle global name: ${injectorGlobalName}`)
  }
  return injectorGlobalName
}

export function serializeInjector(iifeString: string, syncData: ExtensionSyncData): string {
  const injectorGlobalIdentifier = getInjectorGlobalIdentifier()

  return `
    (() => {
      ${iifeString}
      const __multipostInjectorModule = ${injectorGlobalIdentifier};
      const __multipostInjector = __multipostInjectorModule && __multipostInjectorModule.injector;
      if (typeof __multipostInjector !== "function") {
        throw new Error("Desktop injector bundle did not expose an injector function");
      }
      return __multipostInjector(${safeJsonStringify(syncData)});
    })()
  `
}

export function toExtensionSyncData(
  desktopData: SyncContentData,
  { platform, contentType, injectUrl, isAutoPublish }: ToExtensionSyncDataOptions
): ExtensionSyncData {
  const preparedData = prepareDataForExtension(desktopData, contentType)
  const syncData: ExtensionSyncData = {
    platforms: [{ name: platform, injectUrl }],
    isAutoPublish,
    data: preparedData
  }

  if (contentType === 'ARTICLE') {
    syncData.origin = preparedData
  }

  return syncData
}

export async function executeExtensionFill(
  webContents: WebContents,
  platform: PlatformType,
  contentType: SyncContentType,
  normalizedData: SyncContentData,
  isAutoPublish: boolean
): Promise<ExtensionFillResult> {
  const entry = getDesktopInjectorManifestEntry(platform, contentType)
  if (!entry) {
    return {
      handled: false,
      ok: false,
      skipAdapterSubmit: false,
      reason: 'missing-manifest'
    }
  }

  const syncData = toExtensionSyncData(normalizedData, {
    platform: entry.extensionKey,
    contentType,
    injectUrl: entry.injectUrl,
    isAutoPublish
  })
  try {
    const script = buildExecutionScript(entry, syncData)
    const result = (await webContents.executeJavaScript(script)) as InjectedExecutionResult
    return {
      handled: true,
      ok: result.ok,
      error: result.error,
      // TODO(phase3): replace this operation-local skip with real publish confirmation from injectors.
      skipAdapterSubmit: result.ok && isAutoPublish,
      extensionKey: entry.extensionKey,
      injectUrl: entry.injectUrl,
      accountKey: entry.accountKey
    }
  } catch (error) {
    return {
      handled: true,
      ok: false,
      error: formatError(error),
      skipAdapterSubmit: false,
      extensionKey: entry.extensionKey,
      injectUrl: entry.injectUrl,
      accountKey: entry.accountKey
    }
  }
}

export function getExtensionInjectUrl(platform: PlatformType, contentType?: SyncContentType): string | null {
  if (!contentType) {
    return null
  }
  return getDesktopInjectorManifestEntry(platform, contentType)?.injectUrl ?? null
}
