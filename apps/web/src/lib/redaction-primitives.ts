export const FILTERED_VALUE = "[Filtered]";

const MAX_STRING_LENGTH = 2000;
const MAX_DECODE_PASSES = 2;

const SENSITIVE_FIELD_PATTERN =
  /authorization|cookie|token|jwt|secret|password|phone|email|mobile|access[_-]?key|api[_-]?key|session|private|signature|credential|security[_-]?token|signed[_-]?(?:headers|url)|ossaccesskeyid/i;
const SENSITIVE_QUERY_PARAM_PATTERN =
  /([?&](?:auth|auth[_-]?header|authorization|authorization[_-]?header|cookie|token|jwt|secret|password|phone|email|mobile|access[_-]?key|api[_-]?key|key|session|private|code|state|nonce|signature|credential|security[_-]?token|signed[_-]?(?:headers|url)|signedheaders|expires|ossaccesskeyid|policy|redirect[_-]?uri|redirecturi|callback[_-]?url|callbackurl|return[_-]?url|returnurl|url|ip|ipaddress|ip[_-]?address|ipaddr|client[_-]?(?:ip|ipaddress|ip[_-]?address)|remote[_-]?(?:addr|address|ip)|x[_-]?forwarded[_-]?for|forwarded|x[_-]?real[_-]?ip|vcode|otp|verification[_-]?code|verify[_-]?code|buvid|account|user[_-]?id|uid|buid|open[_-]?id|union[_-]?id|username|uname|nickname|to|payee[^=&#?]*|x-amz-[^=&#?]+|x-oss-[^=&#?]+)=)[^&#\s]*/gi;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const CHINA_PHONE_PATTERN = /\b1[3-9]\d{9}\b/g;
const PHONE_LIKE_PATTERN = /\b\+?\d[\d\s().-]{8,}\d\b/g;
const QUOTED_OR_ESCAPED_QUOTE = String.raw`(?:\\?["'])?`;
const AUTH_SCHEME_SEPARATOR = String.raw`(?:\s+|(?:%20|\+)+)`;
const AUTH_CREDENTIAL = "(?:[A-Za-z0-9._~+/=%-]|%[0-9A-Fa-f]{2})+";
const FREE_TEXT_AUTHORIZATION_PATTERN = new RegExp(
  String.raw`\b(\\?["']?(?:auth|auth[_\s-]?header|authorization|authorization[_\s-]?header)\\?["']?\s*[:=]\s*${QUOTED_OR_ESCAPED_QUOTE}(?:bearer|basic)${AUTH_SCHEME_SEPARATOR})(${AUTH_CREDENTIAL})`,
  "gi",
);
const BARE_AUTH_CREDENTIAL_PATTERN = new RegExp(
  String.raw`\b((?:bearer|basic)${AUTH_SCHEME_SEPARATOR})(?!(?:bearer|basic)\b)(${AUTH_CREDENTIAL})`,
  "gi",
);
const FREE_TEXT_COOKIE_PATTERN = new RegExp(
  String.raw`\b(\\?["']?(?:cookie|set-cookie)\\?["']?\s*[:=]\s*${QUOTED_OR_ESCAPED_QUOTE})(?!\[Filtered\])([^\\"'\n\r}]+)`,
  "gi",
);
const FREE_TEXT_AUTH_KEY_VALUE_PATTERN = new RegExp(
  String.raw`\b(\\?["']?(?:auth|auth[_\s-]?header|authorization|authorization[_\s-]?header)\\?["']?\s*[:=]\s*)(${QUOTED_OR_ESCAPED_QUOTE})(?!(?:bearer|basic)\b|\[Filtered\])([^\\"'\s,;&#}\]]+)\2`,
  "gi",
);
const FREE_TEXT_URL_LABEL_KEY_VALUE_PATTERN = new RegExp(
  String.raw`\b(\\?["']?(?:redirect[_\s-]?uri|redirecturi|callback[_\s-]?url|callbackurl|return[_\s-]?url|returnurl|url)\\?["']?\s*[:=]\s*)(${QUOTED_OR_ESCAPED_QUOTE})(?!\[Filtered\])([^\\"'\s,;&#}\]]+)\2`,
  "gi",
);
const FREE_TEXT_IP_KEY_VALUE_PATTERN = new RegExp(
  String.raw`\b(\\?["']?(?:ip|ip\s+address|ip[_-]?address|ipaddr|remote[_\s-]?(?:addr|address|ip)|client[_\s-]?(?:ip|ip\s+address|ipaddress)|x[_\s-]?forwarded[_\s-]?for|forwarded|x[_\s-]?real[_\s-]?ip)\\?["']?\s*[:=]\s*)(${QUOTED_OR_ESCAPED_QUOTE})(?!\[Filtered\])([^\\"'\n\r}\]]+)\2`,
  "gi",
);
const FREE_TEXT_SECRET_KEY_VALUE_PATTERN = new RegExp(
  String.raw`\b(\\?["']?(?:[A-Za-z0-9_-]*(?:token|secret|credential|jwt)[A-Za-z0-9_-]*|jwt|[A-Za-z0-9_-]*(?:api|access)[_-]?key(?:[_-]?id)?|x[_-]?api[_-]?key|api[_-]?key|api\s+key|x\s+api\s+key|access\s+(?:key|token)|refresh\s+token|id\s+token|client\s+secret|password|code|verification[_-]?code|verify[_-]?code|otp|vcode|state|nonce|ossaccesskeyid|signature|x-amz-signature|session(?:[_-]?(?:id|key|token))?)\\?["']?\s*[:=]\s*)(${QUOTED_OR_ESCAPED_QUOTE})(?!\[Filtered\])([^\\"'\s,;&#}\]]+)\2`,
  "gi",
);
const FREE_TEXT_IDENTIFIER_KEY_VALUE_PATTERN = new RegExp(
  String.raw`\b(\\?["']?(?:account|uid|user[_-]?id|buid|buvid|open[_-]?id|union[_-]?id|uname|username|nickname|to|payee[A-Za-z0-9_-]*)\\?["']?\s*[:=]\s*)(${QUOTED_OR_ESCAPED_QUOTE})(?!\[Filtered\])([^\\"'\s,;&#}\]]+)\2`,
  "gi",
);
const JWT_LIKE_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;

const SENSITIVE_NORMALIZED_FIELD_KEYS = new Set([
  "account",
  "auth",
  "authheader",
  "authorization",
  "authorizationheader",
  "buid",
  "buvid",
  "callbackurl",
  "clientip",
  "clientipaddress",
  "code",
  "cookie",
  "email",
  "forwarded",
  "ip",
  "ipaddr",
  "ipaddress",
  "jwt",
  "mobile",
  "nickname",
  "nonce",
  "openid",
  "otp",
  "phone",
  "remoteaddr",
  "remoteaddress",
  "remoteip",
  "redirecturi",
  "returnurl",
  "state",
  "to",
  "uid",
  "uname",
  "unionid",
  "userid",
  "username",
  "vcode",
  "verificationcode",
  "verifycode",
  "xforwardedfor",
  "xrealip",
]);
const SENSITIVE_QUERY_NORMALIZED_KEYS = new Set([
  ...SENSITIVE_NORMALIZED_FIELD_KEYS,
  "accesskey",
  "accesskeyid",
  "apikey",
  "awsaccesskeyid",
  "credential",
  "expires",
  "key",
  "ossaccesskeyid",
  "password",
  "policy",
  "private",
  "securitytoken",
  "session",
  "signature",
  "signedheaders",
  "signedurl",
  "url",
]);
const SENSITIVE_IP_NORMALIZED_FIELD_KEYS = new Set([
  "clientip",
  "clientipaddress",
  "forwarded",
  "ip",
  "ipaddr",
  "ipaddress",
  "remoteaddr",
  "remoteaddress",
  "remoteip",
  "xforwardedfor",
  "xrealip",
]);
const SENSITIVE_USER_FIELD_KEYS = new Set([
  "account",
  "buid",
  "email",
  "emailaddress",
  "id",
  "mobile",
  "mobilenumber",
  "name",
  "nickname",
  "openid",
  "phone",
  "phonenumber",
  "uid",
  "uname",
  "unionid",
  "userid",
  "username",
]);
const URL_FIELD_KEYS = new Set([
  "callbackurl",
  "endpoint",
  "href",
  "path",
  "pathname",
  "redirecturi",
  "redirecturl",
  "requestpath",
  "requesturl",
  "returnurl",
  "route",
  "uri",
  "url",
]);
const SENSITIVE_IP_FIELD_TOKEN_SEQUENCES = [
  ["ip"],
  ["ip", "address"],
  ["ipaddr"],
  ["remote", "addr"],
  ["remote", "address"],
  ["remote", "ip"],
  ["client", "ip"],
  ["client", "ip", "address"],
  ["x", "forwarded", "for"],
  ["x", "real", "ip"],
];

const URL_LIKE_TOKEN_PATTERN =
  /[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]*[?#][^\s"'<>]*|[a-z][a-z0-9+.-]*:[^\s"'<>]*[?#][^\s"'<>]*|\/[^\s"'<>]*[?#][^\s"'<>]*|[A-Za-z0-9._~!$&'()*+,;=:@%-]+\/[^\s"'<>]*[?#][^\s"'<>]*/gi;
const QUERY_ASSIGNMENT_PATTERN =
  /(^|[?&\s"'[{(,;]|%(?:25)*(?:3[fF]|26))([A-Za-z0-9_.~%+-]{1,120})((?:=|%(?:25)*3[dD]))((?:(?!%(?:25)*(?:3[fF]|26|23))[^\s"'<>}\\&#!?])*)/gi;
const CANONICAL_QUERY_SIGNAL_PATTERN =
  /[?&][^=\s"'<>]{1,120}=|%(?:25)*(?:3[fFdD]|26)|\b[A-Za-z0-9_.~-]*%[0-9A-Fa-f]{2}[A-Za-z0-9_.~%-]*(?:=|%(?:25)*3[dD])/i;

export function normalizeFieldKey(key: string) {
  return key.replace(/[\s._-]/g, "").toLowerCase();
}

function splitFieldKeyTokens(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[\s._-]+/)
    .filter(Boolean);
}

function hasTokenSequence(tokens: string[], sequence: string[]) {
  if (sequence.length > tokens.length) {
    return false;
  }

  return tokens.some((_, index) => sequence.every((part, offset) => tokens[index + offset] === part));
}

function isSensitiveIpFieldKey(key: string, normalizedKey: string) {
  if (SENSITIVE_IP_NORMALIZED_FIELD_KEYS.has(normalizedKey)) {
    return true;
  }

  const tokens = splitFieldKeyTokens(key);
  return (
    SENSITIVE_IP_FIELD_TOKEN_SEQUENCES.some((sequence) => hasTokenSequence(tokens, sequence)) ||
    tokens.some(
      (token, index) =>
        token === "forwarded" &&
        tokens
          .slice(0, index)
          .some((ancestor) => ancestor === "header" || ancestor === "headers" || ancestor === "request"),
    )
  );
}

function isSensitiveNormalizedFieldKey(key: string) {
  return (
    SENSITIVE_NORMALIZED_FIELD_KEYS.has(key) || key.includes("email") || key.includes("mobile") || key.includes("phone")
  );
}

function hasUserAncestor(path: string[]) {
  return path.slice(0, -1).some((segment) => normalizeFieldKey(segment) === "user");
}

function isSensitiveUserFieldValue(normalizedKey: string) {
  return (
    SENSITIVE_USER_FIELD_KEYS.has(normalizedKey) ||
    normalizedKey.includes("email") ||
    normalizedKey.includes("mobile") ||
    normalizedKey.includes("phone")
  );
}

function isDelimitedUserField(key: string) {
  const parts = key
    .toLowerCase()
    .split(/[\s._-]+/)
    .filter(Boolean);
  const userIndex = parts.lastIndexOf("user");
  if (userIndex === -1 || userIndex === parts.length - 1) {
    return false;
  }
  return isSensitiveUserFieldValue(normalizeFieldKey(parts.slice(userIndex + 1).join("")));
}

function isDottedSensitiveField(key: string) {
  const parts = key.split(".").filter(Boolean);
  if (parts.length < 2) {
    return false;
  }

  return isSensitiveNormalizedFieldKey(normalizeFieldKey(parts[parts.length - 1] ?? ""));
}

function isSensitiveUserField(key: string, path: string[]) {
  const normalizedKey = normalizeFieldKey(key);
  return (hasUserAncestor(path) && isSensitiveUserFieldValue(normalizedKey)) || isDelimitedUserField(key);
}

export function isSensitiveRedactionField(key: string, path: string[]) {
  if (!key) {
    return false;
  }

  const normalizedKey = normalizeFieldKey(key);

  return (
    SENSITIVE_FIELD_PATTERN.test(key) ||
    isSensitiveNormalizedFieldKey(normalizedKey) ||
    isSensitiveIpFieldKey(key, normalizedKey) ||
    isSensitiveUserField(key, path) ||
    isDottedSensitiveField(key) ||
    normalizedKey.startsWith("payee") ||
    /^user(?:email|name|username)$/i.test(normalizedKey)
  );
}

export function isQueryContainerKey(key: string) {
  return key === "query" || key === "query_string" || key === "search" || key === "searchParams";
}

export function isSensitiveQueryKeyName(key: string) {
  const decodedKey = decodeQueryComponentBounded(key);
  const normalizedKey = normalizeFieldKey(decodedKey);
  return (
    SENSITIVE_QUERY_NORMALIZED_KEYS.has(normalizedKey) ||
    isSensitiveNormalizedFieldKey(normalizedKey) ||
    isSensitiveIpFieldKey(decodedKey, normalizedKey) ||
    normalizedKey.startsWith("payee") ||
    normalizedKey.startsWith("xamz") ||
    normalizedKey.startsWith("xoss")
  );
}

export function isUrlLikeFieldName(key: string) {
  const normalizedKey = normalizeFieldKey(key);
  return (
    URL_FIELD_KEYS.has(normalizedKey) ||
    normalizedKey.endsWith("url") ||
    normalizedKey.endsWith("uri") ||
    normalizedKey.endsWith("path")
  );
}

function decodePercentRun(value: string) {
  return value.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
    try {
      return decodeURIComponent(match);
    } catch {
      return match.replace(/%([0-9A-Fa-f]{2})/g, (_sequence, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      );
    }
  });
}

function decodePercentBounded(value: string, passes = MAX_DECODE_PASSES) {
  let current = value;
  for (let pass = 0; pass < passes; pass += 1) {
    if (!/%[0-9A-Fa-f]{2}/.test(current)) {
      break;
    }

    const next = decodePercentRun(current);
    if (next === current) {
      break;
    }
    current = next;
  }
  return current;
}

function decodeQueryComponentBounded(value: string) {
  return decodePercentBounded(value.replace(/\+/g, " "));
}

function shouldCanonicalizeQueryText(value: string) {
  return CANONICAL_QUERY_SIGNAL_PATTERN.test(value);
}

function redactCanonicalQueryAssignments(value: string) {
  return value.replace(QUERY_ASSIGNMENT_PATTERN, (match, prefix: string, key: string, separator: string) => {
    if (!isSensitiveQueryKeyName(key)) {
      return match;
    }

    return `${prefix}${key}${separator}${FILTERED_VALUE}`;
  });
}

function redactCanonicalQueryText(value: string) {
  if (!shouldCanonicalizeQueryText(value)) {
    return value;
  }

  let current = value;
  for (let pass = 0; pass <= MAX_DECODE_PASSES; pass += 1) {
    current = redactCanonicalQueryAssignments(current);

    if (pass === MAX_DECODE_PASSES || !shouldCanonicalizeQueryText(current)) {
      break;
    }

    const decoded = decodePercentBounded(current, 1);
    if (decoded === current) {
      break;
    }
    current = decoded;
  }

  return redactCanonicalQueryAssignments(current);
}

function stripLiteralUrlQuery(value: string) {
  if (!/[?#]/.test(value)) {
    return value;
  }

  const isAbsoluteUrl = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const isRelativeOrPathLikeUrl = /^[/?]/.test(value) || /^[^\s?#]+[/?#][^\s]*$/.test(value);

  if (!isAbsoluteUrl && !isRelativeOrPathLikeUrl) {
    return value;
  }

  try {
    const url = new URL(value, "https://redaction.local");
    if (!isAbsoluteUrl) {
      const hasLeadingSlash = value.startsWith("/") || value.startsWith("?");
      return hasLeadingSlash ? url.pathname : url.pathname.replace(/^\//, "");
    }

    return `${url.protocol}${url.host ? `//${url.host}` : ""}${url.pathname}`;
  } catch {
    return value.replace(/[?#].*$/, "");
  }
}

function stripUrlQuery(value: string) {
  const canonical = redactCanonicalQueryText(value);
  const stripped = stripLiteralUrlQuery(canonical);
  if (stripped !== canonical) {
    return stripped;
  }

  if (!shouldCanonicalizeQueryText(value)) {
    return value;
  }

  return stripLiteralUrlQuery(decodePercentBounded(canonical));
}

function stripUrlTokens(value: string) {
  const canonical = redactCanonicalQueryText(value);
  return canonical.replace(URL_LIKE_TOKEN_PATTERN, (match) => stripUrlQuery(match));
}

function isPhoneLikeDigitCount(digitCount: number) {
  return digitCount >= 10 && digitCount <= 15;
}

function redactPhoneLikeStrings(value: string) {
  return value.replace(CHINA_PHONE_PATTERN, FILTERED_VALUE).replace(PHONE_LIKE_PATTERN, (match) => {
    const digitCount = match.replace(/\D/g, "").length;
    return isPhoneLikeDigitCount(digitCount) ? FILTERED_VALUE : match;
  });
}

export function isPhoneLikeNumberValue(value: number | bigint) {
  if (typeof value === "number" && (!Number.isFinite(value) || !Number.isInteger(value))) {
    return false;
  }

  const digits =
    typeof value === "bigint" ? value.toString().replace(/\D/g, "") : String(Math.abs(value)).replace(/\D/g, "");
  return isPhoneLikeDigitCount(digits.length);
}

function redactFreeTextSecrets(value: string) {
  return value
    .replace(FREE_TEXT_AUTHORIZATION_PATTERN, `$1${FILTERED_VALUE}`)
    .replace(BARE_AUTH_CREDENTIAL_PATTERN, `$1${FILTERED_VALUE}`)
    .replace(FREE_TEXT_COOKIE_PATTERN, `$1${FILTERED_VALUE}`)
    .replace(FREE_TEXT_AUTH_KEY_VALUE_PATTERN, `$1$2${FILTERED_VALUE}$2`)
    .replace(FREE_TEXT_URL_LABEL_KEY_VALUE_PATTERN, `$1$2${FILTERED_VALUE}$2`)
    .replace(FREE_TEXT_IP_KEY_VALUE_PATTERN, `$1$2${FILTERED_VALUE}$2`)
    .replace(FREE_TEXT_SECRET_KEY_VALUE_PATTERN, `$1$2${FILTERED_VALUE}$2`)
    .replace(FREE_TEXT_IDENTIFIER_KEY_VALUE_PATTERN, `$1$2${FILTERED_VALUE}$2`)
    .replace(JWT_LIKE_PATTERN, FILTERED_VALUE);
}

export function redactStringValue(value: string, key = "") {
  const freeTextRedacted = redactFreeTextSecrets(value);
  const canonicalized = redactCanonicalQueryText(freeTextRedacted);
  const withoutUrlQueries = isUrlLikeFieldName(key) ? stripUrlQuery(canonicalized) : stripUrlTokens(canonicalized);
  const redacted = redactFreeTextSecrets(withoutUrlQueries)
    .replace(SENSITIVE_QUERY_PARAM_PATTERN, `$1${FILTERED_VALUE}`)
    .replace(EMAIL_PATTERN, FILTERED_VALUE)
    .replace(CHINA_PHONE_PATTERN, FILTERED_VALUE);
  const withoutPhones = redactPhoneLikeStrings(redacted).replace(/\[Filtered\]\]+/g, FILTERED_VALUE);
  return withoutPhones.length > MAX_STRING_LENGTH ? `${withoutPhones.slice(0, MAX_STRING_LENGTH)}...` : withoutPhones;
}
