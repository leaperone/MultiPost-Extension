import { createServerFn } from '@tanstack/react-start';
import { User } from '@db/schema/auth-schema';
import { SupportConversation, SupportMessage } from '@db/schema/schema';
import {
  and,
  asc,
  avg,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';

import { deleteObject, getPresignedDownloadUrl } from '@/lib/bitiful';
import { db } from '../../lib/db';
import { isAdmin } from '../admin';
import { getSession } from '../../lib/session';
import {
  adminAddInternalNoteSchema,
  adminAssignConversationSchema,
  adminGetConversationsSchema,
  adminGetStatsSchema,
  adminReplyConversationSchema,
  adminUpdateStatusSchema,
  supportConversationIdSchema,
  type Attachment,
  type AdminGetConversationsParams,
  type AdminGetStatsParams,
} from './types';

type ConversationRow = typeof SupportConversation.$inferSelect;
type SerializableJson =
  | string
  | number
  | boolean
  | null
  | SerializableJson[]
  | { [key: string]: SerializableJson };

const adminConversationListColumns = {
  id: SupportConversation.id,
  subject: SupportConversation.subject,
  status: SupportConversation.status,
  category: SupportConversation.category,
  priority: SupportConversation.priority,
  assignedTo: SupportConversation.assignedTo,
  lastMessageContent: SupportConversation.lastMessageContent,
  lastMessageAt: SupportConversation.lastMessageAt,
  lastMessageRole: SupportConversation.lastMessageRole,
  hasUnreadReply: SupportConversation.hasUnreadReply,
  satisfactionRating: SupportConversation.satisfactionRating,
  createdAt: SupportConversation.createdAt,
  updatedAt: SupportConversation.updatedAt,
  resolvedAt: SupportConversation.resolvedAt,
  closedAt: SupportConversation.closedAt,
  firstResponseAt: SupportConversation.firstResponseAt,
};

const adminConversationDetailColumns = {
  id: SupportConversation.id,
  userId: SupportConversation.userId,
  status: SupportConversation.status,
  category: SupportConversation.category,
  subject: SupportConversation.subject,
  priority: SupportConversation.priority,
  satisfactionRating: SupportConversation.satisfactionRating,
  satisfactionComment: SupportConversation.satisfactionComment,
  metadata: SupportConversation.metadata,
  assignedTo: SupportConversation.assignedTo,
  pageUrl: SupportConversation.pageUrl,
  lastMessageContent: SupportConversation.lastMessageContent,
  lastMessageAt: SupportConversation.lastMessageAt,
  lastMessageRole: SupportConversation.lastMessageRole,
  hasUnreadReply: SupportConversation.hasUnreadReply,
  createdAt: SupportConversation.createdAt,
  updatedAt: SupportConversation.updatedAt,
  resolvedAt: SupportConversation.resolvedAt,
  closedAt: SupportConversation.closedAt,
  firstResponseAt: SupportConversation.firstResponseAt,
};

const adminUserColumns = {
  id: User.id,
  name: User.name,
  email: User.email,
  image: User.image,
};

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id || !session.user.email) return null;
  if (!isAdmin(session.user.email)) return null;
  return session;
}

type SignedMessage<T extends { attachments: unknown }> = Omit<T, 'attachments'> & {
  attachments: Attachment[] | null;
};

async function signAttachments<T extends { attachments: unknown }>(
  messages: T[],
): Promise<SignedMessage<T>[]> {
  return Promise.all(
    messages.map(async (msg) => {
      const atts = msg.attachments as Attachment[] | null;
      if (!atts?.length) return { ...msg, attachments: null };
      const signedAtts = await Promise.all(
        atts.map(async (att) => {
          const url = await getPresignedDownloadUrl(att.key, 30 * 60, {
            'x-bitiful-max-requests': '100',
          });
          return { ...att, url };
        }),
      );
      return { ...msg, attachments: signedAtts };
    }),
  );
}

function extractS3Keys(messages: { attachments: unknown }[]): string[] {
  const keys: string[] = [];
  for (const msg of messages) {
    const atts = msg.attachments as Attachment[] | null;
    if (!atts?.length) continue;
    for (const att of atts) {
      if (att.key) keys.push(att.key);
    }
  }
  return keys;
}

function andAll(conditions: (SQL | undefined)[]) {
  const filtered = conditions.filter((condition): condition is SQL => Boolean(condition));
  return filtered.length > 0 ? and(...filtered) : undefined;
}

function toSerializableJson(value: unknown): SerializableJson {
  if (value === undefined) return null;

  const serialized = JSON.stringify(value);
  if (serialized === undefined) return null;

  return JSON.parse(serialized) as SerializableJson;
}

function adminConversationWhere(data: AdminGetConversationsParams) {
  return andAll([
    data.status ? eq(SupportConversation.status, data.status) : undefined,
    data.category ? eq(SupportConversation.category, data.category) : undefined,
    data.search ? ilike(SupportConversation.lastMessageContent, `%${data.search}%`) : undefined,
  ]);
}

function statsDateConditions(data: AdminGetStatsParams) {
  return [
    data.from ? gte(SupportConversation.createdAt, data.from) : undefined,
    data.to ? lte(SupportConversation.createdAt, data.to) : undefined,
  ];
}

export const adminGetConversations = createServerFn({ method: 'GET' })
  .validator(adminGetConversationsSchema)
  .handler(async ({ data }) => {
    const session = await requireAdmin();
    if (!session) return { success: false as const, error: 'Unauthorized' };

    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 20;
    const where = adminConversationWhere(data);

    try {
      const [conversations, totalRows] = await Promise.all([
        db
          .select({
            ...adminConversationListColumns,
            user: adminUserColumns,
          })
          .from(SupportConversation)
          .innerJoin(User, eq(SupportConversation.userId, User.id))
          .where(where)
          .orderBy(desc(SupportConversation.updatedAt))
          .offset((page - 1) * pageSize)
          .limit(pageSize),
        db.select({ count: count() }).from(SupportConversation).where(where),
      ]);

      return {
        success: true as const,
        data: { conversations, total: totalRows[0]?.count ?? 0 },
      };
    } catch (error) {
      console.error('adminGetConversations failed:', error);
      return { success: false as const, error: 'Failed to get conversations' };
    }
  });

export const adminGetConversation = createServerFn({ method: 'GET' })
  .validator(supportConversationIdSchema)
  .handler(async ({ data }) => {
    const session = await requireAdmin();
    if (!session) return { success: false as const, error: 'Unauthorized' };

    const { conversationId } = data;

    try {
      const [conversation] = await db
        .select({
          ...adminConversationDetailColumns,
          user: adminUserColumns,
        })
        .from(SupportConversation)
        .innerJoin(User, eq(SupportConversation.userId, User.id))
        .where(eq(SupportConversation.id, conversationId))
        .limit(1);

      if (!conversation) {
        return { success: false as const, error: 'Conversation not found' };
      }

      const rawMessages = await db
        .select()
        .from(SupportMessage)
        .where(eq(SupportMessage.conversationId, conversationId))
        .orderBy(asc(SupportMessage.createdAt));

      const messages = await signAttachments(rawMessages);

      return {
        success: true as const,
        data: {
          conversation: {
            ...conversation,
            metadata: toSerializableJson(conversation.metadata),
          },
          messages,
        },
      };
    } catch (error) {
      console.error('adminGetConversation failed:', error);
      return { success: false as const, error: 'Failed to get conversation' };
    }
  });

export const adminReplyConversation = createServerFn({ method: 'POST' })
  .validator(adminReplyConversationSchema)
  .handler(async ({ data }) => {
    const session = await requireAdmin();
    if (!session) return { success: false as const, error: 'Unauthorized' };

    const { conversationId } = data;
    const trimmed = data.content?.trim();
    if (!trimmed || trimmed.length > 5000) {
      return { success: false as const, error: 'Content is required and max 5000 chars' };
    }

    try {
      const [conversation] = await db
        .select()
        .from(SupportConversation)
        .where(eq(SupportConversation.id, conversationId))
        .limit(1);

      if (!conversation) return { success: false as const, error: 'Conversation not found' };

      const now = new Date();
      const isFirstResponse = !conversation.firstResponseAt;

      await db.transaction(async (tx) => {
        await tx.insert(SupportMessage).values({
          conversationId,
          role: 'agent',
          senderUserId: session.user.id,
          content: trimmed,
        });

        await tx
          .update(SupportConversation)
          .set({
            status: 'in_progress',
            lastMessageContent: trimmed.slice(0, 200),
            lastMessageAt: now,
            lastMessageRole: 'agent',
            hasUnreadReply: true,
            ...(conversation.assignedTo ? {} : { assignedTo: session.user.id }),
            ...(isFirstResponse ? { firstResponseAt: now } : {}),
          })
          .where(eq(SupportConversation.id, conversationId));
      });

      return { success: true as const };
    } catch (error) {
      console.error('adminReplyConversation failed:', error);
      return { success: false as const, error: 'Failed to send reply' };
    }
  });

export const adminUpdateStatus = createServerFn({ method: 'POST' })
  .validator(adminUpdateStatusSchema)
  .handler(async ({ data }) => {
    const session = await requireAdmin();
    if (!session) return { success: false as const, error: 'Unauthorized' };

    const { conversationId, status } = data;

    try {
      const [conversation] = await db
        .select()
        .from(SupportConversation)
        .where(eq(SupportConversation.id, conversationId))
        .limit(1);

      if (!conversation) return { success: false as const, error: 'Conversation not found' };

      const now = new Date();
      const updateData: Partial<Pick<ConversationRow, 'status' | 'resolvedAt' | 'closedAt'>> = {
        status,
      };

      if (status === 'resolved' && !conversation.resolvedAt) {
        updateData.resolvedAt = now;
      }
      if (status === 'closed' && !conversation.closedAt) {
        updateData.closedAt = now;
      }

      await db
        .update(SupportConversation)
        .set(updateData)
        .where(eq(SupportConversation.id, conversationId));

      return { success: true as const };
    } catch (error) {
      console.error('adminUpdateStatus failed:', error);
      return { success: false as const, error: 'Failed to update status' };
    }
  });

export const adminAssignConversation = createServerFn({ method: 'POST' })
  .validator(adminAssignConversationSchema)
  .handler(async ({ data }) => {
    const session = await requireAdmin();
    if (!session) return { success: false as const, error: 'Unauthorized' };

    const { conversationId, assigneeId } = data;

    try {
      const [conversation] = await db
        .select({ id: SupportConversation.id })
        .from(SupportConversation)
        .where(eq(SupportConversation.id, conversationId))
        .limit(1);

      if (!conversation) return { success: false as const, error: 'Conversation not found' };

      await db
        .update(SupportConversation)
        .set({ assignedTo: assigneeId })
        .where(eq(SupportConversation.id, conversationId));

      return { success: true as const };
    } catch (error) {
      console.error('adminAssignConversation failed:', error);
      return { success: false as const, error: 'Failed to assign conversation' };
    }
  });

export const adminAddInternalNote = createServerFn({ method: 'POST' })
  .validator(adminAddInternalNoteSchema)
  .handler(async ({ data }) => {
    const session = await requireAdmin();
    if (!session) return { success: false as const, error: 'Unauthorized' };

    const { conversationId } = data;
    const trimmed = data.content?.trim();
    if (!trimmed || trimmed.length > 5000) {
      return { success: false as const, error: 'Content is required and max 5000 chars' };
    }

    try {
      const [conversation] = await db
        .select({ id: SupportConversation.id })
        .from(SupportConversation)
        .where(eq(SupportConversation.id, conversationId))
        .limit(1);

      if (!conversation) return { success: false as const, error: 'Conversation not found' };

      await db.insert(SupportMessage).values({
        conversationId,
        role: 'agent',
        senderUserId: session.user.id,
        content: trimmed,
        isInternal: true,
      });

      return { success: true as const };
    } catch (error) {
      console.error('adminAddInternalNote failed:', error);
      return { success: false as const, error: 'Failed to add internal note' };
    }
  });

export const adminDeleteConversation = createServerFn({ method: 'POST' })
  .validator(supportConversationIdSchema)
  .handler(async ({ data }) => {
    const session = await requireAdmin();
    if (!session) return { success: false as const, error: 'Unauthorized' };

    const { conversationId } = data;

    try {
      const [conversation] = await db
        .select()
        .from(SupportConversation)
        .where(eq(SupportConversation.id, conversationId))
        .limit(1);

      if (!conversation) return { success: false as const, error: 'Conversation not found' };

      const messages = await db
        .select({ attachments: SupportMessage.attachments })
        .from(SupportMessage)
        .where(eq(SupportMessage.conversationId, conversationId));

      const s3Keys = extractS3Keys(messages);

      if (conversation.metadata && typeof conversation.metadata === 'object') {
        const meta = conversation.metadata as Record<string, unknown>;
        if (typeof meta.screenshotKey === 'string') {
          s3Keys.push(meta.screenshotKey);
        }
      }

      await Promise.allSettled(s3Keys.map((key) => deleteObject(key)));

      await db.delete(SupportConversation).where(eq(SupportConversation.id, conversationId));

      return { success: true as const };
    } catch (error) {
      console.error('adminDeleteConversation failed:', error);
      return { success: false as const, error: 'Failed to delete conversation' };
    }
  });

export const adminGetStats = createServerFn({ method: 'GET' })
  .validator(adminGetStatsSchema)
  .handler(async ({ data }) => {
    const session = await requireAdmin();
    if (!session) return { success: false as const, error: 'Unauthorized' };

    const dateConditions = statsDateConditions(data);
    const dateWhere = andAll(dateConditions);

    try {
      const [totalRows, byStatus, byCategory, avgSatisfactionRows, avgResponseTime] =
        await Promise.all([
          db.select({ count: count() }).from(SupportConversation).where(dateWhere),
          db
            .select({
              status: SupportConversation.status,
              count: count(),
            })
            .from(SupportConversation)
            .where(dateWhere)
            .groupBy(SupportConversation.status),
          db
            .select({
              category: SupportConversation.category,
              count: count(),
            })
            .from(SupportConversation)
            .where(dateWhere)
            .groupBy(SupportConversation.category),
          db
            .select({
              avg: avg(SupportConversation.satisfactionRating),
              totalRated: count(SupportConversation.satisfactionRating),
            })
            .from(SupportConversation)
            .where(
              andAll([...dateConditions, isNotNull(SupportConversation.satisfactionRating)]),
            ),
          db
            .select({
              avg_seconds:
                sql<number | null>`avg(extract(epoch from (${SupportConversation.firstResponseAt} - ${SupportConversation.createdAt})))::double precision`,
            })
            .from(SupportConversation)
            .where(andAll([...dateConditions, isNotNull(SupportConversation.firstResponseAt)]))
            .catch(() => [{ avg_seconds: null }]),
        ]);

      const statusCounts: Record<string, number> = {};
      for (const row of byStatus) {
        statusCounts[row.status] = row.count;
      }

      const categoryCounts: Record<string, number> = {};
      for (const row of byCategory) {
        categoryCounts[row.category] = row.count;
      }

      const avgSatisfaction = avgSatisfactionRows[0];
      const avgSatisfactionRating =
        avgSatisfaction?.avg == null ? null : Number(avgSatisfaction.avg);

      return {
        success: true as const,
        data: {
          total: totalRows[0]?.count ?? 0,
          byStatus: statusCounts,
          byCategory: categoryCounts,
          avgSatisfactionRating,
          totalRated: avgSatisfaction?.totalRated ?? 0,
          avgFirstResponseSeconds: avgResponseTime[0]?.avg_seconds ?? null,
        },
      };
    } catch (error) {
      console.error('adminGetStats failed:', error);
      return { success: false as const, error: 'Failed to get stats' };
    }
  });
