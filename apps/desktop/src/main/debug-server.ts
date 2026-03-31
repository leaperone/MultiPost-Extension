/**
 * Development-only HTTP debug server for interacting with Electron BrowserViews.
 * Provides full control over publish flow, console log capture, and view inspection.
 *
 * Only starts when is.dev is true.
 *
 * Endpoints:
 *   GET  /views                              - List all views and groups
 *   GET  /views/:groupId                     - Get group data (content + normalized data)
 *   POST /exec                               - Execute JS in a view { viewId, script }
 *   POST /exec-group                         - Execute JS in a group view { groupId, accountId, script }
 *   GET  /screenshot                         - Capture main window screenshot (PNG)
 *   GET  /screenshot?groupId=x&accountId=y   - Capture a specific group view (PNG)
 *   GET  /logs                               - Get console logs (?source=&level=&limit=&since=)
 *   DELETE /logs                             - Clear all captured logs
 *   POST /navigate                           - Navigate home view { url }
 *   POST /group/create                       - Create publish group { contentType, targets, data }
 *   POST /group/:id/fill                     - Trigger content fill for a group
 *   POST /group/:id/submit                   - Submit all targets in a group
 *   GET  /group/:id/cookies?accountId=x      - Get cookies for a group target (&domain=)
 *   POST /devtools                           - Toggle DevTools { groupId, accountId }
 */
import * as http from 'http'
import type { BrowserViewManager } from './browser/browserViewManager'
import type { BrowserWindow } from 'electron'

const DEBUG_PORT = 19527
let server: http.Server | null = null

export function startDebugServer(
  getWindow: () => BrowserWindow | null,
  getManager: () => BrowserViewManager | null
): void {
  if (server) return

  server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${DEBUG_PORT}`)
    const pathname = url.pathname

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const manager = getManager()
    const window = getWindow()

    try {
      // Route matching
      const groupMatch = pathname.match(/^\/group\/([^/]+)\/(\w+)$/)
      const viewsGroupMatch = pathname.match(/^\/views\/([^/]+)$/)

      if (pathname === '/views' && req.method === 'GET') {
        ensureManager(manager)
        json(res, manager!.getDebugInfo())
      } else if (viewsGroupMatch && req.method === 'GET') {
        ensureManager(manager)
        const data = manager!.debugGetGroupData(viewsGroupMatch[1])
        if (!data) return json(res, { error: 'Group not found' }, 404)
        json(res, data)
      } else if (pathname === '/exec' && req.method === 'POST') {
        ensureManager(manager)
        const { viewId, script } = await body(req)
        if (!script) return json(res, { error: 'Missing "script"' }, 400)
        const result = await manager!.debugExecScript(String(viewId || '__home__'), String(script))
        json(res, { result })
      } else if (pathname === '/exec-group' && req.method === 'POST') {
        ensureManager(manager)
        const { groupId, accountId, script } = await body(req)
        if (!groupId || !accountId || !script)
          return json(res, { error: 'Missing groupId, accountId, or script' }, 400)
        const result = await manager!.debugExecGroupScript(
          String(groupId),
          String(accountId),
          String(script)
        )
        json(res, { result })
      } else if (pathname === '/screenshot' && req.method === 'GET') {
        const groupId = url.searchParams.get('groupId')
        const accountId = url.searchParams.get('accountId')
        await handleScreenshot(window, manager, groupId, accountId, res)
      } else if (pathname === '/logs' && req.method === 'GET') {
        ensureManager(manager)
        const logs = manager!.debugGetLogs({
          source: url.searchParams.get('source') || undefined,
          level: url.searchParams.get('level') || undefined,
          since: url.searchParams.has('since') ? Number(url.searchParams.get('since')) : undefined,
          limit: url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : undefined
        })
        json(res, { count: logs.length, logs })
      } else if (pathname === '/logs' && req.method === 'DELETE') {
        ensureManager(manager)
        manager!.debugClearLogs()
        json(res, { cleared: true })
      } else if (pathname === '/navigate' && req.method === 'POST') {
        ensureManager(manager)
        const { url: navUrl } = await body(req)
        if (!navUrl) return json(res, { error: 'Missing "url"' }, 400)
        await manager!.debugNavigate(String(navUrl))
        json(res, { navigated: navUrl })
      } else if (pathname === '/group/create' && req.method === 'POST') {
        ensureManager(manager)
        const { contentType, targets, data } = await body(req)
        if (!contentType || !targets || !data)
          return json(res, { error: 'Missing contentType, targets, or data' }, 400)
        const groupId = await manager!.createPublishGroup({
          contentType: contentType as string,
          targets: targets as Array<{
            accountId: string
            platform: string
            displayName: string
          }>,
          data: data as Record<string, unknown>
        })
        json(res, { groupId })
      } else if (groupMatch && groupMatch[2] === 'fill' && req.method === 'POST') {
        ensureManager(manager)
        await manager!.fillGroupContent(groupMatch[1])
        json(res, { filled: true })
      } else if (groupMatch && groupMatch[2] === 'submit' && req.method === 'POST') {
        ensureManager(manager)
        // submitAllGroupTargets is on the IPC layer; call fillGroupContent first if needed
        // For now, trigger submit for each target
        const info = manager!.getDebugInfo() as { groups: Array<{ id: string; targets: Array<{ accountId: string }> }> }
        const group = info.groups.find((g) => g.id === groupMatch![1])
        if (!group) return json(res, { error: 'Group not found' }, 404)
        for (const target of group.targets) {
          await manager!.submitGroupTarget(groupMatch![1], target.accountId)
        }
        json(res, { submitted: group.targets.length })
      } else if (groupMatch && groupMatch[2] === 'cookies' && req.method === 'GET') {
        ensureManager(manager)
        const accountId = url.searchParams.get('accountId')
        if (!accountId) return json(res, { error: 'Missing accountId param' }, 400)
        const domain = url.searchParams.get('domain') || undefined
        const cookies = await manager!.debugGetCookies(groupMatch[1], accountId, domain)
        json(res, { count: cookies.length, cookies: cookies.map((c) => ({ name: c.name, domain: c.domain, value: c.value.slice(0, 20) + '...' })) })
      } else if (pathname === '/devtools' && req.method === 'POST') {
        ensureManager(manager)
        const { groupId, accountId } = await body(req)
        if (!groupId || !accountId)
          return json(res, { error: 'Missing groupId or accountId' }, 400)
        manager!.debugToggleDevTools(String(groupId), String(accountId))
        json(res, { toggled: true })
      } else {
        json(res, {
          error: 'Not found',
          endpoints: {
            'GET  /views': 'List all views and groups',
            'GET  /views/:groupId': 'Get group data (content + normalized)',
            'POST /exec': 'Execute JS in a view { viewId, script }',
            'POST /exec-group': 'Execute JS in group view { groupId, accountId, script }',
            'GET  /screenshot': 'Capture screenshot (?groupId=&accountId=)',
            'GET  /logs': 'Console logs (?source=&level=&limit=&since=)',
            'DELETE /logs': 'Clear logs',
            'POST /navigate': 'Navigate home { url }',
            'POST /group/create': 'Create publish group { contentType, targets, data }',
            'POST /group/:id/fill': 'Fill content for group',
            'POST /group/:id/submit': 'Submit all targets',
            'GET  /group/:id/cookies': 'Get cookies (?accountId=&domain=)',
            'POST /devtools': 'Toggle DevTools { groupId, accountId }'
          }
        }, 404)
      }
    } catch (error) {
      json(res, { error: String(error) }, 500)
    }
  })

  server.listen(DEBUG_PORT, '127.0.0.1', () => {
    console.log(`[DebugServer] Running at http://127.0.0.1:${DEBUG_PORT}`)
    console.log(`[DebugServer] GET / for endpoint list`)
  })

  server.on('error', (err) => {
    console.error('[DebugServer] Failed to start:', err)
  })
}

// --- Helpers ---

function ensureManager(manager: BrowserViewManager | null): asserts manager is BrowserViewManager {
  if (!manager) throw new Error('BrowserViewManager not initialized')
}

function json(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data, null, 2))
}

function body(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

async function handleScreenshot(
  window: BrowserWindow | null,
  manager: BrowserViewManager | null,
  groupId: string | null,
  accountId: string | null,
  res: http.ServerResponse
): Promise<void> {
  let image: Electron.NativeImage | undefined

  if (groupId && accountId && manager) {
    image = await manager.debugCaptureGroupView(groupId, accountId)
  } else if (window) {
    image = await window.capturePage()
  }

  if (!image) {
    json(res, { error: 'Failed to capture screenshot' }, 500)
    return
  }

  const png = image.toPNG()
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': png.length
  })
  res.end(png)
}
