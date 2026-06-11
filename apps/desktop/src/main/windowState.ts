import { app, screen, type BrowserWindow, type Rectangle } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface PersistedWindowState {
  bounds: Rectangle
  isMaximized: boolean
}

const STATE_FILE = 'window-state.json'

function getStatePath(): string {
  return join(app.getPath('userData'), STATE_FILE)
}

/** Bounds are only restored when still (mostly) visible on a connected display. */
function isVisibleOnSomeDisplay(bounds: Rectangle): boolean {
  return screen.getAllDisplays().some((display) => {
    const area = display.workArea
    return (
      bounds.x >= area.x - bounds.width + 100 &&
      bounds.y >= area.y &&
      bounds.x <= area.x + area.width - 100 &&
      bounds.y <= area.y + area.height - 100
    )
  })
}

export function loadWindowState(): PersistedWindowState | null {
  try {
    const raw = readFileSync(getStatePath(), 'utf-8')
    const state = JSON.parse(raw) as PersistedWindowState
    if (
      !state?.bounds ||
      typeof state.bounds.width !== 'number' ||
      typeof state.bounds.height !== 'number' ||
      !isVisibleOnSomeDisplay(state.bounds)
    ) {
      return null
    }
    return state
  } catch {
    return null
  }
}

function saveWindowState(window: BrowserWindow): void {
  try {
    const state: PersistedWindowState = {
      bounds: window.isMaximized() ? window.getNormalBounds() : window.getBounds(),
      isMaximized: window.isMaximized()
    }
    writeFileSync(getStatePath(), JSON.stringify(state))
  } catch (error) {
    console.warn('[WindowState] Failed to persist window state:', error)
  }
}

/** Debounced persistence on move/resize plus a final write on close. */
export function trackWindowState(window: BrowserWindow): void {
  let timer: NodeJS.Timeout | null = null
  const scheduleSave = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      if (!window.isDestroyed()) saveWindowState(window)
    }, 500)
  }

  window.on('resize', scheduleSave)
  window.on('move', scheduleSave)
  window.on('close', () => {
    if (timer) clearTimeout(timer)
    if (!window.isDestroyed()) saveWindowState(window)
  })
}
