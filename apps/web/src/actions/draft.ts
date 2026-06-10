import { createServerFn } from '@tanstack/react-start';
import { Draft, FileHosting } from '@db/schema/schema';
import type { JsonValue } from '@db/helpers';
import { and, desc, eq, gt, isNull, like, or } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../lib/db';
import { DraftFileDataSchema } from '@/lib/types/draft';
import { getSession } from '../lib/session';

const draftIdSchema = z.object({
  draftId: z.string(),
});

const updateDynamicDraftSchema = z.object({
  draftId: z.string(),
  data: z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    files: z.array(DraftFileDataSchema).optional(),
  }),
});

export const createDynamicDraft = createServerFn({ method: 'POST' }).handler(async () => {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const [draft] = await db
      .insert(Draft)
      .values({
        userId: session.user.id,
        title: '',
        content: '',
      })
      .returning();

    return {
      success: true,
      data: draft,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to create draft',
    };
  }
});

export const getDynamicDrafts = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const drafts = await db
      .select()
      .from(Draft)
      .where(eq(Draft.userId, session.user.id))
      .orderBy(desc(Draft.updatedAt));

    return {
      success: true,
      data: drafts,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get drafts',
    };
  }
});

export const getDynamicDraft = createServerFn({ method: 'GET' })
  .validator(draftIdSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Authentication failed',
        };
      }

      const [draft] = await db
        .select()
        .from(Draft)
        .where(and(eq(Draft.id, data.draftId), eq(Draft.userId, session.user.id)))
        .limit(1);

      if (!draft) {
        return {
          success: false,
          error: 'Draft not found',
        };
      }

      return {
        success: true,
        data: draft,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get draft',
      };
    }
  });

export const updateDynamicDraft = createServerFn({ method: 'POST' })
  .validator(updateDynamicDraftSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Authentication failed',
        };
      }

      const dataToSave = {
        ...data.data,
        files: data.data.files?.filter((file) => file.source !== 'local'),
      };

      const [draft] = await db
        .update(Draft)
        .set({
          ...dataToSave,
          files: dataToSave.files as JsonValue[] | undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(Draft.id, data.draftId), eq(Draft.userId, session.user.id)))
        .returning();

      if (!draft) {
        return {
          success: false,
          error: 'Draft not found or unauthorized',
        };
      }

      return {
        success: true,
        data: {
          draft,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update draft',
      };
    }
  });

export const deleteDynamicDraft = createServerFn({ method: 'POST' })
  .validator(draftIdSchema)
  .handler(async ({ data }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: 'Authentication failed',
        };
      }

      const deletedDrafts = await db
        .delete(Draft)
        .where(and(eq(Draft.id, data.draftId), eq(Draft.userId, session.user.id)))
        .returning({ id: Draft.id });

      if (deletedDrafts.length === 0) {
        return {
          success: false,
          error: 'Draft not found or unauthorized',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete draft',
      };
    }
  });

export const getUserImageFiles = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const imageFiles = await db
      .select()
      .from(FileHosting)
      .where(
        and(
          eq(FileHosting.userId, session.user.id),
          like(FileHosting.type, 'image%'),
          isNull(FileHosting.deletedAt),
          or(isNull(FileHosting.expiredAt), gt(FileHosting.expiredAt, new Date())),
        ),
      )
      .orderBy(desc(FileHosting.createdAt));

    return {
      success: true,
      data: imageFiles,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get image files',
    };
  }
});
