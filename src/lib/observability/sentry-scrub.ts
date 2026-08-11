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
    sanitized[key] =
      typeof value === "string" ? redactSensitiveText(value) : value;
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

/**
 * `beforeBreadcrumb` policy (M5.1 Unit G): retains only a conservative
 * allow-list of low-risk breadcrumb categories, and for network breadcrumbs
 * (`fetch`/`xhr`) strips any body/response/header data and sanitizes the
 * URL's query string — never dropping the breadcrumb's basic shape (method,
 * status, path), which is what actually helps reproduce a failure.
 */
export function scrubBreadcrumb(
  breadcrumb: Sentry.Breadcrumb,
): Sentry.Breadcrumb | null {
  if (
    breadcrumb.category === undefined ||
    !ALLOWED_BREADCRUMB_CATEGORIES.has(breadcrumb.category)
  ) {
    return null;
  }

  const data = breadcrumb.data;
  if (data === undefined) {
    return breadcrumb;
  }

  const sanitizedData: Record<string, unknown> = { ...data };
  delete sanitizedData.body;
  delete sanitizedData.response;
  delete sanitizedData.headers;
  delete sanitizedData.request_body_size;
  delete sanitizedData.response_body_size;
  if (typeof sanitizedData.url === "string") {
    sanitizedData.url = stripQueryString(sanitizedData.url);
  }

  return { ...breadcrumb, data: sanitizedData };
}
