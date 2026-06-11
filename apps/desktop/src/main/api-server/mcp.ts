/**
 * MCP endpoint (/mcp, Streamable HTTP) for the external API server.
 *
 * Stateless mode: each POST builds a fresh McpServer + transport pair, so
 * there is no session bookkeeping and any MCP client (Claude Code, Cursor,
 * custom agents) can connect with just the URL + Authorization header.
 * Every tool is a thin wrapper over services/operations — identical behavior
 * to the REST routes.
 */
import type * as http from 'http'
import { app } from 'electron'
import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import * as ops from '../services/operations'
import { createPublishSchema } from './schemas'
import type { PlatformType, PublishHistoryStatus } from '../../shared/types'

function textResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
}

function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error)
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true }
}

type ToolHandler<TArgs> = (args: TArgs) => Promise<CallToolResult> | CallToolResult

function safe<TArgs>(handler: ToolHandler<TArgs>): (args: TArgs) => Promise<CallToolResult> {
  return async (args: TArgs) => {
    try {
      return await handler(args)
    } catch (error) {
      return errorResult(error)
    }
  }
}

function buildMcpServer(): McpServer {
  const server = new McpServer({ name: 'multipost-desktop', version: app.getVersion() })

  // ----- Accounts -----
  server.registerTool(
    'list_accounts',
    {
      description:
        'List social media accounts managed by MultiPost Desktop, including platform, display name and login status.',
      inputSchema: {
        platform: z.string().optional().describe('Filter by platform id, e.g. "weibo"'),
        groupId: z.string().optional().describe('Filter by account group id')
      }
    },
    safe(({ platform, groupId }) =>
      textResult(ops.listAccounts({ platform: platform as PlatformType | undefined, groupId }))
    )
  )

  server.registerTool(
    'get_account',
    {
      description: 'Get one account by id.',
      inputSchema: { accountId: z.string() }
    },
    safe(({ accountId }) => textResult(ops.getAccount(accountId)))
  )

  server.registerTool(
    'refresh_account',
    {
      description:
        'Re-detect login status, nickname and avatar for an account by visiting the platform with its session. Takes a few seconds.',
      inputSchema: { accountId: z.string() }
    },
    safe(async ({ accountId }) => textResult(await ops.refreshAccount(accountId)))
  )

  // ----- Platforms -----
  server.registerTool(
    'list_platforms',
    {
      description:
        'List all supported platforms with their supported content types (DYNAMIC / VIDEO / ARTICLE / PODCAST).',
      inputSchema: {}
    },
    safe(() =>
      textResult(
        ops.listPlatforms().map(({ id, name, supportedContentTypes }) => ({
          id,
          name,
          supportedContentTypes
        }))
      )
    )
  )

  // ----- Publish -----
  server.registerTool(
    'create_publish',
    {
      description: [
        'Create a publish run: opens one browser view per account, fills the content, and (with autoSubmit) submits it.',
        'This is ASYNC — it returns a groupId immediately; poll get_publish_status until every target is terminal (success/failed/cancelled).',
        'Media entries accept an absolute local file path or an http(s) URL.',
        'data shape by contentType — DYNAMIC: {title?, content, images?, videos?, tags?};',
        'VIDEO: {title, content?, video, cover?, tags?};',
        'ARTICLE: {title, digest?, cover?, htmlContent? | markdownContent?, tags?};',
        'PODCAST: {title, description?, audio, cover?, tags?}.',
        'With autoSubmit=false the run stops at "ready" so a human (or you, via submit_publish) confirms.'
      ].join(' '),
      inputSchema: {
        contentType: z.enum(['DYNAMIC', 'VIDEO', 'ARTICLE', 'PODCAST']),
        accountIds: z.array(z.string()).min(1).describe('Account ids from list_accounts'),
        data: z.record(z.string(), z.unknown()).describe('Content payload, shape depends on contentType'),
        autoSubmit: z.boolean().optional().describe('Submit automatically after fill (default false)')
      }
    },
    safe(async (args) => {
      const params = createPublishSchema.parse(args)
      return textResult(
        await ops.createPublish({
          contentType: params.contentType,
          accountIds: params.accountIds,
          data: params.data as Record<string, unknown>,
          autoSubmit: params.autoSubmit === true
        })
      )
    })
  )

  server.registerTool(
    'get_publish_status',
    {
      description:
        'Get the status snapshot of a publish run (per-target status, error, postUrl). Poll this after create_publish.',
      inputSchema: { groupId: z.string() }
    },
    safe(({ groupId }) => textResult(ops.getPublishStatus(groupId)))
  )

  server.registerTool(
    'list_publish_groups',
    {
      description: 'List all publish groups currently open in the app.',
      inputSchema: {}
    },
    safe(() => textResult(ops.listPublishGroups()))
  )

  server.registerTool(
    'submit_publish',
    {
      description: 'Submit every ready target of a publish run (use after create_publish with autoSubmit=false).',
      inputSchema: { groupId: z.string() }
    },
    safe(async ({ groupId }) => textResult(await ops.submitPublish(groupId)))
  )

  server.registerTool(
    'submit_publish_target',
    {
      description: 'Submit a single target (account) of a publish run.',
      inputSchema: { groupId: z.string(), accountId: z.string() }
    },
    safe(async ({ groupId, accountId }) =>
      textResult(await ops.submitPublishTarget(groupId, accountId))
    )
  )

  server.registerTool(
    'retry_publish_target',
    {
      description: 'Retry a failed target of a publish run (re-fills and, when the run is auto, re-submits).',
      inputSchema: { groupId: z.string(), accountId: z.string() }
    },
    safe(async ({ groupId, accountId }) =>
      textResult(await ops.retryPublishTarget(groupId, accountId))
    )
  )

  server.registerTool(
    'close_publish',
    {
      description: 'Close a publish group and all of its browser views.',
      inputSchema: { groupId: z.string() }
    },
    safe(async ({ groupId }) => {
      await ops.closePublish(groupId)
      return textResult({ closed: true })
    })
  )

  // ----- History -----
  server.registerTool(
    'list_publish_history',
    {
      description: 'Query persisted publish history records (success/failed, post URLs).',
      inputSchema: {
        platform: z.string().optional(),
        status: z.enum(['success', 'failed', 'pending']).optional(),
        limit: z.number().int().positive().optional(),
        offset: z.number().int().nonnegative().optional()
      }
    },
    safe(({ platform, status, limit, offset }) =>
      textResult(
        ops.listHistory({
          platform: platform as PlatformType | undefined,
          status: status as PublishHistoryStatus | undefined,
          limit,
          offset
        })
      )
    )
  )

  // ----- Debug / observability -----
  server.registerTool(
    'list_views',
    {
      description: 'Inspect all open browser views, tabs and publish groups (ids, platforms, URLs, statuses).',
      inputSchema: {}
    },
    safe(() => textResult(ops.getDebugViews()))
  )

  server.registerTool(
    'get_group_data',
    {
      description: 'Get the raw + normalized content data of an open publish group.',
      inputSchema: { groupId: z.string() }
    },
    safe(({ groupId }) => textResult(ops.getDebugGroupData(groupId)))
  )

  server.registerTool(
    'execute_script',
    {
      description:
        'Execute JavaScript in a view and return the result. viewId is an accountId from list_views, or "__home__" for the dashboard view.',
      inputSchema: { viewId: z.string(), script: z.string() }
    },
    safe(async ({ viewId, script }) => textResult(await ops.executeScript(viewId, script)))
  )

  server.registerTool(
    'execute_group_script',
    {
      description: 'Execute JavaScript in a publish group target view (e.g. to inspect the page during a publish run).',
      inputSchema: { groupId: z.string(), accountId: z.string(), script: z.string() }
    },
    safe(async ({ groupId, accountId, script }) =>
      textResult(await ops.executeGroupScript(groupId, accountId, script))
    )
  )

  server.registerTool(
    'get_console_logs',
    {
      description:
        'Get captured console logs from app and platform views (ring buffer of 500). Filter by source substring, level (verbose/info/warning/error), since (ms timestamp) or limit.',
      inputSchema: {
        source: z.string().optional(),
        level: z.string().optional(),
        since: z.number().optional(),
        limit: z.number().int().positive().optional()
      }
    },
    safe((filter) => textResult(ops.getConsoleLogs(filter)))
  )

  server.registerTool(
    'clear_console_logs',
    { description: 'Clear the captured console log buffer.', inputSchema: {} },
    safe(() => {
      ops.clearConsoleLogs()
      return textResult({ cleared: true })
    })
  )

  server.registerTool(
    'get_app_logs',
    {
      description: 'Tail the main-process log file (electron-log). Returns the last N lines (default 200).',
      inputSchema: { limit: z.number().int().positive().optional() }
    },
    safe(({ limit }) => textResult(ops.getAppLogs(limit ?? 200)))
  )

  server.registerTool(
    'take_screenshot',
    {
      description:
        'Capture a PNG screenshot of the main window, or of a publish group target view when groupId + accountId are given.',
      inputSchema: {
        groupId: z.string().optional(),
        accountId: z.string().optional()
      }
    },
    safe(async ({ groupId, accountId }) => {
      const png = await ops.captureScreenshot({ groupId, accountId })
      return {
        content: [{ type: 'image', data: png.toString('base64'), mimeType: 'image/png' }]
      }
    })
  )

  server.registerTool(
    'toggle_devtools',
    {
      description: 'Toggle detached DevTools for a publish group target view.',
      inputSchema: { groupId: z.string(), accountId: z.string() }
    },
    safe(({ groupId, accountId }) => {
      ops.toggleDevTools(groupId, accountId)
      return textResult({ toggled: true })
    })
  )

  return server
}

export async function handleMcpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: unknown
): Promise<void> {
  const server = buildMcpServer()
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  })

  res.on('close', () => {
    void transport.close()
    void server.close()
  })

  await server.connect(transport)
  await transport.handleRequest(req, res, body)
}
