'use server';

import { auth } from '@/auth';
import { multipostDb } from '@/lib/db';
import { DraftFileData } from './types';

/**
 * Create a new dynamic draft
 * @description Creates a new empty dynamic draft for the current user
 * @returns Promise with success status and draft data
 */
export async function createDynamicDraft() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const draft = await multipostDb.dynamicDraft.create({
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
}

/**
 * Get all dynamic drafts for current user
 * @description Retrieves all dynamic drafts ordered by updated date
 * @returns Promise with success status and drafts array
 */
export async function getDynamicDrafts() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const drafts = await multipostDb.dynamicDraft.findMany({
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
}

/**
 * Get a specific dynamic draft by ID
 * @description Retrieves a single dynamic draft for the current user
 * @param {string} draftId - The ID of the draft to retrieve
 * @returns Promise with success status and draft data
 */
export async function getDynamicDraft(draftId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const draft = await multipostDb.dynamicDraft.findFirst({
      where: {
        id: draftId,
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
}

/**
 * Update a dynamic draft
 * @description Updates title, content, images, or videos of a dynamic draft
 * @param {string} draftId - The ID of the draft to update
 * @param {object} data - The data to update (title, content, images, videos)
 * @returns Promise with success status
 */
export async function updateDynamicDraft(
  draftId: string,
  data: {
    title?: string;
    content?: string;
    files?: DraftFileData[];
  },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const dataToSave = {
      ...data,
      files: data.files?.filter((file) => file.source !== 'local'),
    };

    const draft = await multipostDb.dynamicDraft.update({
      where: {
        id: draftId,
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
}

/**
 * Delete a dynamic draft
 * @description Deletes a dynamic draft for the current user
 * @param {string} draftId - The ID of the draft to delete
 * @returns Promise with success status
 */
export async function deleteDynamicDraft(draftId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    const draft = await multipostDb.dynamicDraft.deleteMany({
      where: {
        id: draftId,
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
}
