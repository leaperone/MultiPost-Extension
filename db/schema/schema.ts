import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { newId, now, type JsonValue } from '../helpers.ts';
import { User } from './auth-schema.ts';

export const Website = pgTable(
  'Website',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    name: varchar({ length: 100 }).notNull(),
    domain: varchar({ length: 500 }),
    shareId: varchar({ length: 50 }),
    resetAt: timestamp({ precision: 3, mode: 'date' }),
    userId: varchar({ length: 50 }).notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
    deletedAt: timestamp({ precision: 3, mode: 'date' }),
  },
  (table) => [
    index('Website_createdAt_idx').on(table.createdAt),
    uniqueIndex('Website_id_key').on(table.id),
    index('Website_shareId_idx').on(table.shareId),
    uniqueIndex('Website_shareId_key').on(table.shareId),
    index('Website_userId_idx').on(table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'Website_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);

export const WebsiteEvent = pgTable(
  'WebsiteEvent',
  {
    id: text().primaryKey().notNull().$defaultFn(randomUUID),
    websiteId: text().notNull(),
    sessionId: text().notNull(),
    visitId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    urlPath: varchar({ length: 500 }).notNull(),
    urlQuery: varchar({ length: 500 }),
    referrerPath: varchar({ length: 500 }),
    referrerQuery: varchar({ length: 500 }),
    referrerDomain: varchar({ length: 500 }),
    pageTitle: varchar({ length: 500 }),
    eventType: integer().default(1).notNull(),
    eventName: varchar({ length: 50 }),
    tag: varchar({ length: 50 }),
  },
  (table) => [
    index('WebsiteEvent_createdAt_idx').on(table.createdAt),
    index('WebsiteEvent_sessionId_idx').on(table.sessionId),
    index('WebsiteEvent_visitId_idx').on(table.visitId),
    index('WebsiteEvent_websiteId_createdAt_eventName_idx').on(table.websiteId, table.createdAt, table.eventName),
    index('WebsiteEvent_websiteId_createdAt_idx').on(table.websiteId, table.createdAt),
    index('WebsiteEvent_websiteId_createdAt_pageTitle_idx').on(table.websiteId, table.createdAt, table.pageTitle),
    index('WebsiteEvent_websiteId_createdAt_referrerDomain_idx').on(
      table.websiteId,
      table.createdAt,
      table.referrerDomain,
    ),
    index('WebsiteEvent_websiteId_createdAt_tag_idx').on(table.websiteId, table.createdAt, table.tag),
    index('WebsiteEvent_websiteId_createdAt_urlPath_idx').on(table.websiteId, table.createdAt, table.urlPath),
    index('WebsiteEvent_websiteId_createdAt_urlQuery_idx').on(table.websiteId, table.createdAt, table.urlQuery),
    index('WebsiteEvent_websiteId_idx').on(table.websiteId),
    index('WebsiteEvent_websiteId_sessionId_createdAt_idx').on(table.websiteId, table.sessionId, table.createdAt),
    index('WebsiteEvent_websiteId_visitId_createdAt_idx').on(table.websiteId, table.visitId, table.createdAt),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [VisitorSession.id],
      name: 'WebsiteEvent_sessionId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);

export const EventData = pgTable(
  'EventData',
  {
    id: text().primaryKey().notNull().$defaultFn(randomUUID),
    websiteId: text().notNull(),
    websiteEventId: text().notNull(),
    dataKey: text().notNull(),
    stringValue: varchar({ length: 500 }),
    numberValue: numeric({ precision: 19, scale: 4, mode: 'string' }),
    dateValue: timestamp({ precision: 3, mode: 'date' }),
    dataType: integer().notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('EventData_createdAt_idx').on(table.createdAt),
    index('EventData_websiteEventId_idx').on(table.websiteEventId),
    index('EventData_websiteId_createdAt_dataKey_idx').on(table.websiteId, table.createdAt, table.dataKey),
    index('EventData_websiteId_createdAt_idx').on(table.websiteId, table.createdAt),
    index('EventData_websiteId_idx').on(table.websiteId),
    foreignKey({
      columns: [table.websiteId],
      foreignColumns: [Website.id],
      name: 'EventData_websiteId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.websiteEventId],
      foreignColumns: [WebsiteEvent.id],
      name: 'EventData_websiteEventId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);

export const SessionData = pgTable(
  'SessionData',
  {
    id: text().primaryKey().notNull().$defaultFn(randomUUID),
    websiteId: text().notNull(),
    sessionId: text().notNull(),
    dataKey: text().notNull(),
    stringValue: varchar({ length: 500 }),
    numberValue: numeric({ precision: 19, scale: 4, mode: 'string' }),
    dateValue: timestamp({ precision: 3, mode: 'date' }),
    dataType: integer().notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('SessionData_createdAt_idx').on(table.createdAt),
    index('SessionData_sessionId_createdAt_idx').on(table.sessionId, table.createdAt),
    index('SessionData_sessionId_idx').on(table.sessionId),
    index('SessionData_websiteId_createdAt_dataKey_idx').on(table.websiteId, table.createdAt, table.dataKey),
    index('SessionData_websiteId_idx').on(table.websiteId),
    foreignKey({
      columns: [table.websiteId],
      foreignColumns: [Website.id],
      name: 'SessionData_websiteId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [VisitorSession.id],
      name: 'SessionData_sessionId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);

export const VisitorSession = pgTable(
  'VisitorSession',
  {
    id: text().primaryKey().notNull().$defaultFn(randomUUID),
    websiteId: text().notNull(),
    hostname: varchar({ length: 100 }),
    browser: varchar({ length: 20 }),
    os: varchar({ length: 20 }),
    device: varchar({ length: 20 }),
    screen: varchar({ length: 11 }),
    language: varchar({ length: 35 }),
    country: char({ length: 2 }),
    subdivision1: varchar({ length: 20 }),
    subdivision2: varchar({ length: 50 }),
    city: varchar({ length: 50 }),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    ip: varchar({ length: 50 }),
  },
  (table) => [
    index('VisitorSession_createdAt_idx').on(table.createdAt),
    uniqueIndex('VisitorSession_id_key').on(table.id),
    index('VisitorSession_websiteId_createdAt_browser_idx').on(table.websiteId, table.createdAt, table.browser),
    index('VisitorSession_websiteId_createdAt_city_idx').on(table.websiteId, table.createdAt, table.city),
    index('VisitorSession_websiteId_createdAt_country_idx').on(table.websiteId, table.createdAt, table.country),
    index('VisitorSession_websiteId_createdAt_device_idx').on(table.websiteId, table.createdAt, table.device),
    index('VisitorSession_websiteId_createdAt_hostname_idx').on(table.websiteId, table.createdAt, table.hostname),
    index('VisitorSession_websiteId_createdAt_idx').on(table.websiteId, table.createdAt),
    index('VisitorSession_websiteId_createdAt_language_idx').on(table.websiteId, table.createdAt, table.language),
    index('VisitorSession_websiteId_createdAt_os_idx').on(table.websiteId, table.createdAt, table.os),
    index('VisitorSession_websiteId_createdAt_screen_idx').on(table.websiteId, table.createdAt, table.screen),
    index('VisitorSession_websiteId_createdAt_subdivision1_idx').on(
      table.websiteId,
      table.createdAt,
      table.subdivision1,
    ),
    index('VisitorSession_websiteId_idx').on(table.websiteId),
  ],
);

export const APIKey = pgTable(
  'APIKey',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    name: text().notNull(),
    key: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('APIKey_id_key').on(table.id),
    uniqueIndex('APIKey_key_key').on(table.key),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'APIKey_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const ExtensionTask = pgTable(
  'ExtensionTask',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    taskType: text().notNull(),
    taskData: jsonb().$type<JsonValue>().notNull(),
    status: text().notNull(),
    targetClientId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('ExtensionTask_id_key').on(table.id),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'ExtensionTask_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.targetClientId],
      foreignColumns: [ExtensionClient.id],
      name: 'ExtensionTask_targetClientId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const Credit = pgTable(
  'Credit',
  {
    userId: text().notNull(),
    credits: numeric({ precision: 38, scale: 18, mode: 'string' }).notNull(),
    freeCredits: numeric({ precision: 38, scale: 18, mode: 'string' }).notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('Credit_userId_key').on(table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'Credit_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const CreditUsage = pgTable(
  'CreditUsage',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    type: text().notNull(),
    amount: numeric({ precision: 38, scale: 18, mode: 'string' }).notNull(),
    isFree: boolean().default(false).notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('CreditUsage_id_key').on(table.id),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'CreditUsage_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const RechargeCredit = pgTable(
  'RechargeCredit',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    orderId: text().notNull(),
    type: text().notNull(),
    amount: numeric({ precision: 38, scale: 18, mode: 'string' }).notNull(),
    status: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('RechargeCredit_id_key').on(table.id),
    uniqueIndex('RechargeCredit_orderId_key').on(table.orderId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'RechargeCredit_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const PromotionTask = pgTable(
  'PromotionTask',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    taskType: text().notNull(),
    title: text().notNull(),
    description: text(),
    link: text(),
    keywords: text().array(),
    examples: text().array(),
    expiredAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
    reward: numeric({ precision: 38, scale: 18, mode: 'string' }).default('0').notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('PromotionTask_id_key').on(table.id),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'PromotionTask_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const PromotionCode = pgTable(
  'PromotionCode',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    taskId: text().notNull(),
    code: text().notNull(),
    userId: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('PromotionCode_code_key').on(table.code),
    uniqueIndex('PromotionCode_id_key').on(table.id),
    uniqueIndex('PromotionCode_taskId_code_key').on(table.taskId, table.code),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'PromotionCode_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.taskId],
      foreignColumns: [PromotionTask.id],
      name: 'PromotionCode_taskId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const PromotionSubmission = pgTable(
  'PromotionSubmission',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    taskId: text().notNull(),
    userId: text().notNull(),
    link: text().notNull(),
    scrapedData: jsonb().$type<JsonValue>().notNull(),
    verifiedData: jsonb().$type<JsonValue>().notNull(),
    status: text().notNull(),
    reason: text(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('PromotionSubmission_id_key').on(table.id),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'PromotionSubmission_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.taskId],
      foreignColumns: [PromotionTask.id],
      name: 'PromotionSubmission_taskId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const PlatformExtraConfig = pgTable(
  'PlatformExtraConfig',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    platform: text().notNull(),
    data: jsonb().$type<JsonValue>().notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('PlatformExtraConfig_id_key').on(table.id),
    uniqueIndex('PlatformExtraConfig_userId_platform_key').on(table.userId, table.platform),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'PlatformExtraConfig_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const ImageGeneration = pgTable(
  'ImageGeneration',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    prompt: text().notNull(),
    extraPrompt: text(),
    images: jsonb().$type<JsonValue>(),
    mask: jsonb().$type<JsonValue>(),
    number: integer().default(1).notNull(),
    size: text().default('auto').notNull(),
    quality: text().default('auto').notNull(),
    background: text().default('auto').notNull(),
    status: text().default('pending').notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
    message: text(),
    workflowId: text(),
  },
  (table) => [
    uniqueIndex('ImageGeneration_id_key').on(table.id),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'ImageGeneration_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const PosterGeneration = pgTable(
  'PosterGeneration',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    prompt: text().notNull(),
    width: integer().default(1080).notNull(),
    height: integer().default(1480).notNull(),
    model: text().default('deepseek-v3').notNull(),
    status: text().default('pending').notNull(),
    taskId: text(),
    projectId: text(),
    urls: jsonb().$type<JsonValue>(),
    error: text(),
    lastImageUrl: text(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
    systemPrompt: text(),
    fileHostingId: text(),
    seedeToken: text(),
    seedeTokenExpiresAt: timestamp({ precision: 3, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('PosterGeneration_id_key').on(table.id),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'PosterGeneration_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.fileHostingId],
      foreignColumns: [FileHosting.id],
      name: 'PosterGeneration_fileHostingId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const FileHosting = pgTable(
  'FileHosting',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    key: text().notNull(),
    type: text(),
    size: integer().default(0).notNull(),
    times: integer().default(0).notNull(),
    filename: text(),
    expiredAt: timestamp({ precision: 3, mode: 'date' }),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
    previewUrl: text(),
    deletedAt: timestamp({ precision: 3, mode: 'date' }),
    source: text(),
  },
  (table) => [
    uniqueIndex('FileHosting_id_key').on(table.id),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'FileHosting_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const ExtensionClient = pgTable(
  'ExtensionClient',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    name: text().notNull(),
    extensionVersion: text().default('unknown').notNull(),
    platformInfos: jsonb().$type<JsonValue>().notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
    deletedAt: timestamp({ precision: 3, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('ExtensionClient_id_key').on(table.id),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'ExtensionClient_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const PublishTask = pgTable(
  'PublishTask',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    draftId: text().notNull(),
    publishedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
    status: text().default('pending').notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('PublishTask_id_key').on(table.id),
    foreignKey({
      columns: [table.draftId],
      foreignColumns: [Draft.id],
      name: 'PublishTask_draftId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'PublishTask_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);

export const Draft = pgTable(
  'Draft',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    title: text(),
    content: text(),
    files: jsonb().$type<JsonValue>(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    index('Draft_createdAt_idx').on(table.createdAt),
    uniqueIndex('Draft_id_key').on(table.id),
    index('Draft_userId_idx').on(table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'Draft_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const SocialMediaAccount = pgTable(
  'SocialMediaAccount',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    username: text(),
    avatarUrl: text(),
    description: text(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
    accessToken: text().notNull(),
    displayName: text(),
    expiresAt: timestamp({ precision: 3, mode: 'date' }),
    isActive: boolean().default(true).notNull(),
    metadata: jsonb().$type<JsonValue>(),
    platform: text().notNull(),
    platformId: text().notNull(),
    refreshToken: text(),
    scope: text(),
    tokenType: text().default('Bearer').notNull(),
  },
  (table) => [
    index('SocialMediaAccount_expiresAt_idx').on(table.expiresAt),
    uniqueIndex('SocialMediaAccount_id_key').on(table.id),
    index('SocialMediaAccount_platform_idx').on(table.platform),
    index('SocialMediaAccount_userId_idx').on(table.userId),
    uniqueIndex('SocialMediaAccount_userId_platform_platformId_key').on(table.userId, table.platform, table.platformId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'SocialMediaAccount_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const PublishTaskLog = pgTable(
  'PublishTaskLog',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    publishTaskId: text().notNull(),
    userId: text().notNull(),
    platform: text().notNull(),
    platformId: text().notNull(),
    publishedAt: timestamp({ precision: 3, mode: 'date' }),
    status: text().default('pending').notNull(),
    publishData: jsonb().$type<JsonValue>(),
    result: jsonb().$type<JsonValue>(),
    error: text(),
    message: text(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('PublishTaskLog_id_key').on(table.id),
    foreignKey({
      columns: [table.publishTaskId],
      foreignColumns: [PublishTask.id],
      name: 'PublishTaskLog_publishTaskId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'PublishTaskLog_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);

export const VideoTranscription = pgTable(
  'VideoTranscription',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    videoUrl: text().notNull(),
    videoId: text(),
    platform: text(),
    audioUrl: text(),
    duration: integer(),
    transcript: text(),
    status: text().default('pending').notNull(),
    error: text(),
    metadata: jsonb().$type<JsonValue>(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    index('VideoTranscription_createdAt_idx').on(table.createdAt),
    uniqueIndex('VideoTranscription_id_key').on(table.id),
    index('VideoTranscription_status_idx').on(table.status),
    index('VideoTranscription_userId_idx').on(table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'VideoTranscription_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const ImageGenerationLog = pgTable(
  'ImageGenerationLog',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    imageGenerationId: text().notNull(),
    error: text(),
    response: jsonb().$type<JsonValue>(),
    url: text(),
    fileHostingId: text(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
    previewUrl: text(),
  },
  (table) => [
    uniqueIndex('ImageGenerationLog_id_key').on(table.id),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'ImageGenerationLog_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.imageGenerationId],
      foreignColumns: [ImageGeneration.id],
      name: 'ImageGenerationLog_imageGenerationId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.fileHostingId],
      foreignColumns: [FileHosting.id],
      name: 'ImageGenerationLog_fileHostingId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const SupportConversation = pgTable(
  'SupportConversation',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    userId: text().notNull(),
    status: text().default('open').notNull(),
    category: text().default('other').notNull(),
    subject: text(),
    priority: text().default('normal').notNull(),
    satisfactionRating: integer(),
    satisfactionComment: text(),
    metadata: jsonb().$type<JsonValue>(),
    assignedTo: text(),
    pageUrl: text(),
    lastMessageContent: text(),
    lastMessageAt: timestamp({ precision: 3, mode: 'date' }),
    lastMessageRole: text(),
    hasUnreadReply: boolean().default(false).notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull().$defaultFn(now).$onUpdateFn(now),
    resolvedAt: timestamp({ precision: 3, mode: 'date' }),
    closedAt: timestamp({ precision: 3, mode: 'date' }),
    firstResponseAt: timestamp({ precision: 3, mode: 'date' }),
  },
  (table) => [
    index('SupportConversation_assignedTo_idx').on(table.assignedTo),
    index('SupportConversation_category_idx').on(table.category),
    index('SupportConversation_createdAt_idx').on(table.createdAt),
    index('SupportConversation_status_idx').on(table.status),
    index('SupportConversation_userId_idx').on(table.userId),
    index('SupportConversation_userId_status_idx').on(table.userId, table.status),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [User.id],
      name: 'SupportConversation_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const SupportMessage = pgTable(
  'SupportMessage',
  {
    id: text().primaryKey().notNull().$defaultFn(newId),
    conversationId: text().notNull(),
    role: text().notNull(),
    senderUserId: text(),
    content: text().notNull(),
    attachments: jsonb().$type<JsonValue>(),
    isInternal: boolean().default(false).notNull(),
    createdAt: timestamp({ precision: 3, mode: 'date' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('SupportMessage_conversationId_createdAt_idx').on(table.conversationId, table.createdAt),
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [SupportConversation.id],
      name: 'SupportMessage_conversationId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.senderUserId],
      foreignColumns: [User.id],
      name: 'SupportMessage_senderUserId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
  ],
);
