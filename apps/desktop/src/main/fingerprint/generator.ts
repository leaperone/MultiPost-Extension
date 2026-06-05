/**
 * Deterministic fingerprint generator
 * Uses accountId as seed for consistent, unique fingerprints
 */

import type {
  FingerprintProfile,
  NavigatorConfig,
  ScreenConfig,
  WebGLConfig,
  CanvasConfig,
  AudioConfig,
  FontsConfig
} from '../../shared/types/fingerprint'

const CHROME_NAVIGATOR_VENDOR = 'Google Inc.'

// Seeded random number generator (Mulberry32)
function createSeededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Convert string to numeric seed
function stringToSeed(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

// Pick random item from array using seeded random
function pickRandom<T>(arr: T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)]
}

// Real-world screen resolutions
const SCREEN_CONFIGS: Array<Omit<ScreenConfig, 'devicePixelRatio'>> = [
  { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24 },
  { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, colorDepth: 24, pixelDepth: 24 },
  { width: 1366, height: 768, availWidth: 1366, availHeight: 728, colorDepth: 24, pixelDepth: 24 },
  { width: 1536, height: 864, availWidth: 1536, availHeight: 824, colorDepth: 24, pixelDepth: 24 },
  { width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, pixelDepth: 24 },
  { width: 1680, height: 1050, availWidth: 1680, availHeight: 1010, colorDepth: 24, pixelDepth: 24 },
  { width: 2880, height: 1800, availWidth: 2880, availHeight: 1760, colorDepth: 30, pixelDepth: 30 },
  { width: 3840, height: 2160, availWidth: 3840, availHeight: 2120, colorDepth: 24, pixelDepth: 24 }
]

// Platform configuration is locked to the host OS to avoid UA/platform mismatches.
function getHostPlatformConfig(): {
  platform: NavigatorConfig['platform']
  vendor: string
  maxTouchPoints: number
} {
  if (process.platform === 'darwin') {
    return { platform: 'MacIntel', vendor: CHROME_NAVIGATOR_VENDOR, maxTouchPoints: 0 }
  }
  if (process.platform === 'win32') {
    return { platform: 'Win32', vendor: CHROME_NAVIGATOR_VENDOR, maxTouchPoints: 0 }
  }
  return { platform: 'Linux x86_64', vendor: CHROME_NAVIGATOR_VENDOR, maxTouchPoints: 0 }
}

function getChromeMajorVersion(): string {
  return (process.versions.chrome || '120.0.0.0').split('.')[0] || '120'
}

// WebGL configurations (real-world GPU combos)
const WINDOWS_WEBGL_CONFIGS: WebGLConfig[] = [
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'NVIDIA Corporation',
    unmaskedRenderer: 'NVIDIA GeForce RTX 3060/PCIe/SSE2'
  },
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'NVIDIA Corporation',
    unmaskedRenderer: 'NVIDIA GeForce RTX 4070/PCIe/SSE2'
  },
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'NVIDIA Corporation',
    unmaskedRenderer: 'NVIDIA GeForce GTX 1660 SUPER/PCIe/SSE2'
  },
  // AMD
  {
    vendor: 'Google Inc. (AMD)',
    renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'AMD',
    unmaskedRenderer: 'AMD Radeon RX 6700 XT'
  },
  {
    vendor: 'Google Inc. (AMD)',
    renderer: 'ANGLE (AMD, AMD Radeon RX 5700 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'AMD',
    unmaskedRenderer: 'AMD Radeon RX 5700'
  },
  // Intel
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Intel Inc.',
    unmaskedRenderer: 'Intel(R) UHD Graphics 630'
  },
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
    unmaskedVendor: 'Intel Inc.',
    unmaskedRenderer: 'Intel(R) Iris(R) Xe Graphics'
  }
]

const MACOS_WEBGL_CONFIGS: WebGLConfig[] = [
  {
    vendor: 'Apple Inc.',
    renderer: 'Apple M1',
    unmaskedVendor: 'Apple Inc.',
    unmaskedRenderer: 'Apple M1'
  },
  {
    vendor: 'Apple Inc.',
    renderer: 'Apple M2',
    unmaskedVendor: 'Apple Inc.',
    unmaskedRenderer: 'Apple M2'
  },
  {
    vendor: 'Apple Inc.',
    renderer: 'Apple M3 Pro',
    unmaskedVendor: 'Apple Inc.',
    unmaskedRenderer: 'Apple M3 Pro'
  }
]

const LINUX_WEBGL_CONFIGS: WebGLConfig[] = [
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060/PCIe/SSE2, OpenGL 4.5)',
    unmaskedVendor: 'NVIDIA Corporation',
    unmaskedRenderer: 'NVIDIA GeForce RTX 3060/PCIe/SSE2'
  },
  {
    vendor: 'Google Inc. (AMD)',
    renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT, OpenGL 4.6)',
    unmaskedVendor: 'AMD',
    unmaskedRenderer: 'AMD Radeon RX 6700 XT'
  },
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Mesa Intel(R) Iris(R) Xe Graphics (TGL GT2), OpenGL 4.6)',
    unmaskedVendor: 'Intel',
    unmaskedRenderer: 'Mesa Intel(R) Iris(R) Xe Graphics (TGL GT2)'
  }
]

function getWebGLConfigsForNavigatorPlatform(platform: NavigatorConfig['platform']): WebGLConfig[] {
  if (platform === 'MacIntel') {
    return MACOS_WEBGL_CONFIGS
  }
  if (platform === 'Win32') {
    return WINDOWS_WEBGL_CONFIGS
  }
  return LINUX_WEBGL_CONFIGS
}

function getHostWebGLConfigs(): WebGLConfig[] {
  return getWebGLConfigsForNavigatorPlatform(getHostPlatformConfig().platform)
}

export function getRuntimeWebGLConfig(
  accountId: string,
  platform: NavigatorConfig['platform']
): WebGLConfig {
  const random = createSeededRandom(stringToSeed(`${accountId}:${platform}:webgl`))
  return pickRandom(getWebGLConfigsForNavigatorPlatform(platform), random)
}

// Common fonts (subset of widely installed fonts)
const COMMON_FONTS = [
  'Arial',
  'Arial Black',
  'Comic Sans MS',
  'Courier New',
  'Georgia',
  'Impact',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'Helvetica',
  'Monaco',
  'Lucida Console',
  'Lucida Sans Unicode',
  'Palatino Linotype',
  'Tahoma',
  'Microsoft Sans Serif',
  'Segoe UI'
]

// Language configurations
const LANGUAGE_CONFIGS: Array<{ language: string; languages: string[] }> = [
  { language: 'zh-CN', languages: ['zh-CN', 'zh', 'en-US', 'en'] },
  { language: 'zh-TW', languages: ['zh-TW', 'zh', 'en-US', 'en'] },
  { language: 'en-US', languages: ['en-US', 'en'] },
  { language: 'ja-JP', languages: ['ja-JP', 'ja', 'en-US', 'en'] }
]

/**
 * Generate a fingerprint profile for an account
 * Same accountId always produces same fingerprint
 */
export function generateFingerprintProfile(accountId: string): Omit<FingerprintProfile, 'id'> {
  const seed = stringToSeed(accountId)
  const random = createSeededRandom(seed)

  // Select configurations deterministically
  const platformConfig = getHostPlatformConfig()
  const screenBase = pickRandom(SCREEN_CONFIGS, random)
  const webgl = pickRandom(getHostWebGLConfigs(), random)
  const languageConfig = pickRandom(LANGUAGE_CONFIGS, random)
  const chromeVersion = getChromeMajorVersion()

  // Hardware specs (realistic ranges)
  const hardwareConcurrency = pickRandom([4, 6, 8, 12, 16], random)
  const deviceMemory = pickRandom([4, 8, 16, 32], random)
  const devicePixelRatio = pickRandom([1, 1.25, 1.5, 2], random)

  // Build user agent
  const userAgent = buildUserAgent(platformConfig.platform, chromeVersion)

  // Select random subset of fonts
  const fontCount = 8 + Math.floor(random() * 6) // 8-13 fonts
  const shuffledFonts = [...COMMON_FONTS].sort(() => random() - 0.5)
  const installedFonts = shuffledFonts.slice(0, fontCount)

  const navigator: NavigatorConfig = {
    userAgent,
    platform: platformConfig.platform,
    language: languageConfig.language,
    languages: languageConfig.languages,
    hardwareConcurrency,
    deviceMemory,
    maxTouchPoints: platformConfig.maxTouchPoints,
    vendor: platformConfig.vendor,
    doNotTrack: pickRandom([null, '1'], random)
  }

  const screen: ScreenConfig = {
    ...screenBase,
    devicePixelRatio
  }

  // Canvas and audio noise (very small values for subtlety)
  const canvas: CanvasConfig = {
    noise: 0.0001 + random() * 0.0009, // 0.0001-0.001
    seed: Math.floor(random() * 1000000)
  }

  const audio: AudioConfig = {
    noise: 0.00001 + random() * 0.00009, // 0.00001-0.0001
    seed: Math.floor(random() * 1000000)
  }

  const fonts: FontsConfig = {
    installed: installedFonts
  }

  const now = Date.now()

  return {
    accountId,
    navigator,
    screen,
    webgl,
    canvas,
    audio,
    fonts,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Build realistic user agent string
 */
function buildUserAgent(platform: NavigatorConfig['platform'], chromeVersion: string): string {
  const chromeFullVersion = `${chromeVersion}.0.0.0`

  switch (platform) {
    case 'MacIntel':
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeFullVersion} Safari/537.36`
    case 'Win32':
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeFullVersion} Safari/537.36`
    case 'Linux x86_64':
      return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeFullVersion} Safari/537.36`
  }
}
