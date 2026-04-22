'use server';

import crypto from 'node:crypto';

import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';
import { getPresignedDownloadUrl, getPresignedUploadUrl } from '@/lib/bitiful';
import { Prisma } from '@/prisma/client_multipost';

import type { Attachment, CreateConversationData } from './types';

/** Sign CDN URLs for message attachments */
async function signAttachments<T extends { attachments: unknown }>(messages: T[]) {
  return Promise.all(
    messages.map(async (msg) => {
      const atts = msg.attachments as Attachment[] | null;
      if (!atts?.length) return msg;
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

/** Get presigned upload URL for support attachments */
export async function getSupportUploadUrl(conversationId?: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: 'Unauthenticated' };

  // If a conversationId is provided, verify it belongs to the current user
  if (conversationId) {
    const conv = await multipostDb.supportConversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
      select: { id: true },
    });
    if (!conv) return { success: false as const, error: 'Conversation not found' };
  }

  const uuid = crypto.randomUUID();
  const convId = conversationId || 'new';
  const key = `support/${convId}/${uuid}`;

  const uploadUrl = await getPresignedUploadUrl(key, 15 * 60);
  return { success: true as const, key, uploadUrl };
}

/** Create a new support conversation with first message */
export async function createConversation(data: CreateConversationData) {
  const session = await auth();
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

  const isValidSupportKey = (key: string) => /^support\/[\w-]+\/[\w-]+$/.test(key);

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

  // Conversation hasn't been created yet — only allow keys with "new" prefix
  const allKeys = [...(data.screenshotKey ? [data.screenshotKey] : []), ...(data.attachmentKeys || [])];
  for (const key of allKeys) {
    const parts = key.split('/');
    if (parts[1] !== 'new') {
      return { success: false as const, error: 'Invalid attachment key' };
    }
  }

  try {
    const now = new Date();
    const conversation = await multipostDb.$transaction(async (tx) => {
      const conv = await tx.supportConversation.create({
        data: {
          userId,
          subject,
          category: data.category || 'other',
          priority: data.priority || 'normal',
          pageUrl: data.pageUrl,
          metadata: Object.keys(metadata).length ? (metadata as Prisma.InputJsonValue) : undefined,
          lastMessageContent: content.slice(0, 200),
          lastMessageAt: now,
          lastMessageRole: 'user',
        },
      });

      await tx.supportMessage.create({
        data: {
          conversationId: conv.id,
          role: 'user',
          senderUserId: userId,
          content,
          attachments: attachments.length ? (attachments as unknown as Prisma.InputJsonValue) : undefined,
        },
      });

      return conv;
    });

    return { success: true as const, conversationId: conversation.id };
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return { success: false as const, error: 'Failed to create conversation' };
  }
}

/** Get paginated list of user's conversations */
export async function getConversations(params?: { page?: number; pageSize?: number }) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: 'Unauthenticated' };

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;

  try {
    const conversations = await multipostDb.supportConversation.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        subject: true,
        status: true,
        category: true,
        priority: true,
        lastMessageContent: true,
        lastMessageAt: true,
        lastMessageRole: true,
        hasUnreadReply: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { success: true as const, data: conversations };
  } catch (error) {
    console.error('Failed to get conversations:', error);
    return { success: false as const, error: 'Failed to get conversations' };
  }
}

/** Get conversation detail with messages (marks unread as read) */
export async function getConversation(conversationId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: 'Unauthenticated' };

  try {
    const conversation = await multipostDb.supportConversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
    });

    if (!conversation) {
      return { success: false as const, error: 'Conversation not found' };
    }

    const rawMessages = await multipostDb.supportMessage.findMany({
      where: { conversationId, isInternal: false },
      orderBy: { createdAt: 'asc' },
    });

    let hasUnreadReply = conversation.hasUnreadReply;
    if (conversation.hasUnreadReply) {
      const cleared = await multipostDb.supportConversation.updateMany({
        where: {
          id: conversationId,
          userId: session.user.id,
          hasUnreadReply: true,
          lastMessageAt: conversation.lastMessageAt,
          lastMessageRole: conversation.lastMessageRole,
        },
        data: { hasUnreadReply: false },
      });
      hasUnreadReply = cleared.count === 0;
    }

    const messages = await signAttachments(rawMessages);

    return {
      success: true as const,
      data: {
        conversation: { ...conversation, hasUnreadReply },
        messages,
      },
    };
  } catch (error) {
    console.error('Failed to get conversation:', error);
    return { success: false as const, error: 'Failed to get conversation' };
  }
}

/** Add a user reply to an existing conversation */
export async function addMessage(conversationId: string, content: string, attachmentKeys?: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: 'Unauthenticated' };

  const trimmed = content?.trim();
  if (!trimmed || trimmed.length > 2000) {
    return { success: false as const, error: 'Message is required and max 2000 chars' };
  }

  try {
    const conversation = await multipostDb.supportConversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
      select: { id: true, status: true },
    });

    if (!conversation) return { success: false as const, error: 'Conversation not found' };
    if (conversation.status === 'closed') return { success: false as const, error: 'Conversation is closed' };

    const isValidSupportKey = (key: string) => /^support\/[\w-]+\/[\w-]+$/.test(key);
    if (attachmentKeys?.some((k) => !isValidSupportKey(k))) {
      return { success: false as const, error: 'Invalid attachment key' };
    }

    // Verify each key belongs to this conversation or was uploaded before creation ("new")
    if (attachmentKeys?.length) {
      for (const key of attachmentKeys) {
        const parts = key.split('/');
        if (parts[1] !== conversationId && parts[1] !== 'new') {
          return { success: false as const, error: 'Attachment does not belong to this conversation' };
        }
      }
    }

    const attachments: Attachment[] | undefined = attachmentKeys?.length
      ? attachmentKeys.map((key) => ({ type: 'image' as const, key }))
      : undefined;

    const now = new Date();

    await multipostDb.$transaction(async (tx) => {
      const updated = await tx.supportConversation.updateMany({
        where: {
          id: conversationId,
          userId: session.user.id,
          status: { not: 'closed' },
        },
        data: {
          status: 'open',
          lastMessageContent: trimmed.slice(0, 200),
          lastMessageAt: now,
          lastMessageRole: 'user',
          resolvedAt: null,
          closedAt: null,
        },
      });

      if (updated.count === 0) {
        throw new Error('CONVERSATION_CLOSED');
      }

      await tx.supportMessage.create({
        data: {
          conversationId,
          role: 'user',
          senderUserId: session.user.id,
          content: trimmed,
          attachments: attachments as unknown as Prisma.InputJsonValue,
        },
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
}

/** Rate a resolved/closed conversation */
export async function rateConversation(conversationId: string, rating: number, comment?: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: 'Unauthenticated' };

  if (rating < 1 || rating > 5) return { success: false as const, error: 'Rating must be 1-5' };

  try {
    const conversation = await multipostDb.supportConversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
    });

    if (!conversation) return { success: false as const, error: 'Conversation not found' };
    if (conversation.status !== 'resolved' && conversation.status !== 'closed') {
      return { success: false as const, error: 'Can only rate resolved or closed conversations' };
    }
    if (conversation.satisfactionRating !== null) return { success: false as const, error: 'Already rated' };

    await multipostDb.supportConversation.update({
      where: { id: conversationId },
      data: {
        satisfactionRating: rating,
        satisfactionComment: comment?.trim() || null,
      },
    });

    return { success: true as const };
  } catch (error) {
    console.error('Failed to rate conversation:', error);
    return { success: false as const, error: 'Failed to rate' };
  }
}

/** Get unread count and whether user has active tickets */
export async function getSupportBadgeInfo(): Promise<{ unread: number; hasActive: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { unread: 0, hasActive: false };

  try {
    const [unreadCount, activeCount] = await Promise.all([
      multipostDb.supportConversation.count({
        where: { userId: session.user.id, hasUnreadReply: true },
      }),
      multipostDb.supportConversation.count({
        where: { userId: session.user.id, status: { not: 'closed' } },
      }),
    ]);

    return { unread: unreadCount, hasActive: unreadCount > 0 || activeCount > 0 };
  } catch {
    return { unread: 0, hasActive: false };
  }
}
