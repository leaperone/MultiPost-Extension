import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { multipostDb } from '../lib/db';
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

    const draft = await multipostDb.draft.create({
      data: {
        userId: session.user.id,
        title: '',
        content: '',
      },
    });

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

    const drafts = await multipostDb.draft.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

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

      const draft = await multipostDb.draft.findFirst({
        where: {
          id: data.draftId,
          userId: session.user.id,
        },
      });

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

      const draft = await multipostDb.draft.update({
        where: {
          id: data.draftId,
          userId: session.user.id,
        },
        data: dataToSave,
      });

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

      const draft = await multipostDb.draft.deleteMany({
        where: {
          id: data.draftId,
          userId: session.user.id,
        },
      });

      if (draft.count === 0) {
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

    const imageFiles = await multipostDb.fileHosting.findMany({
      where: {
        userId: session.user.id,
        type: {
          startsWith: 'image',
        },
        deletedAt: null,
        OR: [
          {
            expiredAt: null,
          },
          {
            expiredAt: {
              gt: new Date(),
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

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
