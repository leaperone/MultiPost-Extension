import { app, Menu, nativeImage, Tray } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

/**
 * Windows/Linux tray so "close = keep running in background" has a visible
 * anchor and an explicit quit. macOS skips the tray — the Dock already plays
 * this role there.
 */
export function createTray(showMainWindow: () => void): void {
  if (tray || process.platform === 'darwin') return

  const iconPath = join(__dirname, '../../resources/icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  // Tray icons need to be small; resize keeps Windows from showing a blurry 512px asset
  tray = new Tray(icon.isEmpty() ? icon : icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('MultiPost')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示 MultiPost', click: showMainWindow },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit()
        }
      }
    ])
  )
  tray.on('click', showMainWindow)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
