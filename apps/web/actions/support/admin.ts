'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/actions/admin';
import { getPresignedDownloadUrl, deleteObject } from '@/lib/bitiful';

import type { Attachment, SupportStatus } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  if (!isAdmin(session.user.email)) return null;
  return session;
}

/** Sign CDN download URLs for all attachments in a list of messages */
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

/** Extract all S3 object keys referenced in message attachments */
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

// ---------------------------------------------------------------------------
// 1. adminGetConversations — filtered & paginated list
// ---------------------------------------------------------------------------

interface AdminGetConversationsParams {
  status?: SupportStatus;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function adminGetConversations(params?: AdminGetConversationsParams) {
  const session = await requireAdmin();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;

  const where: Record<string, unknown> = {};
  if (params?.status) where.status = params.status;
  if (params?.category) where.category = params.category;
  if (params?.search) {
    where.lastMessageContent = { contains: params.search, mode: 'insensitive' };
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
}

// ---------------------------------------------------------------------------
// 2. adminGetConversation — full detail with ALL messages (incl. internal)
// ---------------------------------------------------------------------------

export async function adminGetConversation(conversationId: string) {
  const session = await requireAdmin();
  if (!session) return { success: false as const, error: 'Unauthorized' };

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
}

// ---------------------------------------------------------------------------
// 3. adminReplyConversation — agent reply
// ---------------------------------------------------------------------------

export async function adminReplyConversation(conversationId: string, content: string) {
  const session = await requireAdmin();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  const trimmed = content?.trim();
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
          // Auto-assign if unassigned
          ...(conversation.assignedTo ? {} : { assignedTo: session.user.id }),
          // Track first response time
          ...(isFirstResponse ? { firstResponseAt: now } : {}),
        },
      });
    });

    // TODO: Send email notification to the user about the agent reply

    return { success: true as const };
  } catch (error) {
    console.error('adminReplyConversation failed:', error);
    return { success: false as const, error: 'Failed to send reply' };
  }
}

// ---------------------------------------------------------------------------
// 4. adminUpdateStatus — change conversation status
// ---------------------------------------------------------------------------

export async function adminUpdateStatus(conversationId: string, status: SupportStatus) {
  const session = await requireAdmin();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  try {
    const conversation = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return { success: false as const, error: 'Conversation not found' };

    const now = new Date();
    const data: Record<string, unknown> = { status };

    if (status === 'resolved' && !conversation.resolvedAt) {
      data.resolvedAt = now;
    }
    if (status === 'closed' && !conversation.closedAt) {
      data.closedAt = now;
    }

    await prisma.supportConversation.update({
      where: { id: conversationId },
      data,
    });

    return { success: true as const };
  } catch (error) {
    console.error('adminUpdateStatus failed:', error);
    return { success: false as const, error: 'Failed to update status' };
  }
}

// ---------------------------------------------------------------------------
// 5. adminAssignConversation — assign to an admin user
// ---------------------------------------------------------------------------

export async function adminAssignConversation(conversationId: string, assigneeUserId: string | null) {
  const session = await requireAdmin();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  try {
    const conversation = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return { success: false as const, error: 'Conversation not found' };

    await prisma.supportConversation.update({
      where: { id: conversationId },
      data: { assignedTo: assigneeUserId },
    });

    return { success: true as const };
  } catch (error) {
    console.error('adminAssignConversation failed:', error);
    return { success: false as const, error: 'Failed to assign conversation' };
  }
}

// ---------------------------------------------------------------------------
// 6. adminAddInternalNote — internal-only message (not visible to user)
// ---------------------------------------------------------------------------

export async function adminAddInternalNote(conversationId: string, content: string) {
  const session = await requireAdmin();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  const trimmed = content?.trim();
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
}

// ---------------------------------------------------------------------------
// 7. adminDeleteConversation — delete conversation + S3 objects
// ---------------------------------------------------------------------------

export async function adminDeleteConversation(conversationId: string) {
  const session = await requireAdmin();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  try {
    const conversation = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return { success: false as const, error: 'Conversation not found' };

    // Collect S3 keys from messages and metadata
    const messages = await prisma.supportMessage.findMany({
      where: { conversationId },
      select: { attachments: true },
    });

    const s3Keys = extractS3Keys(messages);

    // Also extract keys from metadata (e.g. screenshots stored at conversation level)
    if (conversation.metadata && typeof conversation.metadata === 'object') {
      const meta = conversation.metadata as Record<string, unknown>;
      if (typeof meta.screenshotKey === 'string') {
        s3Keys.push(meta.screenshotKey);
      }
    }

    // Delete S3 objects (best-effort, don't block on failures)
    await Promise.allSettled(s3Keys.map((key) => deleteObject(key)));

    // Delete conversation (cascade deletes messages)
    await prisma.supportConversation.delete({
      where: { id: conversationId },
    });

    return { success: true as const };
  } catch (error) {
    console.error('adminDeleteConversation failed:', error);
    return { success: false as const, error: 'Failed to delete conversation' };
  }
}

// ---------------------------------------------------------------------------
// 8. adminGetStats — aggregate dashboard statistics
// ---------------------------------------------------------------------------

interface AdminGetStatsParams {
  /** Filter stats to conversations created after this date */
  from?: Date;
  /** Filter stats to conversations created before this date */
  to?: Date;
}

export async function adminGetStats(params?: AdminGetStatsParams) {
  const session = await requireAdmin();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  const dateFilter: Record<string, unknown> = {};
  if (params?.from || params?.to) {
    dateFilter.createdAt = {
      ...(params?.from ? { gte: params.from } : {}),
      ...(params?.to ? { lte: params.to } : {}),
    };
  }

  try {
    const [total, byStatus, byCategory, avgSatisfaction, avgResponseTime] = await Promise.all([
      // Total count
      prisma.supportConversation.count({ where: dateFilter }),

      // Count by status
      prisma.supportConversation.groupBy({
        by: ['status'],
        _count: true,
        where: dateFilter,
      }),

      // Count by category
      prisma.supportConversation.groupBy({
        by: ['category'],
        _count: true,
        where: dateFilter,
      }),

      // Average satisfaction rating (only rated conversations)
      prisma.supportConversation.aggregate({
        _avg: { satisfactionRating: true },
        _count: { satisfactionRating: true },
        where: {
          ...dateFilter,
          satisfactionRating: { not: null },
        },
      }),

      // Average first response time in seconds (using raw SQL for date arithmetic)
      (async () => {
        try {
          const responseTimeFilter: Record<string, unknown> = {
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
}
