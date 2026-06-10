import { createServerFn } from '@tanstack/react-start';
import { SupportConversation, SupportMessage } from '@db/schema/schema';
import { and, asc, count, desc, eq, isNull, ne } from 'drizzle-orm';
import crypto from 'node:crypto';

import { getPresignedDownloadUrl, getPresignedUploadUrl } from '@/lib/bitiful';
import { db } from '../../lib/db';
import { getSession } from '../../lib/session';
import {
  addMessageSchema,
  createConversationSchema,
  getConversationsSchema,
  getSupportUploadUrlSchema,
  rateConversationSchema,
  supportConversationIdSchema,
  type Attachment,
} from './types';

const SUPPORT_KEY_PATTERN = /^support\/[\w-]+\/[\w-]+$/;

type SerializableJson =
  | string
  | number
  | boolean
  | null
  | SerializableJson[]
  | { [key: string]: SerializableJson };

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

function isValidSupportKey(key: string) {
  return SUPPORT_KEY_PATTERN.test(key);
}

function isNewSupportKeyForUser(key: string, userId: string) {
  const parts = key.split('/');
  return parts[1] === 'new' && parts[2]?.startsWith(`${userId}-`);
}

function isConversationSupportKey(key: string, conversationId: string) {
  const parts = key.split('/');
  return parts[1] === conversationId;
}

function nullableDateCondition(
  column: typeof SupportConversation.lastMessageAt,
  value: Date | null,
) {
  return value === null ? isNull(column) : eq(column, value);
}

function nullableTextCondition(
  column: typeof SupportConversation.lastMessageRole,
  value: string | null,
) {
  return value === null ? isNull(column) : eq(column, value);
}

function toSerializableJson(value: unknown): SerializableJson {
  if (value === undefined) return null;

  const serialized = JSON.stringify(value);
  if (serialized === undefined) return null;

  return JSON.parse(serialized) as SerializableJson;
}

/**
 * Get presigned upload URL for support attachments.
 */
export const getSupportUploadUrl = createServerFn({ method: 'POST' })
  .validator(getSupportUploadUrlSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) return { success: false as const, error: 'Unauthenticated' };

    const conversationId = data.conversationId;

    if (conversationId) {
      const [conv] = await db
        .select({ id: SupportConversation.id })
        .from(SupportConversation)
        .where(
          and(
            eq(SupportConversation.id, conversationId),
            eq(SupportConversation.userId, session.user.id),
          ),
        )
        .limit(1);
      if (!conv) return { success: false as const, error: 'Conversation not found' };
    }

    const uuid = crypto.randomUUID();
    const key = conversationId
      ? `support/${conversationId}/${uuid}`
      : `support/new/${session.user.id}-${uuid}`;

    const uploadUrl = await getPresignedUploadUrl(key, 15 * 60);
    return { success: true as const, key, uploadUrl };
  });

/**
 * Create a new support conversation with first message.
 */
export const createConversation = createServerFn({ method: 'POST' })
  .validator(createConversationSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) return { success: false as const, error: 'Unauthenticated' };
    const userId = session.user.id;

    const subject = data.subject?.trim();
    if (!subject || subject.length > 200) {
      return { success: false as const, error: 'Subject is required and max 200 chars' };
    }

    const content = data.content?.trim();
    if (!content || content.length > 2000) {
      return { success: false as const, error: 'Content is required and max 2000 chars' };
    }

    const metadata: Record<string, unknown> = {};
    if (data.appState) metadata.appState = data.appState;
    if (data.browserInfo) metadata.browserInfo = data.browserInfo;

    const attachments: Attachment[] = [];
    if (data.screenshotKey) {
      if (!isValidSupportKey(data.screenshotKey)) {
        return { success: false as const, error: 'Invalid screenshot key' };
      }
      attachments.push({ type: 'screenshot', key: data.screenshotKey });
    }
    if (data.attachmentKeys) {
      if (data.attachmentKeys.some((k) => !isValidSupportKey(k))) {
        return { success: false as const, error: 'Invalid attachment key' };
      }
      for (const key of data.attachmentKeys) {
        attachments.push({ type: 'image', key });
      }
    }

    const allKeys = [
      ...(data.screenshotKey ? [data.screenshotKey] : []),
      ...(data.attachmentKeys || []),
    ];
    for (const key of allKeys) {
      if (!isNewSupportKeyForUser(key, userId)) {
        return { success: false as const, error: 'Invalid attachment key' };
      }
    }

    try {
      const now = new Date();
      const conversation = await db.transaction(async (tx) => {
        const [conv] = await tx
          .insert(SupportConversation)
          .values({
            userId,
            subject,
            category: data.category || 'other',
            priority: data.priority || 'normal',
            pageUrl: data.pageUrl,
            metadata: Object.keys(metadata).length ? toSerializableJson(metadata) : undefined,
            lastMessageContent: content.slice(0, 200),
            lastMessageAt: now,
            lastMessageRole: 'user',
          })
          .returning();

        if (!conv) {
          throw new Error('Failed to create conversation');
        }

        await tx.insert(SupportMessage).values({
          conversationId: conv.id,
          role: 'user',
          senderUserId: userId,
          content,
          attachments: attachments?.length ? toSerializableJson(attachments) : undefined,
        });

        return conv;
      });

      return { success: true as const, conversationId: conversation.id };
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return { success: false as const, error: 'Failed to create conversation' };
    }
  });

/**
 * Get paginated list of user's conversations.
 */
export const getConversations = createServerFn({ method: 'GET' })
  .validator(getConversationsSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) return { success: false as const, error: 'Unauthenticated' };

    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 20;

    try {
      const conversations = await db
        .select({
          id: SupportConversation.id,
          subject: SupportConversation.subject,
          status: SupportConversation.status,
          category: SupportConversation.category,
          priority: SupportConversation.priority,
          lastMessageContent: SupportConversation.lastMessageContent,
          lastMessageAt: SupportConversation.lastMessageAt,
          lastMessageRole: SupportConversation.lastMessageRole,
          hasUnreadReply: SupportConversation.hasUnreadReply,
          createdAt: SupportConversation.createdAt,
          updatedAt: SupportConversation.updatedAt,
        })
        .from(SupportConversation)
        .where(eq(SupportConversation.userId, session.user.id))
        .orderBy(desc(SupportConversation.updatedAt))
        .offset((page - 1) * pageSize)
        .limit(pageSize);

      return { success: true as const, data: conversations };
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return { success: false as const, error: 'Failed to get conversations' };
    }
  });

/**
 * Get conversation detail with messages and mark unread as read.
 */
export const getConversation = createServerFn({ method: 'POST' })
  .validator(supportConversationIdSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) return { success: false as const, error: 'Unauthenticated' };

    const { conversationId } = data;

    try {
      const [conversation] = await db
        .select()
        .from(SupportConversation)
        .where(
          and(
            eq(SupportConversation.id, conversationId),
            eq(SupportConversation.userId, session.user.id),
          ),
        )
        .limit(1);

      if (!conversation) {
        return { success: false as const, error: 'Conversation not found' };
      }

      const rawMessages = await db
        .select()
        .from(SupportMessage)
        .where(
          and(
            eq(SupportMessage.conversationId, conversationId),
            eq(SupportMessage.isInternal, false),
          ),
        )
        .orderBy(asc(SupportMessage.createdAt));

      let hasUnreadReply = conversation.hasUnreadReply;
      if (conversation.hasUnreadReply) {
        const cleared = await db
          .update(SupportConversation)
          .set({ hasUnreadReply: false })
          .where(
            and(
              eq(SupportConversation.id, conversationId),
              eq(SupportConversation.userId, session.user.id),
              eq(SupportConversation.hasUnreadReply, true),
              nullableDateCondition(SupportConversation.lastMessageAt, conversation.lastMessageAt),
              nullableTextCondition(SupportConversation.lastMessageRole, conversation.lastMessageRole),
            ),
          )
          .returning({ id: SupportConversation.id });
        hasUnreadReply = cleared.length === 0;
      }

      const messages = await signAttachments(rawMessages);

      return {
        success: true as const,
        data: {
          conversation: {
            ...conversation,
            metadata: toSerializableJson(conversation.metadata),
            hasUnreadReply,
          },
          messages,
        },
      };
    } catch (error) {
      console.error('Failed to get conversation:', error);
      return { success: false as const, error: 'Failed to get conversation' };
    }
  });

/**
 * Add a user reply to an existing conversation.
 */
export const addMessage = createServerFn({ method: 'POST' })
  .validator(addMessageSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) return { success: false as const, error: 'Unauthenticated' };

    const { conversationId, attachmentKeys } = data;
    const trimmed = data.content?.trim();
    if (!trimmed || trimmed.length > 2000) {
      return { success: false as const, error: 'Message is required and max 2000 chars' };
    }

    try {
      const [conversation] = await db
        .select({
          id: SupportConversation.id,
          status: SupportConversation.status,
        })
        .from(SupportConversation)
        .where(
          and(
            eq(SupportConversation.id, conversationId),
            eq(SupportConversation.userId, session.user.id),
          ),
        )
        .limit(1);

      if (!conversation) return { success: false as const, error: 'Conversation not found' };
      if (conversation.status === 'closed') {
        return { success: false as const, error: 'Conversation is closed' };
      }

      if (attachmentKeys?.some((k) => !isValidSupportKey(k))) {
        return { success: false as const, error: 'Invalid attachment key' };
      }

      if (attachmentKeys?.length) {
        for (const key of attachmentKeys) {
          if (
            !isConversationSupportKey(key, conversationId) &&
            !isNewSupportKeyForUser(key, session.user.id)
          ) {
            return {
              success: false as const,
              error: 'Attachment does not belong to this conversation',
            };
          }
        }
      }

      const attachments: Attachment[] | undefined = attachmentKeys?.length
        ? attachmentKeys.map((key) => ({ type: 'image' as const, key }))
        : undefined;

      const now = new Date();

      await db.transaction(async (tx) => {
        const updated = await tx
          .update(SupportConversation)
          .set({
            status: 'open',
            lastMessageContent: trimmed.slice(0, 200),
            lastMessageAt: now,
            lastMessageRole: 'user',
            resolvedAt: null,
            closedAt: null,
          })
          .where(
            and(
              eq(SupportConversation.id, conversationId),
              eq(SupportConversation.userId, session.user.id),
              ne(SupportConversation.status, 'closed'),
            ),
          )
          .returning({ id: SupportConversation.id });

        if (updated.length === 0) {
          throw new Error('CONVERSATION_CLOSED');
        }

        await tx.insert(SupportMessage).values({
          conversationId,
          role: 'user',
          senderUserId: session.user.id,
          content: trimmed,
          attachments: attachments?.length ? toSerializableJson(attachments) : undefined,
        });
      });

      return { success: true as const };
    } catch (error) {
      if (error instanceof Error && error.message === 'CONVERSATION_CLOSED') {
        return { success: false as const, error: 'Conversation is closed' };
      }

      console.error('Failed to add message:', error);
      return { success: false as const, error: 'Failed to send message' };
    }
  });

/**
 * Rate a resolved/closed conversation.
 */
export const rateConversation = createServerFn({ method: 'POST' })
  .validator(rateConversationSchema)
  .handler(async ({ data }) => {
    const session = await getSession();
    if (!session?.user?.id) return { success: false as const, error: 'Unauthenticated' };

    const { conversationId, rating, comment } = data;
    if (rating < 1 || rating > 5) {
      return { success: false as const, error: 'Rating must be 1-5' };
    }

    try {
      const [conversation] = await db
        .select()
        .from(SupportConversation)
        .where(
          and(
            eq(SupportConversation.id, conversationId),
            eq(SupportConversation.userId, session.user.id),
          ),
        )
        .limit(1);

      if (!conversation) return { success: false as const, error: 'Conversation not found' };
      if (conversation.status !== 'resolved' && conversation.status !== 'closed') {
        return { success: false as const, error: 'Can only rate resolved or closed conversations' };
      }
      if (conversation.satisfactionRating !== null) {
        return { success: false as const, error: 'Already rated' };
      }

      await db
        .update(SupportConversation)
        .set({
          satisfactionRating: rating,
          satisfactionComment: comment?.trim() || null,
        })
        .where(eq(SupportConversation.id, conversationId));

      return { success: true as const };
    } catch (error) {
      console.error('Failed to rate conversation:', error);
      return { success: false as const, error: 'Failed to rate' };
    }
  });

/**
 * Get unread count and whether user has active tickets.
 */
export const getSupportBadgeInfo = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ unread: number; hasActive: boolean }> => {
    const session = await getSession();
    if (!session?.user?.id) return { unread: 0, hasActive: false };

    try {
      const [unreadRows, activeRows] = await Promise.all([
        db
          .select({ count: count() })
          .from(SupportConversation)
          .where(
            and(
              eq(SupportConversation.userId, session.user.id),
              eq(SupportConversation.hasUnreadReply, true),
            ),
          ),
        db
          .select({ count: count() })
          .from(SupportConversation)
          .where(
            and(
              eq(SupportConversation.userId, session.user.id),
              ne(SupportConversation.status, 'closed'),
            ),
          ),
      ]);

      const unreadCount = unreadRows[0]?.count ?? 0;
      const activeCount = activeRows[0]?.count ?? 0;

      return { unread: unreadCount, hasActive: unreadCount > 0 || activeCount > 0 };
    } catch {
      return { unread: 0, hasActive: false };
    }
  },
);
