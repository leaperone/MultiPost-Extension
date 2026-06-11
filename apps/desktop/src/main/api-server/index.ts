/**
 * Production external API server: REST under /v1/* plus an MCP endpoint at
 * /mcp (Streamable HTTP). Strictly opt-in via settings and loopback-only.
 *
 * Security model:
 * - binds 127.0.0.1 only; remote use goes through an SSH tunnel
 * - every request needs `Authorization: Bearer <token>` (constant-time check)
 * - Host header must be loopback (DNS-rebinding guard) and CORS stays closed
 *   so web pages cannot drive the API from a browser
 */
import * as http from 'http'
import { timingSafeEqual } from 'crypto'
import { handleApiRoute, sendError, sendJson } from './routes'
import { handleMcpRequest } from './mcp'
import { getExternalApiSettings } from '../appSettings'

const MAX_BODY_BYTES = 2 * 1024 * 1024

let server: http.Server | null = null
let activePort: number | null = null
// Kept in sync by syncExternalApiServer so a token regeneration takes effect
// without a listener restart.
let activeToken = ''

function isAllowedHost(hostHeader: string | undefined, port: number): boolean {
  if (!hostHeader) return false
  return (
    hostHeader === `127.0.0.1:${port}` ||
    hostHeader === `localhost:${port}` ||
    hostHeader === '127.0.0.1' ||
    hostHeader === 'localhost'
  )
}

function isAuthorized(authHeader: string | undefined, token: string): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false
  const provided = Buffer.from(authHeader.slice('Bearer '.length))
  const expected = Buffer.from(token)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(undefined)
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

export function getExternalApiStatus(): { running: boolean; port: number | null } {
  return { running: Boolean(server), port: activePort }
}

export async function startExternalApiServer(): Promise<void> {
  if (server) return
  const settings = getExternalApiSettings()
  const { port } = settings
  activeToken = settings.token

  const httpServer = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`)

      if (!isAllowedHost(req.headers.host, port)) {
        sendJson(res, { error: { code: 'forbidden', message: 'Invalid Host header' } }, 403)
        return
      }

      // Unauthenticated discovery endpoint: no data, just identity.
      if (url.pathname === '/' || url.pathname === '/v1/health') {
        sendJson(res, {
          name: 'multipost-desktop-api',
          docs: 'https://multipost.app/docs/api-reference/desktop'
        })
        return
      }

      if (!isAuthorized(req.headers.authorization, activeToken)) {
        sendJson(res, { error: { code: 'unauthorized', message: 'Invalid or missing Bearer token' } }, 401)
        return
      }

      const body = await readBody(req)

      if (url.pathname === '/mcp') {
        await handleMcpRequest(req, res, body)
        return
      }

      const handled = await handleApiRoute({
        method: req.method || 'GET',
        pathname: url.pathname,
        searchParams: url.searchParams,
        body,
        res
      })
      if (!handled) {
        sendJson(res, { error: { code: 'not_found', message: `No route: ${req.method} ${url.pathname}` } }, 404)
      }
    } catch (error) {
      if (!res.headersSent) {
        sendError(res, error)
      } else {
        res.end()
      }
    }
  })

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => reject(error)
    httpServer.once('error', onError)
    httpServer.listen(port, '127.0.0.1', () => {
      httpServer.removeListener('error', onError)
      resolve()
    })
  })

  server = httpServer
  activePort = port
  console.log(`[ExternalApi] Running at http://127.0.0.1:${port} (MCP at /mcp)`)
}

export async function stopExternalApiServer(): Promise<void> {
  if (!server) return
  const current = server
  server = null
  activePort = null
  await new Promise<void>((resolve) => {
    current.close(() => resolve())
    // Drop keep-alive connections so close() does not hang
    current.closeAllConnections?.()
  })
  console.log('[ExternalApi] Stopped')
}

/** Bring the server in line with current settings (start/stop/restart). */
export async function syncExternalApiServer(): Promise<void> {
  const settings = getExternalApiSettings()
  if (!settings.enabled) {
    await stopExternalApiServer()
    return
  }
  if (server && activePort === settings.port) {
    activeToken = settings.token
    return
  }
  await stopExternalApiServer()
  await startExternalApiServer()
}
