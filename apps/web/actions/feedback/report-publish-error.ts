'use server';

import * as Sentry from '@sentry/nextjs';

import { auth } from '@/auth';
import { getPresignedDownloadUrl, headObject } from '@/lib/bitiful';

import {
  ERROR_TYPES,
  reportPublishErrorSchema,
  type ReportPublishErrorInput,
  type ReportPublishErrorResult,
} from './types';

const ALLOWED_SCREENSHOT_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

function truncate(value: string | undefined | null, max: number): string | undefined {
  if (!value) return undefined;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Submit a publish-failure / platform-issue report.
 *
 * The report is forwarded to Sentry via `captureFeedback`, with the publish task
 * context (platform, taskId, logId, status, error) attached as tags / contexts
 * so the team can triage adapter regressions. User identity (when available)
 * is read from the server session and never trusted from the client.
 */
export async function reportPublishError(
  input: ReportPublishErrorInput,
): Promise<ReportPublishErrorResult> {
  const parsed = reportPublishErrorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((issue) => issue.message).join('; '),
    };
  }

  const data = parsed.data;
  const session = await auth();
  const user = session?.user;

  // Verify the uploaded screenshot's real Content-Type via headObject — the
  // client-side MIME check can be bypassed by renaming a non-image file.
  // Also enforce ownership: the key must live under the current user's prefix
  // to prevent referencing screenshots uploaded by other users.
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
        // Drop the screenshot but keep the rest of the report.
        screenshotKey = undefined;
      } else {
        try {
          screenshotUrl = await getPresignedDownloadUrl(screenshotKey, 7 * 24 * 60 * 60, {
            'x-bitiful-max-requests': '100',
          });
        } catch {
          // ignore — the key is still attached as context for manual lookup
        }
      }
    } catch {
      // Object missing or head failed — drop the screenshot reference.
      screenshotKey = undefined;
    }
  }

  const name = user?.name ?? user?.username ?? 'Anonymous';
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

    // Flush so the feedback is delivered even when the lambda exits quickly.
    await Sentry.flush(2000).catch(() => undefined);

    return { ok: true, eventId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to send feedback',
    };
  }
}

export { ERROR_TYPES };
