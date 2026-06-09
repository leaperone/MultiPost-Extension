import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';

export function extractBearerToken(authorization: string | null) {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

export function safeCompareSecret(provided: string | null | undefined, expected: string | null | undefined) {
  if (!provided || !expected) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    const length = Math.max(providedBuffer.length, expectedBuffer.length);
    const paddedProvided = Buffer.alloc(length);
    const paddedExpected = Buffer.alloc(length);

    providedBuffer.copy(paddedProvided);
    expectedBuffer.copy(paddedExpected);
    timingSafeEqual(paddedProvided, paddedExpected);

    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
