import { createServerFn } from '@tanstack/react-start';

import { deleteObject, getPresignedDownloadUrl } from '@/lib/bitiful';
import { prisma } from '@/lib/db';
import { Prisma } from '@/prisma/client_multipost';
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
} from './types';

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id || !session.user.email) return null;
  if (!isAdmin(session.user.email)) return null;
  return session;
}

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

export const adminGetConversations = createServerFn({ method: 'GET' })
  .validator(adminGetConversationsSchema)
  .handler(async ({ data }) => {
    const session = await requireAdmin();
    if (!session) return { success: false as const, error: 'Unauthorized' };

    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 20;

    const where: Prisma.SupportConversationWhereInput = {};
    if (data.status) where.status = data.status;
    if (data.category) where.category = data.category;
    if (data.search) {
      where.lastMessageContent = { contains: data.search, mode: 'insensitive' };
    }

    try {
      const [conversations, total] = await Promise.all([
        prisma.supportConversation.findMany({
          where,
          select: {
            id: true,
            subject: true,
            status: true,
            category: true,
            priority: true,
            assignedTo: true,
            lastMessageContent: true,
            lastMessageAt: true,
            lastMessageRole: true,
            hasUnreadReply: true,
            satisfactionRating: true,
            createdAt: true,
            updatedAt: true,
            resolvedAt: true,
            closedAt: true,
            firstResponseAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.supportConversation.count({ where }),
      ]);

      return { success: true as const, data: { conversations, total } };
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
      const conversation = await prisma.supportConversation.findUnique({
        where: { id: conversationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      if (!conversation) {
        return { success: false as const, error: 'Conversation not found' };
      }

      const rawMessages = await prisma.supportMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      });

      const messages = await signAttachments(rawMessages);

      return { success: true as const, data: { conversation, messages } };
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
      const conversation = await prisma.supportConversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) return { success: false as const, error: 'Conversation not found' };

      const now = new Date();
      const isFirstResponse = !conversation.firstResponseAt;

      await prisma.$transaction(async (tx) => {
        await tx.supportMessage.create({
          data: {
            conversationId,
            role: 'agent',
            senderUserId: session.user.id,
            content: trimmed,
          },
        });

        await tx.supportConversation.update({
          where: { id: conversationId },
          data: {
            status: 'in_progress',
            lastMessageContent: trimmed.slice(0, 200),
            lastMessageAt: now,
            lastMessageRole: 'agent',
            hasUnreadReply: true,
            ...(conversation.assignedTo ? {} : { assignedTo: session.user.id }),
            ...(isFirstResponse ? { firstResponseAt: now } : {}),
          },
        });
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
      const conversation = await prisma.supportConversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) return { success: false as const, error: 'Conversation not found' };

      const now = new Date();
      const updateData: Prisma.SupportConversationUpdateInput = { status };

      if (status === 'resolved' && !conversation.resolvedAt) {
        updateData.resolvedAt = now;
      }
      if (status === 'closed' && !conversation.closedAt) {
        updateData.closedAt = now;
      }

      await prisma.supportConversation.update({
        where: { id: conversationId },
        data: updateData,
      });

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
      const conversation = await prisma.supportConversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) return { success: false as const, error: 'Conversation not found' };

      await prisma.supportConversation.update({
        where: { id: conversationId },
        data: { assignedTo: assigneeId },
      });

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
      const conversation = await prisma.supportConversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) return { success: false as const, error: 'Conversation not found' };

      await prisma.supportMessage.create({
        data: {
          conversationId,
          role: 'agent',
          senderUserId: session.user.id,
          content: trimmed,
          isInternal: true,
        },
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
      const conversation = await prisma.supportConversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) return { success: false as const, error: 'Conversation not found' };

      const messages = await prisma.supportMessage.findMany({
        where: { conversationId },
        select: { attachments: true },
      });

      const s3Keys = extractS3Keys(messages);

      if (conversation.metadata && typeof conversation.metadata === 'object') {
        const meta = conversation.metadata as Record<string, unknown>;
        if (typeof meta.screenshotKey === 'string') {
          s3Keys.push(meta.screenshotKey);
        }
      }

      await Promise.allSettled(s3Keys.map((key) => deleteObject(key)));

      await prisma.supportConversation.delete({
        where: { id: conversationId },
      });

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

    const dateFilter: Prisma.SupportConversationWhereInput = {};
    if (data.from || data.to) {
      dateFilter.createdAt = {
        ...(data.from ? { gte: data.from } : {}),
        ...(data.to ? { lte: data.to } : {}),
      };
    }

    try {
      const [total, byStatus, byCategory, avgSatisfaction, avgResponseTime] = await Promise.all([
        prisma.supportConversation.count({ where: dateFilter }),
        prisma.supportConversation.groupBy({
          by: ['status'],
          _count: true,
          where: dateFilter,
        }),
        prisma.supportConversation.groupBy({
          by: ['category'],
          _count: true,
          where: dateFilter,
        }),
        prisma.supportConversation.aggregate({
          _avg: { satisfactionRating: true },
          _count: { satisfactionRating: true },
          where: {
            ...dateFilter,
            satisfactionRating: { not: null },
          },
        }),
        (async () => {
          try {
            const responseTimeFilter: Prisma.SupportConversationWhereInput = {
              firstResponseAt: { not: null },
              ...dateFilter,
            };
            const withResponseTime = await prisma.supportConversation.findMany({
              where: responseTimeFilter,
              select: { createdAt: true, firstResponseAt: true },
            });
            if (withResponseTime.length === 0) return [{ avg_seconds: null }];
            const totalSeconds = withResponseTime.reduce((sum, conv) => {
              const diff = (conv.firstResponseAt!.getTime() - conv.createdAt.getTime()) / 1000;
              return sum + diff;
            }, 0);
            return [{ avg_seconds: totalSeconds / withResponseTime.length }];
          } catch {
            return [{ avg_seconds: null }];
          }
        })(),
      ]);

      const statusCounts: Record<string, number> = {};
      for (const row of byStatus) {
        statusCounts[row.status] = row._count;
      }

      const categoryCounts: Record<string, number> = {};
      for (const row of byCategory) {
        categoryCounts[row.category] = row._count;
      }

      return {
        success: true as const,
        data: {
          total,
          byStatus: statusCounts,
          byCategory: categoryCounts,
          avgSatisfactionRating: avgSatisfaction._avg.satisfactionRating,
          totalRated: avgSatisfaction._count.satisfactionRating,
          avgFirstResponseSeconds: avgResponseTime[0]?.avg_seconds ?? null,
        },
      };
    } catch (error) {
      console.error('adminGetStats failed:', error);
      return { success: false as const, error: 'Failed to get stats' };
    }
  });
