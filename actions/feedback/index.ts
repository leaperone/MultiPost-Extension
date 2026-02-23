'use server';

import { auth } from '@/auth';
import { FEEDBACK_CATEGORIES, type SubmitFeedbackData, type SubmitFeedbackResult } from './types';
import { nanoid } from 'nanoid';
import https from 'https';

const WEBHOOK_URL = 'https://frp-ski.com:39383/webhook/feedback/multipost';

/** POST JSON to a URL, skipping TLS certificate verification (self-signed cert) */
function postToWebhook(url: string, payload: Record<string, unknown>): Promise<number> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(url);

    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug Report',
  suggestion: 'Suggestion',
  account: 'Account Issue',
  other: 'Other',
};

export async function submitFeedback(data: SubmitFeedbackData): Promise<SubmitFeedbackResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, message: 'Unauthorized' };
  }

  const validCategories = Object.values(FEEDBACK_CATEGORIES);
  if (!validCategories.includes(data.category)) {
    return { success: false, message: 'Invalid category' };
  }

  if (!data.title || data.title.length > 200) {
    return { success: false, message: 'Title is required and must be under 200 characters' };
  }

  if (!data.content || data.content.length > 2000) {
    return { success: false, message: 'Content is required and must be under 2000 characters' };
  }

  const feedbackId = nanoid();
  const now = new Date().toISOString();
  const userId = session.user.id ?? 'unknown';
  const username = session.user.username ?? session.user.name ?? 'unknown';

  const contactLine =
    data.contactMethod && data.contactValue ? `\n**Contact**: ${data.contactMethod}:${data.contactValue}` : '';

  const body = [
    `**User**: ${username} (\`${userId}\`)`,
    `**Time**: ${now}`,
    `**Page**: ${data.pageUrl ?? 'N/A'}`,
    `**Feedback ID**: \`${feedbackId}\``,
    contactLine,
    '',
    '## Feedback',
    '',
    data.content,
    '',
    '<details><summary>App State</summary>',
    '',
    '```json',
    data.appState ?? '{}',
    '```',
    '',
    '</details>',
    '',
    '<details><summary>Browser Info</summary>',
    '',
    '```json',
    data.browserInfo ?? '{}',
    '```',
    '',
    '</details>',
  ].join('\n');

  const categoryLabel = CATEGORY_LABELS[data.category] ?? data.category;
  const labels = ['feedback', data.category];

  const webhookBody: Record<string, unknown> = {
    title: `[${categoryLabel}] ${data.title}`,
    body,
    labels,
    contact: data.contactMethod && data.contactValue ? `${data.contactMethod}:${data.contactValue}` : undefined,
    source: 'MultiPost',
  };

  if (data.screenshot) {
    webhookBody.screenshot = data.screenshot;
  }

  try {
    const statusCode = await postToWebhook(WEBHOOK_URL, webhookBody);

    if (statusCode < 200 || statusCode >= 300) {
      console.error('Webhook failed:', statusCode);
      return { success: false, message: 'Failed to send feedback' };
    }

    return { success: true };
  } catch (error) {
    console.error('Webhook error:', error);
    return { success: false, message: 'Failed to send feedback' };
  }
}
