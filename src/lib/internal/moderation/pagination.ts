const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export type ModerationPage = {
  limit: number;
  offset: number;
  page: number;
};

/**
 * Parse a `page` query-string value into a safe, bounded limit/offset pair.
 * Matches the database's own clamp exactly (default 50, hard max 100,
 * offset >= 0) so the UI never asks for more than the RPC would return
 * anyway. Malformed, negative, zero, or oversized input all normalize
 * deterministically rather than erroring.
 */
export function parseModerationPage(
  pageParam: string | string[] | undefined,
): ModerationPage {
  const raw = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const parsedPage = raw === undefined ? 1 : Number.parseInt(raw, 10);
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const limit = DEFAULT_LIMIT;
  const offset = Math.min((page - 1) * limit, MAX_LIMIT * 1000);

  return { limit, offset, page };
}

export function moderationPageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}
