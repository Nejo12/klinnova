import type * as Sentry from "@sentry/nextjs";

const SENSITIVE_HEADER_NAMES = new Set([
  "cookie",
  "set-cookie",
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token",
]);

const SENSITIVE_EXTRA_KEY_PATTERN =
  /pass(word)?|token|secret|api[-_]?key|auth|cookie|session/i;

/** Redacts DB connection strings and Supabase service-role-shaped secrets embedded in free text. */
const CONNECTION_STRING_PATTERN = /postgres(?:ql)?:\/\/[^\s"'()]+/gi;
const SB_SECRET_TOKEN_PATTERN = /\bsb_secret_[A-Za-z0-9_-]+/gi;

function redactSensitiveText(value: string): string {
  return value
    .replace(CONNECTION_STRING_PATTERN, "[redacted-connection-string]")
    .replace(SB_SECRET_TOKEN_PATTERN, "[redacted-secret]");
}

function stripQueryString(url: string): string {
  const index = url.indexOf("?");
  return index === -1 ? url : url.slice(0, index);
}

function sanitizeHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (headers === undefined) {
    return undefined;
  }
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_NAMES.has(key.toLowerCase())) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

/**
 * Keeps only safe primitive values (after redaction), by key allow-list.
 * Nested objects/arrays/functions are dropped entirely rather than passed
 * through unchanged — this beta error-monitoring scope has no case that
 * needs structured extra context badly enough to justify the risk of an
 * unbounded nested value carrying PII/secrets through untouched.
 */
function sanitizeExtra(
  extra: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (extra === undefined) {
    return undefined;
  }
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extra)) {
    if (SENSITIVE_EXTRA_KEY_PATTERN.test(key)) {
      continue;
    }
    if (typeof value === "string") {
      sanitized[key] = redactSensitiveText(value);
    } else if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      sanitized[key] = value;
    }
    // Objects, arrays, functions, and undefined are dropped entirely.
  }
  return sanitized;
}

/**
 * `beforeSend` scrubber (M5.1 Unit G). Strips fields this application must
 * never send to Sentry regardless of SDK-level `sendDefaultPii`/
 * `dataCollection` defaults: user identity, cookies/auth headers, request
 * bodies/form payloads, query strings, and any secret- or DB-connection-
 * shaped text found in exception messages or extra context. Pure and
 * side-effect-free so it can be unit tested directly, independent of a
 * real Sentry.init() call.
 */
export function scrubSentryEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const scrubbed: Sentry.ErrorEvent = { ...event };

  // Never send user identity (email, id, ip_address, username, ...).
  delete scrubbed.user;

  if (scrubbed.request !== undefined) {
    const request = { ...scrubbed.request };
    delete request.data;
    delete request.cookies;
    request.headers = sanitizeHeaders(request.headers);
    request.query_string = undefined;
    if (typeof request.url === "string") {
      request.url = stripQueryString(request.url);
    }
    scrubbed.request = request;
  }

  if (scrubbed.extra !== undefined) {
    scrubbed.extra = sanitizeExtra(scrubbed.extra);
  }

  if (scrubbed.exception?.values !== undefined) {
    scrubbed.exception = {
      ...scrubbed.exception,
      values: scrubbed.exception.values.map((value) =>
        typeof value.value === "string"
          ? { ...value, value: redactSensitiveText(value.value) }
          : value,
      ),
    };
  }

  if (typeof scrubbed.message === "string") {
    scrubbed.message = redactSensitiveText(scrubbed.message);
  }

  if (scrubbed.breadcrumbs !== undefined) {
    scrubbed.breadcrumbs = scrubbed.breadcrumbs
      .map((breadcrumb) => scrubBreadcrumb(breadcrumb))
      .filter(
        (breadcrumb): breadcrumb is Sentry.Breadcrumb => breadcrumb !== null,
      );
  }

  return scrubbed;
}

const ALLOWED_BREADCRUMB_CATEGORIES = new Set([
  "navigation",
  "console",
  "fetch",
  "xhr",
  "ui.click",
]);

function sanitizedUrlField(value: unknown): string | undefined {
  return typeof value === "string" ? stripQueryString(value) : undefined;
}

/**
 * Per-category allow-list for breadcrumb `data` (M5.1 Unit G) — an
 * unrecognized field is dropped by construction, not merely a known-bad
 * one removed. `navigation` keeps only sanitized `from`/`to` (Sentry's own
 * router instrumentation puts the full URL, including query string, in
 * these two fields — not `data.url`). `fetch`/`xhr` keep only
 * `method`/`status_code`/a sanitized `url`. `console` and `ui.click` keep
 * no `data` object at all — this app has no concrete need for either yet
 * that would justify the risk.
 */
function sanitizeBreadcrumbData(
  category: string,
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (category === "navigation") {
    const sanitized: Record<string, unknown> = {};
    const from = sanitizedUrlField(data?.from);
    const to = sanitizedUrlField(data?.to);
    if (from !== undefined) {
      sanitized.from = from;
    }
    if (to !== undefined) {
      sanitized.to = to;
    }
    return sanitized;
  }

  if (category === "fetch" || category === "xhr") {
    const sanitized: Record<string, unknown> = {};
    if (typeof data?.method === "string") {
      sanitized.method = data.method;
    }
    if (typeof data?.status_code === "number") {
      sanitized.status_code = data.status_code;
    }
    const url = sanitizedUrlField(data?.url);
    if (url !== undefined) {
      sanitized.url = url;
    }
    return sanitized;
  }

  return undefined;
}

/**
 * `beforeBreadcrumb` policy (M5.1 Unit G): retains only a conservative
 * allow-list of low-risk breadcrumb categories, and rebuilds each
 * breadcrumb from an explicit field allow-list rather than deleting known-
 * bad fields from the original — `data` is never passed through unchanged.
 * `message` (e.g. a `console` breadcrumb's logged text) goes through the
 * same sensitive-text redaction as exception/event messages.
 */
export function scrubBreadcrumb(
  breadcrumb: Sentry.Breadcrumb,
): Sentry.Breadcrumb | null {
  const category = breadcrumb.category;
  if (category === undefined || !ALLOWED_BREADCRUMB_CATEGORIES.has(category)) {
    return null;
  }

  const sanitized: Sentry.Breadcrumb = { category };
  if (breadcrumb.level !== undefined) {
    sanitized.level = breadcrumb.level;
  }
  if (breadcrumb.timestamp !== undefined) {
    sanitized.timestamp = breadcrumb.timestamp;
  }
  if (breadcrumb.type !== undefined) {
    sanitized.type = breadcrumb.type;
  }
  if (typeof breadcrumb.message === "string") {
    sanitized.message = redactSensitiveText(breadcrumb.message);
  }

  const data = sanitizeBreadcrumbData(category, breadcrumb.data);
  if (data !== undefined && Object.keys(data).length > 0) {
    sanitized.data = data;
  }

  return sanitized;
}
