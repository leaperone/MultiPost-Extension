const PRISMA_TRANSIENT_DB_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
const PG_TRANSIENT_DB_ERROR_CODES = new Set(['57P01', '57P02', '57P03']);
const NETWORK_TRANSIENT_DB_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNRESET',
]);

function errorCode(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  return undefined;
}

function errorCause(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'cause' in error
  ) {
    return (error as { cause?: unknown }).cause;
  }

  return undefined;
}

function isPgConnectionSqlState(code: string) {
  return code.startsWith('08') || PG_TRANSIENT_DB_ERROR_CODES.has(code);
}

function* errorChain(error: unknown) {
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current && !seen.has(current)) {
    seen.add(current);
    yield current;
    current = errorCause(current);
  }
}

export function transientDbErrorCode(error: unknown) {
  for (const current of errorChain(error)) {
    const code = errorCode(current);
    if (code) {
      return code;
    }
  }

  return undefined;
}

export function isTransientDbError(error: unknown): boolean {
  for (const current of errorChain(error)) {
    const code = errorCode(current);
    if (
      code &&
      (PRISMA_TRANSIENT_DB_ERROR_CODES.has(code) ||
        NETWORK_TRANSIENT_DB_ERROR_CODES.has(code) ||
        isPgConnectionSqlState(code))
    ) {
      return true;
    }

    const message = errorMessage(current);
    if (
      message &&
      /(Can't reach database server at|connect ECONNREFUSED|getaddrinfo ENOTFOUND|connect ETIMEDOUT|read ECONNRESET|Connection terminated unexpectedly|server closed the connection unexpectedly|terminating connection due to administrator command|database system is (shutting down|starting up|in recovery mode))/i.test(
        message,
      )
    ) {
      return true;
    }
  }

  return false;
}

export function isUniqueConstraintError(error: unknown): boolean {
  for (const current of errorChain(error)) {
    const code = errorCode(current);
    if (code === 'P2002' || code === '23505') {
      return true;
    }
  }

  return false;
}
