/**
 * REST routes for the external API (/v1/*). Pure dispatch — every capability
 * lives in services/operations so MCP tools share identical behavior.
 */
import type * as http from 'http'
import { z } from 'zod'
import * as ops from '../services/operations'
import { OperationError } from '../services/operations'
import {
  createPublishSchema,
  devtoolsSchema,
  execGroupSchema,
  execSchema
} from './schemas'
import type { PlatformType, PublishHistoryStatus } from '../../shared/types'

export interface ApiRequestContext {
  method: string
  pathname: string
  searchParams: URLSearchParams
  body: unknown
  res: http.ServerResponse
}

export function sendJson(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

export function sendError(res: http.ServerResponse, error: unknown): void {
  if (error instanceof OperationError) {
    sendJson(res, { error: { code: error.code, message: error.message } }, error.status)
    return
  }
  if (error instanceof z.ZodError) {
    sendJson(
      res,
      {
        error: {
          code: 'invalid_request',
          message: error.issues
            .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
            .join('; ')
        }
      },
      400
    )
    return
  }
  const message = error instanceof Error ? error.message : String(error)
  sendJson(res, { error: { code: 'internal_error', message } }, 500)
}

function intParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key)
  if (raw === null) return undefined
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw new OperationError(400, 'invalid_request', `Query param "${key}" must be a number`)
  }
  return value
}

/** Returns true when the route matched (response already sent). */
export async function handleApiRoute(ctx: ApiRequestContext): Promise<boolean> {
  const { method, pathname, searchParams, body, res } = ctx

  // ----- Accounts -----
  if (pathname === '/v1/accounts' && method === 'GET') {
    const platform = searchParams.get('platform') as PlatformType | null
    const groupId = searchParams.get('groupId')
    sendJson(res, {
      accounts: ops.listAccounts({
        platform: platform ?? undefined,
        groupId: groupId ?? undefined
      })
    })
    return true
  }

  const accountMatch = pathname.match(/^\/v1\/accounts\/([^/]+)$/)
  if (accountMatch && method === 'GET') {
    sendJson(res, { account: ops.getAccount(decodeURIComponent(accountMatch[1])) })
    return true
  }

  const accountRefreshMatch = pathname.match(/^\/v1\/accounts\/([^/]+)\/refresh$/)
  if (accountRefreshMatch && method === 'POST') {
    sendJson(res, { account: await ops.refreshAccount(decodeURIComponent(accountRefreshMatch[1])) })
    return true
  }

  // ----- Platforms -----
  if (pathname === '/v1/platforms' && method === 'GET') {
    sendJson(res, { platforms: ops.listPlatforms() })
    return true
  }

  // ----- Publish -----
  if (pathname === '/v1/publish' && method === 'POST') {
    const params = createPublishSchema.parse(body)
    const result = await ops.createPublish({
      contentType: params.contentType,
      accountIds: params.accountIds,
      data: params.data as Record<string, unknown>,
      autoSubmit: params.autoSubmit === true
    })
    sendJson(res, result, 202)
    return true
  }

  if (pathname === '/v1/publish' && method === 'GET') {
    sendJson(res, { groups: ops.listPublishGroups() })
    return true
  }

  const publishMatch = pathname.match(/^\/v1\/publish\/([^/]+)$/)
  if (publishMatch && method === 'GET') {
    sendJson(res, ops.getPublishStatus(decodeURIComponent(publishMatch[1])))
    return true
  }
  if (publishMatch && method === 'DELETE') {
    await ops.closePublish(decodeURIComponent(publishMatch[1]))
    sendJson(res, { closed: true })
    return true
  }

  const publishSubmitMatch = pathname.match(/^\/v1\/publish\/([^/]+)\/submit$/)
  if (publishSubmitMatch && method === 'POST') {
    sendJson(res, await ops.submitPublish(decodeURIComponent(publishSubmitMatch[1])))
    return true
  }

  const targetMatch = pathname.match(/^\/v1\/publish\/([^/]+)\/targets\/([^/]+)\/(submit|retry)$/)
  if (targetMatch && method === 'POST') {
    const groupId = decodeURIComponent(targetMatch[1])
    const accountId = decodeURIComponent(targetMatch[2])
    const result =
      targetMatch[3] === 'submit'
        ? await ops.submitPublishTarget(groupId, accountId)
        : await ops.retryPublishTarget(groupId, accountId)
    sendJson(res, result)
    return true
  }

  // ----- History -----
  if (pathname === '/v1/history' && method === 'GET') {
    sendJson(res, {
      history: ops.listHistory({
        platform: (searchParams.get('platform') as PlatformType | null) ?? undefined,
        status: (searchParams.get('status') as PublishHistoryStatus | null) ?? undefined,
        limit: intParam(searchParams, 'limit'),
        offset: intParam(searchParams, 'offset')
      })
    })
    return true
  }

  const historyMatch = pathname.match(/^\/v1\/history\/([^/]+)$/)
  if (historyMatch && method === 'GET') {
    sendJson(res, { history: ops.getHistory(decodeURIComponent(historyMatch[1])) })
    return true
  }

  // ----- Debug / observability -----
  if (pathname === '/v1/debug/views' && method === 'GET') {
    sendJson(res, ops.getDebugViews())
    return true
  }

  const debugGroupMatch = pathname.match(/^\/v1\/debug\/groups\/([^/]+)$/)
  if (debugGroupMatch && method === 'GET') {
    sendJson(res, ops.getDebugGroupData(decodeURIComponent(debugGroupMatch[1])))
    return true
  }

  if (pathname === '/v1/debug/exec' && method === 'POST') {
    const { viewId, script } = execSchema.parse(body)
    sendJson(res, { result: await ops.executeScript(viewId, script) })
    return true
  }

  if (pathname === '/v1/debug/exec-group' && method === 'POST') {
    const { groupId, accountId, script } = execGroupSchema.parse(body)
    sendJson(res, { result: await ops.executeGroupScript(groupId, accountId, script) })
    return true
  }

  if (pathname === '/v1/debug/logs' && method === 'GET') {
    const logs = ops.getConsoleLogs({
      source: searchParams.get('source') ?? undefined,
      level: searchParams.get('level') ?? undefined,
      since: intParam(searchParams, 'since'),
      limit: intParam(searchParams, 'limit')
    })
    sendJson(res, { count: logs.length, logs })
    return true
  }

  if (pathname === '/v1/debug/logs' && method === 'DELETE') {
    ops.clearConsoleLogs()
    sendJson(res, { cleared: true })
    return true
  }

  if (pathname === '/v1/debug/app-logs' && method === 'GET') {
    sendJson(res, ops.getAppLogs(intParam(searchParams, 'limit') ?? 200))
    return true
  }

  if (pathname === '/v1/debug/screenshot' && method === 'GET') {
    const png = await ops.captureScreenshot({
      groupId: searchParams.get('groupId') ?? undefined,
      accountId: searchParams.get('accountId') ?? undefined
    })
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': png.length })
    res.end(png)
    return true
  }

  if (pathname === '/v1/debug/devtools' && method === 'POST') {
    const { groupId, accountId } = devtoolsSchema.parse(body)
    ops.toggleDevTools(groupId, accountId)
    sendJson(res, { toggled: true })
    return true
  }

  const cookiesMatch = pathname.match(/^\/v1\/debug\/groups\/([^/]+)\/cookies$/)
  if (cookiesMatch && method === 'GET') {
    const accountId = searchParams.get('accountId')
    if (!accountId) {
      throw new OperationError(400, 'invalid_request', 'Query param "accountId" is required')
    }
    const cookies = await ops.getGroupCookies(
      decodeURIComponent(cookiesMatch[1]),
      accountId,
      searchParams.get('domain') ?? undefined
    )
    sendJson(res, { count: cookies.length, cookies })
    return true
  }

  return false
}
