/**
 * Browser fingerprint profile for anti-detection
 * Each account has a unique, consistent fingerprint
 */

export interface NavigatorConfig {
  userAgent: string
  platform: 'MacIntel' | 'Win32' | 'Linux x86_64'
  language: string
  languages: string[]
  hardwareConcurrency: number
  deviceMemory: number
  maxTouchPoints: number
  vendor: string
  doNotTrack: string | null
}

export interface ScreenConfig {
  width: number
  height: number
  availWidth: number
  availHeight: number
  colorDepth: number
  pixelDepth: number
  devicePixelRatio: number
}

export interface WebGLConfig {
  vendor: string
  renderer: string
  unmaskedVendor: string
  unmaskedRenderer: string
}

export interface CanvasConfig {
  noise: number
  seed: number
}

export interface AudioConfig {
  noise: number
  seed: number
}

export interface FontsConfig {
  installed: string[]
}

export interface FingerprintProfile {
  id: string
  accountId: string
  navigator: NavigatorConfig
  screen: ScreenConfig
  webgl: WebGLConfig
  canvas: CanvasConfig
  audio: AudioConfig
  fonts: FontsConfig
  createdAt: number
  updatedAt: number
}

/**
 * Database row type for fingerprint_profiles table
 */
export interface FingerprintProfileRow {
  id: string
  account_id: string
  navigator_config: string // JSON
  screen_config: string // JSON
  webgl_config: string // JSON
  canvas_config: string // JSON
  audio_config: string // JSON
  fonts_config: string // JSON
  created_at: number
  updated_at: number
}
