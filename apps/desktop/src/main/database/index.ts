import Database from 'better-sqlite3'
import { app, safeStorage } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import type {
  Account,
  AccountGroup,
  Draft,
  PublishHistory,
  PublishHistoryStatus,
  ScheduledPublish,
  ScheduledPublishStatus,
  PublishTask,
  PlatformType,
  ProxyConfig,
  TaskStatus,
  SyncContentType
} from '../../shared/types'
import { normalizeProxyConfig } from '../proxy/accountProxy'

export class DatabaseService {
  private static instance: DatabaseService
  private db: Database.Database | null = null

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  async initialize(): Promise<void> {
    const userDataPath = app.getPath('userData')
    const dbDir = join(userDataPath, 'data')

    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
    }

    const dbPath = join(dbDir, 'multipost.db')
    this.db = new Database(dbPath)

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL')

    // Run migrations for existing databases BEFORE creating new tables
    this.runMigrations()

    // Create tables (for new databases or tables that don't exist)
    this.createTables()
  }

  private runMigrations(): void {
    if (!this.db) throw new Error('Database not initialized')

    this.migrateAccountsTable()
    this.migrateDraftsTable()
  }

  private tableColumns(table: string): string[] | null {
    if (!this.db) throw new Error('Database not initialized')

    const tableExists = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .get(table)
    if (!tableExists) return null

    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
    return columns.map((c) => c.name)
  }

  private migrateAccountsTable(): void {
    const columnNames = this.tableColumns('accounts')
    if (!columnNames) return

    // Add missing columns to accounts table
    if (!columnNames.includes('group_id')) {
      this.db!.exec('ALTER TABLE accounts ADD COLUMN group_id TEXT')
    }
    if (!columnNames.includes('session_partition')) {
      this.db!.exec("ALTER TABLE accounts ADD COLUMN session_partition TEXT DEFAULT ''")
    }
    if (!columnNames.includes('is_default')) {
      this.db!.exec('ALTER TABLE accounts ADD COLUMN is_default INTEGER DEFAULT 0')
    }
    if (!columnNames.includes('proxy_config')) {
      this.db!.exec('ALTER TABLE accounts ADD COLUMN proxy_config TEXT')
    }
    if (!columnNames.includes('remark')) {
      this.db!.exec('ALTER TABLE accounts ADD COLUMN remark TEXT')
    }
  }

  private migrateDraftsTable(): void {
    const columnNames = this.tableColumns('drafts')
    if (!columnNames) return

    if (!columnNames.includes('videos')) {
      this.db!.exec('ALTER TABLE drafts ADD COLUMN videos TEXT')
    }
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized')

    // Account groups table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS account_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        "order" INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    // Accounts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        username TEXT NOT NULL,
        display_name TEXT,
        remark TEXT,
        avatar TEXT,
        is_logged_in INTEGER DEFAULT 0,
        last_login_at INTEGER,
        group_id TEXT,
        session_partition TEXT NOT NULL,
        proxy_config TEXT,
        is_default INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (group_id) REFERENCES account_groups(id) ON DELETE SET NULL
      )
    `)

    // Drafts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS drafts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content_type TEXT NOT NULL,
        content TEXT NOT NULL,
        html_content TEXT,
        images TEXT,
        videos TEXT,
        video TEXT,
        cover TEXT,
        tags TEXT,
        selected_platforms TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    // Publish history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS publish_history (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        platform TEXT NOT NULL,
        account_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        platform_post_id TEXT,
        platform_post_url TEXT,
        published_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `)

    // Scheduled publish table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_publish (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        data TEXT NOT NULL,
        platforms TEXT NOT NULL,
        account_ids TEXT NOT NULL,
        scheduled_at INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    // Publish tasks table (legacy)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS publish_tasks (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        scheduled_at INTEGER,
        executed_at INTEGER,
        result TEXT,
        error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `)

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts(platform);
      CREATE INDEX IF NOT EXISTS idx_accounts_group ON accounts(group_id);
      CREATE INDEX IF NOT EXISTS idx_drafts_type ON drafts(content_type);
      CREATE INDEX IF NOT EXISTS idx_drafts_updated ON drafts(updated_at);
      CREATE INDEX IF NOT EXISTS idx_history_platform ON publish_history(platform);
      CREATE INDEX IF NOT EXISTS idx_history_status ON publish_history(status);
      CREATE INDEX IF NOT EXISTS idx_history_published ON publish_history(published_at);
      CREATE INDEX IF NOT EXISTS idx_scheduled_status ON scheduled_publish(status);
      CREATE INDEX IF NOT EXISTS idx_scheduled_at ON scheduled_publish(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON publish_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_account ON publish_tasks(account_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON publish_tasks(scheduled_at);
    `)
  }

  // ========== Account Group Methods ==========

  createAccountGroup(group: AccountGroup): AccountGroup {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      INSERT INTO account_groups (id, name, color, "order", created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(group.id, group.name, group.color || null, group.order, group.createdAt, group.updatedAt)

    return group
  }

  getAccountGroup(id: string): AccountGroup | null {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare('SELECT * FROM account_groups WHERE id = ?')
    const row = stmt.get(id) as AccountGroupRow | undefined

    return row ? this.rowToAccountGroup(row) : null
  }

  listAccountGroups(): AccountGroup[] {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare('SELECT * FROM account_groups ORDER BY "order" ASC, created_at ASC')
    return (stmt.all() as AccountGroupRow[]).map(this.rowToAccountGroup)
  }

  updateAccountGroup(id: string, data: Partial<AccountGroup>): AccountGroup | null {
    if (!this.db) throw new Error('Database not initialized')

    const existing = this.getAccountGroup(id)
    if (!existing) return null

    const updated = { ...existing, ...data, updatedAt: Date.now() }

    const stmt = this.db.prepare(`
      UPDATE account_groups SET
        name = ?,
        color = ?,
        "order" = ?,
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(updated.name, updated.color || null, updated.order, updated.updatedAt, id)

    return updated
  }

  deleteAccountGroup(id: string): void {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare('DELETE FROM account_groups WHERE id = ?')
    stmt.run(id)
  }

  // ========== Account Methods ==========

  createAccount(account: Account): Account {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      INSERT INTO accounts (id, platform, username, display_name, remark, avatar, is_logged_in, last_login_at, group_id, session_partition, proxy_config, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      account.id,
      account.platform,
      account.username,
      account.displayName || null,
      account.remark || null,
      account.avatar || null,
      account.isLoggedIn ? 1 : 0,
      account.lastLoginAt || null,
      account.groupId || null,
      account.sessionPartition,
      this.serializeProxyConfig(account.proxyConfig),
      account.isDefault ? 1 : 0,
      account.createdAt,
      account.updatedAt
    )

    return account
  }

  getAccount(id: string): Account | null {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare('SELECT * FROM accounts WHERE id = ?')
    const row = stmt.get(id) as AccountRow | undefined

    return row ? this.rowToAccount(row) : null
  }

  listAccounts(filters?: { platform?: PlatformType; groupId?: string }): Account[] {
    if (!this.db) throw new Error('Database not initialized')

    let query = 'SELECT * FROM accounts WHERE 1=1'
    const params: unknown[] = []

    if (filters?.platform) {
      query += ' AND platform = ?'
      params.push(filters.platform)
    }

    if (filters?.groupId) {
      query += ' AND group_id = ?'
      params.push(filters.groupId)
    }

    query += ' ORDER BY is_default DESC, created_at DESC'

    const stmt = this.db.prepare(query)
    return (stmt.all(...params) as AccountRow[]).map((row) => this.rowToAccount(row))
  }

  updateAccount(id: string, data: Partial<Account>): Account | null {
    if (!this.db) throw new Error('Database not initialized')

    const existing = this.getAccount(id)
    if (!existing) return null

    const updated = { ...existing, ...data, updatedAt: Date.now() }

    const stmt = this.db.prepare(`
      UPDATE accounts SET
        username = ?,
        display_name = ?,
        remark = ?,
        avatar = ?,
        is_logged_in = ?,
        last_login_at = ?,
        group_id = ?,
        proxy_config = ?,
        is_default = ?,
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      updated.username,
      updated.displayName || null,
      updated.remark || null,
      updated.avatar || null,
      updated.isLoggedIn ? 1 : 0,
      updated.lastLoginAt || null,
      updated.groupId || null,
      this.serializeProxyConfig(updated.proxyConfig),
      updated.isDefault ? 1 : 0,
      updated.updatedAt,
      id
    )

    return updated
  }

  deleteAccount(id: string): void {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare('DELETE FROM accounts WHERE id = ?')
    stmt.run(id)
  }

  setDefaultAccount(id: string, platform: PlatformType): void {
    if (!this.db) throw new Error('Database not initialized')

    // Reset all accounts for this platform
    this.db.prepare('UPDATE accounts SET is_default = 0 WHERE platform = ?').run(platform)
    // Set the new default
    this.db.prepare('UPDATE accounts SET is_default = 1 WHERE id = ?').run(id)
  }

  // Task methods
  createTask(task: PublishTask): PublishTask {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      INSERT INTO publish_tasks (id, account_id, platform, content, status, scheduled_at, executed_at, result, error, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      task.id,
      task.accountId,
      task.platform,
      JSON.stringify(task.content),
      task.status,
      task.scheduledAt || null,
      task.executedAt || null,
      task.result ? JSON.stringify(task.result) : null,
      task.error || null,
      task.createdAt,
      task.updatedAt
    )

    return task
  }

  getTask(id: string): PublishTask | null {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare('SELECT * FROM publish_tasks WHERE id = ?')
    const row = stmt.get(id) as TaskRow | undefined

    return row ? this.rowToTask(row) : null
  }

  listTasks(filters?: { platform?: PlatformType; status?: TaskStatus }): PublishTask[] {
    if (!this.db) throw new Error('Database not initialized')

    let query = 'SELECT * FROM publish_tasks WHERE 1=1'
    const params: unknown[] = []

    if (filters?.platform) {
      query += ' AND platform = ?'
      params.push(filters.platform)
    }

    if (filters?.status) {
      query += ' AND status = ?'
      params.push(filters.status)
    }

    query += ' ORDER BY created_at DESC'

    const stmt = this.db.prepare(query)
    return (stmt.all(...params) as TaskRow[]).map(this.rowToTask)
  }

  updateTask(id: string, data: Partial<PublishTask>): PublishTask | null {
    if (!this.db) throw new Error('Database not initialized')

    const existing = this.getTask(id)
    if (!existing) return null

    const updated = { ...existing, ...data, updatedAt: Date.now() }

    const stmt = this.db.prepare(`
      UPDATE publish_tasks SET
        status = ?,
        scheduled_at = ?,
        executed_at = ?,
        result = ?,
        error = ?,
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      updated.status,
      updated.scheduledAt || null,
      updated.executedAt || null,
      updated.result ? JSON.stringify(updated.result) : null,
      updated.error || null,
      updated.updatedAt,
      id
    )

    return updated
  }

  deleteTask(id: string): void {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare('DELETE FROM publish_tasks WHERE id = ?')
    stmt.run(id)
  }

  // ========== Draft Methods ==========

  createDraft(draft: Draft): Draft {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      INSERT INTO drafts (id, title, content_type, content, html_content, images, videos, video, cover, tags, selected_platforms, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      draft.id,
      draft.title,
      draft.contentType,
      draft.content,
      draft.htmlContent || null,
      draft.images ? JSON.stringify(draft.images) : null,
      draft.videos ? JSON.stringify(draft.videos) : null,
      draft.video || null,
      draft.cover || null,
      draft.tags ? JSON.stringify(draft.tags) : null,
      draft.selectedPlatforms ? JSON.stringify(draft.selectedPlatforms) : null,
      draft.createdAt,
      draft.updatedAt
    )

    return draft
  }

  getDraft(id: string): Draft | null {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare('SELECT * FROM drafts WHERE id = ?')
    const row = stmt.get(id) as DraftRow | undefined

    return row ? this.rowToDraft(row) : null
  }

  listDrafts(contentType?: SyncContentType): Draft[] {
    if (!this.db) throw new Error('Database not initialized')

    let query = 'SELECT * FROM drafts'
    const params: unknown[] = []

    if (contentType) {
      query += ' WHERE content_type = ?'
      params.push(contentType)
    }

    query += ' ORDER BY updated_at DESC'

    const stmt = this.db.prepare(query)
    return (stmt.all(...params) as DraftRow[]).map(this.rowToDraft)
  }

  updateDraft(id: string, data: Partial<Draft>): Draft | null {
    if (!this.db) throw new Error('Database not initialized')

    const existing = this.getDraft(id)
    if (!existing) return null

    const updated = { ...existing, ...data, updatedAt: Date.now() }

    const stmt = this.db.prepare(`
      UPDATE drafts SET
        title = ?,
        content_type = ?,
        content = ?,
        html_content = ?,
        images = ?,
        videos = ?,
        video = ?,
        cover = ?,
        tags = ?,
        selected_platforms = ?,
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(
      updated.title,
      updated.contentType,
      updated.content,
      updated.htmlContent || null,
      updated.images ? JSON.stringify(updated.images) : null,
      updated.videos ? JSON.stringify(updated.videos) : null,
      updated.video || null,
      updated.cover || null,
      updated.tags ? JSON.stringify(updated.tags) : null,
      updated.selectedPlatforms ? JSON.stringify(updated.selectedPlatforms) : null,
      updated.updatedAt,
      id
    )

    return updated
  }

  deleteDraft(id: string): void {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare('DELETE FROM drafts WHERE id = ?')
    stmt.run(id)
  }

  // ========== Publish History Methods ==========

  createPublishHistory(history: PublishHistory): PublishHistory {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      INSERT INTO publish_history (id, content_type, title, content, platform, account_id, status, error_message, platform_post_id, platform_post_url, published_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      history.id,
      history.contentType,
      history.title,
      history.content,
      history.platform,
      history.accountId,
      history.status,
      history.errorMessage || null,
      history.platformPostId || null,
      history.platformPostUrl || null,
      history.publishedAt,
      history.createdAt
    )

    return history
  }

  getPublishHistory(id: string): PublishHistory | null {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare('SELECT * FROM publish_history WHERE id = ?')
    const row = stmt.get(id) as PublishHistoryRow | undefined

    return row ? this.rowToPublishHistory(row) : null
  }

  listPublishHistory(filters?: {
    platform?: PlatformType
    status?: PublishHistoryStatus
    limit?: number
    offset?: number
  }): PublishHistory[] {
    if (!this.db) throw new Error('Database not initialized')

    let query = 'SELECT * FROM publish_history WHERE 1=1'
    const params: unknown[] = []

    if (filters?.platform) {
      query += ' AND platform = ?'
      params.push(filters.platform)
    }

    if (filters?.status) {
      query += ' AND status = ?'
      params.push(filters.status)
    }

    query += ' ORDER BY published_at DESC'

    if (filters?.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
    }

    if (filters?.offset) {
      query += ' OFFSET ?'
      params.push(filters.offset)
    }

    const stmt = this.db.prepare(query)
    return (stmt.all(...params) as PublishHistoryRow[]).map(this.rowToPublishHistory)
  }

  updatePublishHistory(id: string, data: Partial<PublishHistory>): PublishHistory | null {
    if (!this.db) throw new Error('Database not initialized')

    const existing = this.getPublishHistory(id)
    if (!existing) return null

    const updated = { ...existing, ...data }

    const stmt = this.db.prepare(`
      UPDATE publish_history SET
        status = ?,
        error_message = ?,
        platform_post_id = ?,
        platform_post_url = ?
      WHERE id = ?
    `)

    stmt.run(
      updated.status,
      updated.errorMessage || null,
      updated.platformPostId || null,
      updated.platformPostUrl || null,
      id
    )

    return updated
  }

  deletePublishHistory(id: string): void {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare('DELETE FROM publish_history WHERE id = ?')
    stmt.run(id)
  }

  // ========== Scheduled Publish Methods ==========

  createScheduledPublish(scheduled: ScheduledPublish): ScheduledPublish {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(`
      INSERT INTO scheduled_publish (id, content_type, title, content, data, platforms, account_ids, scheduled_at, status, error_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      scheduled.id,
      scheduled.contentType,
      scheduled.title,
      scheduled.content,
      scheduled.data,
      JSON.stringify(scheduled.platforms),
      JSON.stringify(scheduled.accountIds),
      scheduled.scheduledAt,
      scheduled.status,
      scheduled.errorMessage || null,
      scheduled.createdAt,
      scheduled.updatedAt
    )

    return scheduled
  }

  getScheduledPublish(id: string): ScheduledPublish | null {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare('SELECT * FROM scheduled_publish WHERE id = ?')
    const row = stmt.get(id) as ScheduledPublishRow | undefined

    return row ? this.rowToScheduledPublish(row) : null
  }

  listScheduledPublish(filters?: {
    status?: ScheduledPublishStatus
    beforeTime?: number
  }): ScheduledPublish[] {
    if (!this.db) throw new Error('Database not initialized')

    let query = 'SELECT * FROM scheduled_publish WHERE 1=1'
    const params: unknown[] = []

    if (filters?.status) {
      query += ' AND status = ?'
      params.push(filters.status)
    }

    if (filters?.beforeTime) {
      query += ' AND scheduled_at <= ?'
      params.push(filters.beforeTime)
    }

    query += ' ORDER BY scheduled_at ASC'

    const stmt = this.db.prepare(query)
    return (stmt.all(...params) as ScheduledPublishRow[]).map(this.rowToScheduledPublish)
  }

  updateScheduledPublish(id: string, data: Partial<ScheduledPublish>): ScheduledPublish | null {
    if (!this.db) throw new Error('Database not initialized')

    const existing = this.getScheduledPublish(id)
    if (!existing) return null

    const updated = { ...existing, ...data, updatedAt: Date.now() }

    const stmt = this.db.prepare(`
      UPDATE scheduled_publish SET
        status = ?,
        error_message = ?,
        updated_at = ?
      WHERE id = ?
    `)

    stmt.run(updated.status, updated.errorMessage || null, updated.updatedAt, id)

    return updated
  }

  deleteScheduledPublish(id: string): void {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare('DELETE FROM scheduled_publish WHERE id = ?')
    stmt.run(id)
  }

  // ========== Helper Methods ==========

  private rowToAccountGroup(row: AccountGroupRow): AccountGroup {
    return {
      id: row.id,
      name: row.name,
      color: row.color || undefined,
      order: row.order,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private rowToAccount(row: AccountRow): Account {
    return {
      id: row.id,
      platform: row.platform as PlatformType,
      username: row.username,
      displayName: row.display_name || undefined,
      remark: row.remark || undefined,
      avatar: row.avatar || undefined,
      isLoggedIn: row.is_logged_in === 1,
      lastLoginAt: row.last_login_at || undefined,
      groupId: row.group_id || undefined,
      sessionPartition: row.session_partition,
      proxyConfig: this.parseProxyConfig(row.proxy_config, row.id),
      isDefault: row.is_default === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private serializeProxyConfig(proxyConfig: ProxyConfig | undefined): string | null {
    const normalized = normalizeProxyConfig(proxyConfig)
    if (!normalized) return null

    const { password, ...rest } = normalized
    const stored: Record<string, unknown> = { ...rest }

    if (password && safeStorage.isEncryptionAvailable()) {
      // Fresh plaintext password (create/edit): encrypt at rest.
      stored.encryptedPassword = safeStorage.encryptString(password).toString('base64')
    } else if (proxyConfig?.encryptedPassword) {
      // Round-trip of an already-stored secret (e.g. a login-status-only
      // update, or safeStorage temporarily unavailable): preserve the blob
      // verbatim so credentials are never lost.
      stored.encryptedPassword = proxyConfig.encryptedPassword
    }
    // If safeStorage is unavailable and only plaintext is present, the
    // password is intentionally dropped rather than written in the clear.

    return JSON.stringify(stored)
  }

  private parseProxyConfig(value: string | null, accountId: string): ProxyConfig | undefined {
    if (!value) return undefined

    try {
      const parsed = JSON.parse(value) as ProxyConfig
      const normalized = normalizeProxyConfig(parsed)
      if (!normalized) return undefined

      if (parsed.encryptedPassword) {
        // Keep the blob so any re-serialization preserves it even if we can't
        // decrypt right now (keychain locked, copied from another machine).
        normalized.encryptedPassword = parsed.encryptedPassword
        try {
          normalized.password = safeStorage.decryptString(
            Buffer.from(parsed.encryptedPassword, 'base64')
          )
        } catch (error) {
          console.warn(`[Database] Failed to decrypt proxy password for ${accountId}:`, error)
        }
      }
      return normalized
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Invalid proxy_config for account ${accountId}: ${message}`)
    }
  }

  private rowToDraft(row: DraftRow): Draft {
    return {
      id: row.id,
      title: row.title,
      contentType: row.content_type as SyncContentType,
      content: row.content,
      htmlContent: row.html_content || undefined,
      images: row.images ? JSON.parse(row.images) : undefined,
      videos: row.videos ? JSON.parse(row.videos) : undefined,
      video: row.video || undefined,
      cover: row.cover || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      selectedPlatforms: row.selected_platforms ? JSON.parse(row.selected_platforms) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private rowToPublishHistory(row: PublishHistoryRow): PublishHistory {
    return {
      id: row.id,
      contentType: row.content_type as SyncContentType,
      title: row.title,
      content: row.content,
      platform: row.platform as PlatformType,
      accountId: row.account_id,
      status: row.status as PublishHistoryStatus,
      errorMessage: row.error_message || undefined,
      platformPostId: row.platform_post_id || undefined,
      platformPostUrl: row.platform_post_url || undefined,
      publishedAt: row.published_at,
      createdAt: row.created_at
    }
  }

  private rowToScheduledPublish(row: ScheduledPublishRow): ScheduledPublish {
    return {
      id: row.id,
      contentType: row.content_type as SyncContentType,
      title: row.title,
      content: row.content,
      data: row.data,
      platforms: JSON.parse(row.platforms) as PlatformType[],
      accountIds: JSON.parse(row.account_ids) as string[],
      scheduledAt: row.scheduled_at,
      status: row.status as ScheduledPublishStatus,
      errorMessage: row.error_message || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private rowToTask(row: TaskRow): PublishTask {
    return {
      id: row.id,
      accountId: row.account_id,
      platform: row.platform as PlatformType,
      content: JSON.parse(row.content),
      status: row.status as TaskStatus,
      scheduledAt: row.scheduled_at || undefined,
      executedAt: row.executed_at || undefined,
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// Type definitions for database rows
interface AccountGroupRow {
  id: string
  name: string
  color: string | null
  order: number
  created_at: number
  updated_at: number
}

interface AccountRow {
  id: string
  platform: string
  username: string
  display_name: string | null
  remark: string | null
  avatar: string | null
  is_logged_in: number
  last_login_at: number | null
  group_id: string | null
  session_partition: string
  proxy_config: string | null
  is_default: number
  created_at: number
  updated_at: number
}

interface DraftRow {
  id: string
  title: string
  content_type: string
  content: string
  html_content: string | null
  images: string | null
  videos: string | null
  video: string | null
  cover: string | null
  tags: string | null
  selected_platforms: string | null
  created_at: number
  updated_at: number
}

interface PublishHistoryRow {
  id: string
  content_type: string
  title: string
  content: string
  platform: string
  account_id: string
  status: string
  error_message: string | null
  platform_post_id: string | null
  platform_post_url: string | null
  published_at: number
  created_at: number
}

interface ScheduledPublishRow {
  id: string
  content_type: string
  title: string
  content: string
  data: string
  platforms: string
  account_ids: string
  scheduled_at: number
  status: string
  error_message: string | null
  created_at: number
  updated_at: number
}

interface TaskRow {
  id: string
  account_id: string
  platform: string
  content: string
  status: string
  scheduled_at: number | null
  executed_at: number | null
  result: string | null
  error: string | null
  created_at: number
  updated_at: number
}
