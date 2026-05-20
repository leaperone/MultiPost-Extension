import type { SpanJSON, TransactionEvent } from "@sentry/core";
import type { Breadcrumb, BreadcrumbHint, ErrorEvent, EventHint } from "@sentry/nextjs";

import {
  FILTERED_VALUE,
  isPhoneLikeNumberValue,
  isQueryContainerKey,
  isSensitiveQueryKeyName,
  isSensitiveRedactionField,
  redactStringValue,
} from "./lib/redaction-primitives";

// TEMP DISABLED in v4.2.38: filter 误伤真 bug，accepted events 暴跌 99%，定位中
// import { shouldDropEvent } from "./sentry.noise-filter";

const MAX_DEPTH = 5;
const MAX_ALLOWED_SENTRY_USER_FIELD_LENGTH = 256;

const SENTRY_SYSTEM_NUMBER_FIELDS = new Set([
  "duration",
  "end_timestamp",
  "exclusive_time",
  "received",
  "sample_rate",
  "severityNumber",
  "severity_number",
  "start_timestamp",
  "timestamp",
]);
const SENTRY_CUSTOM_DATA_CONTAINERS = new Set(["attributes", "extra", "tags"]);
const SENTRY_TRACE_CONTEXT_NUMBER_FIELDS = new Set(["sample_rate"]);

interface RedactionState {
  depth: number;
  parentKey: string;
  path: string[];
  preserveSentrySystemNumbers: boolean;
  seen: WeakSet<object>;
}

interface RedactionVisitContext {
  path: string[];
}

function pathMatches(path: string[], pattern: string[]) {
  return path.length === pattern.length && pattern.every((part, index) => part === "*" || path[index] === part);
}

function visitContext(key: string, context: RedactionState): RedactionVisitContext {
  return {
    path: key ? [...context.path, key] : context.path,
  };
}

function looksLikeSentryPayload(value: unknown) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const contexts = record.contexts;
  const hasTraceContext = contexts !== null && typeof contexts === "object" && "trace" in contexts;

  return (
    typeof record.event_id === "string" ||
    record.type === "transaction" ||
    typeof record.transaction === "string" ||
    ("trace_id" in record && "span_id" in record) ||
    "exception" in record ||
    "spans" in record ||
    "breadcrumbs" in record ||
    "measurements" in record ||
    hasTraceContext ||
    (("severityNumber" in record || "severity_number" in record) &&
      ("attributes" in record || "body" in record || "message" in record))
  );
}

function isWithinSentryStackTrace(path: string[]) {
  const joinedPath = path.join(".");
  return joinedPath.startsWith("exception.values.*.stacktrace") || joinedPath.startsWith("threads.values.*.stacktrace");
}

function isWithinCustomDataContainer(path: string[]) {
  if (path.length === 0) {
    return false;
  }

  if (SENTRY_CUSTOM_DATA_CONTAINERS.has(path[0])) {
    return true;
  }

  return path[0] === "contexts" && path[1] !== "trace";
}

function isSentrySystemNumberField(key: string, context: RedactionVisitContext, preserveSentrySystemNumbers: boolean) {
  if (!preserveSentrySystemNumbers) {
    return false;
  }

  const path = context.path;

  if (isWithinCustomDataContainer(path)) {
    return false;
  }

  if (pathMatches(path, [key])) {
    return SENTRY_SYSTEM_NUMBER_FIELDS.has(key);
  }

  if (SENTRY_SYSTEM_NUMBER_FIELDS.has(key)) {
    return (
      pathMatches(path, ["spans", "*", key]) ||
      pathMatches(path, ["breadcrumbs", "*", key]) ||
      pathMatches(path, ["breadcrumbs", "values", "*", key]) ||
      (path[0] === "contexts" && path[1] === "trace" && SENTRY_TRACE_CONTEXT_NUMBER_FIELDS.has(key))
    );
  }

  if (pathMatches(path, ["measurements", "*", "value"])) {
    return true;
  }

  return path[0] === "contexts" && path[1] === "trace" && SENTRY_TRACE_CONTEXT_NUMBER_FIELDS.has(key);
}

function isAllowedSentryUserField(path: string[]) {
  return pathMatches(path, ["user", "id"]) || pathMatches(path, ["user", "username"]);
}

function isSafeAllowedSentryUserValue(value: unknown, key: string) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= MAX_ALLOWED_SENTRY_USER_FIELD_LENGTH &&
    redactStringValue(value, key) === value
  );
}

function tryParseJsonObject(value: string): unknown | undefined {
  try {
    const parsed = JSON.parse(value);
    if (parsed !== null && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function sanitizeSerializedJsonString(value: string, key: string, context: RedactionState): string | null {
  const leadingWhitespaceLength = value.length - value.trimStart().length;
  const trailingWhitespaceLength = value.length - value.trimEnd().length;
  const leadingWhitespace = value.slice(0, leadingWhitespaceLength);
  const trailingWhitespace = trailingWhitespaceLength > 0 ? value.slice(-trailingWhitespaceLength) : "";
  const trimmed = value.trim();

  if (!/^(?:\{[\s\S]*\}|\[[\s\S]*\])$/.test(trimmed)) {
    return null;
  }

  const rawParsed = tryParseJsonObject(trimmed);
  if (rawParsed !== undefined) {
    const sanitized = sanitizeValue("", rawParsed, {
      depth: context.depth + 1,
      parentKey: key,
      path: [...context.path, key],
      preserveSentrySystemNumbers: context.preserveSentrySystemNumbers,
      seen: new WeakSet<object>(),
    });
    return `${leadingWhitespace}${JSON.stringify(sanitized)}${trailingWhitespace}`;
  }

  if (!trimmed.includes('\\"')) {
    return null;
  }

  const unescaped = trimmed.replace(/\\"/g, '"');
  const escapedParsed = tryParseJsonObject(unescaped);
  if (escapedParsed === undefined) {
    return null;
  }

  const sanitized = sanitizeValue("", escapedParsed, {
    depth: context.depth + 1,
    parentKey: key,
    path: [...context.path, key],
    preserveSentrySystemNumbers: context.preserveSentrySystemNumbers,
    seen: new WeakSet<object>(),
  });
  return `${leadingWhitespace}${JSON.stringify(sanitized).replace(/"/g, '\\"')}${trailingWhitespace}`;
}

function sanitizeString(value: string, key: string, context: RedactionState) {
  const serializedJson = sanitizeSerializedJsonString(value, key, context);
  return redactStringValue(serializedJson ?? value, key);
}

function sanitizeValue(key: string, value: unknown, context: RedactionState): unknown {
  const currentVisit = visitContext(key, context);
  if (isAllowedSentryUserField(currentVisit.path) && isSafeAllowedSentryUserValue(value, key)) {
    return value;
  }

  const isSensitive =
    isSensitiveRedactionField(key, currentVisit.path) ||
    (isQueryContainerKey(context.parentKey) && isSensitiveQueryKeyName(key));

  if (isSensitive) {
    return FILTERED_VALUE;
  }

  if (typeof value === "string") {
    return sanitizeString(value, key, context);
  }

  if (
    (typeof value === "number" || typeof value === "bigint") &&
    !isSentrySystemNumberField(key, currentVisit, context.preserveSentrySystemNumbers) &&
    isPhoneLikeNumberValue(value)
  ) {
    return FILTERED_VALUE;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (context.seen.has(value)) {
    return FILTERED_VALUE;
  }

  if (context.depth >= MAX_DEPTH && !isWithinSentryStackTrace(currentVisit.path)) {
    return FILTERED_VALUE;
  }

  context.seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) =>
      sanitizeValue("", item, {
        depth: context.depth + 1,
        parentKey: key,
        path: [...currentVisit.path, "*"],
        preserveSentrySystemNumbers: context.preserveSentrySystemNumbers,
        seen: context.seen,
      }),
    );
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeValue(entryKey, entryValue, {
        depth: context.depth + 1,
        parentKey: key,
        path: currentVisit.path,
        preserveSentrySystemNumbers: context.preserveSentrySystemNumbers,
        seen: context.seen,
      }),
    ]),
  );
}

function sanitizePayload<T>(value: T, preserveSentrySystemNumbers: boolean): T {
  return sanitizeValue("", value, {
    depth: 0,
    parentKey: "",
    path: [],
    preserveSentrySystemNumbers,
    seen: new WeakSet<object>(),
  }) as T;
}

export function sanitizeSentryPayload<T>(value: T): T {
  return sanitizePayload(value, looksLikeSentryPayload(value));
}

export function beforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  // TEMP DISABLED in v4.2.38
  // if (shouldDropEvent(event)) {
  //   return null;
  // }
  return sanitizePayload(event, true);
}

export function beforeSendTransaction(event: TransactionEvent, _hint: EventHint): TransactionEvent | null {
  return sanitizePayload(event, true);
}

export function beforeSendSpan(span: SpanJSON): SpanJSON {
  return sanitizePayload(span, true);
}

export function beforeBreadcrumb(breadcrumb: Breadcrumb, _hint?: BreadcrumbHint): Breadcrumb | null {
  return sanitizePayload(breadcrumb, true);
}
