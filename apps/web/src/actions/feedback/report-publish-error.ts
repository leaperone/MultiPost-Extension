import { createServerFn } from '@tanstack/react-start';
import * as Sentry from '@sentry/core';

import { getPresignedDownloadUrl, headObject } from '@/lib/bitiful';
import { getSession } from '../../lib/session';
import {
  reportPublishErrorSchema,
  type ReportPublishErrorResult,
} from './types';

const ALLOWED_SCREENSHOT_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

function truncate(value: string | undefined | null, max: number): string | undefined {
  if (!value) return undefined;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function getOptionalUsername(user: { name?: string | null } | null | undefined): string | undefined {
  if (!user || !('username' in user)) return undefined;
  const username = user.username;
  return typeof username === 'string' ? username : undefined;
}

/**
 * Submit a publish-failure / platform-issue report.
 *
 * User identity is read from the server session and never trusted from the
 * client. Screenshot keys are accepted only from the signed-in user's prefix.
 */
export const reportPublishError = createServerFn({ method: 'POST' })
  .validator(reportPublishErrorSchema)
  .handler(async ({ data }): Promise<ReportPublishErrorResult> => {
    const session = await getSession();
    const user = session?.user;

    let screenshotKey = data.screenshotKey;
    let screenshotUrl: string | undefined;
    if (screenshotKey) {
      const expectedPrefix = user?.id ? `feedback/${user.id}/` : null;
      if (!expectedPrefix || !screenshotKey.startsWith(expectedPrefix)) {
        screenshotKey = undefined;
      }
    }
    if (screenshotKey) {
      try {
        const meta = await headObject(screenshotKey);
        const contentType = meta.ContentType?.toLowerCase();
        if (!contentType || !ALLOWED_SCREENSHOT_MIME.has(contentType)) {
          screenshotKey = undefined;
        } else {
          try {
            screenshotUrl = await getPresignedDownloadUrl(screenshotKey, 7 * 24 * 60 * 60, {
              'x-bitiful-max-requests': '100',
            });
          } catch {
            // Keep the verified key in Sentry context for manual lookup.
          }
        }
      } catch {
        screenshotKey = undefined;
      }
    }

    const name = user?.name ?? getOptionalUsername(user) ?? 'Anonymous';
    const email = user?.email ?? 'anonymous@multipost.local';

    const messageParts = [
      `[${data.errorType}] ${data.description}`,
      data.platform ? `Platform: ${data.platform}` : undefined,
      data.taskId ? `Task: ${data.taskId}` : undefined,
      data.errorMessage ? `Adapter error: ${truncate(data.errorMessage, 500)}` : undefined,
    ].filter(Boolean) as string[];

    try {
      const tags: Record<string, string> = {
        feature: 'publish-failure-report',
        source: data.source,
        platform: data.platform ?? 'unknown',
        errorType: data.errorType,
      };
      if (data.status) tags.publishStatus = data.status;

      const contexts: Record<string, Record<string, unknown>> = {
        publishTask: {
          taskId: data.taskId,
          logId: data.logId,
          status: data.status,
          platform: data.platform,
          errorMessage: truncate(data.errorMessage, 1000),
        },
      };
      if (screenshotKey) {
        contexts.screenshot = { key: screenshotKey, url: screenshotUrl };
      }
      if (data.page) {
        contexts.page = { url: data.page };
      }

      const eventId = Sentry.captureFeedback(
        {
          name,
          email,
          message: messageParts.join('\n'),
        },
        {
          captureContext: {
            tags,
            contexts,
            user: user?.id
              ? {
                  id: user.id,
                  email: user.email ?? undefined,
                  username: user.name ?? undefined,
                }
              : undefined,
          },
        },
      );

      await Sentry.flush(2000).catch(() => undefined);

      return { ok: true, eventId };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to send feedback',
      };
    }
  });
