/// <reference types="vite/client" />

import type { ElectronAPI } from '@electron-toolkit/preload'
import type { Api } from '../../preload/index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
