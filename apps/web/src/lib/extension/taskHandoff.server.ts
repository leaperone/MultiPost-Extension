import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_VERSION = 'v1';
const TOKEN_TTL_MS = 15 * 60 * 1000;

export interface TaskHandoffIdentity {
  taskId: string;
  userId: string;
  targetClientId: string;
}

function getSigningSecret() {
  const secret =
    process.env.TASK_HANDOFF_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      return 'multipost-development-task-handoff-secret';
    }

    throw new Error('Task handoff signing secret is not configured');
  }

  return secret;
}

function getSignature(identity: TaskHandoffIdentity, expiresAt: number) {
  const payload = [TOKEN_VERSION, identity.taskId, identity.userId, identity.targetClientId, expiresAt.toString()].join(
    '\n',
  );

  return createHmac('sha256', getSigningSecret()).update(payload).digest('base64url');
}

/**
 * Issues a short-lived, task-bound token for the extension handoff page.
 * Only the expiry and signature are exposed in the URL; user and client IDs
 * remain server-side inputs to the signature.
 */
export function createTaskHandoffToken(identity: TaskHandoffIdentity, now: number = Date.now()) {
  const expiresAt = now + TOKEN_TTL_MS;
  const signature = getSignature(identity, expiresAt);
  return `${TOKEN_VERSION}.${expiresAt}.${signature}`;
}

export function verifyTaskHandoffToken(token: string, identity: TaskHandoffIdentity, now: number = Date.now()) {
  const [version, expiresAtValue, providedSignature, ...extraParts] = token.split('.');
  if (version !== TOKEN_VERSION || !expiresAtValue || !providedSignature || extraParts.length > 0) {
    return false;
  }

  const expiresAt = Number(expiresAtValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    return false;
  }

  const expectedSignature = getSignature(identity, expiresAt);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}
