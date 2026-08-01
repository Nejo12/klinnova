/**
 * Resolve the public site origin for Auth email redirects.
 * Precedence: NEXT_PUBLIC_SITE_URL → Vercel deployment URL → localhost.
 * Does not trust Host / X-Forwarded-Host / Origin request headers.
 */
export function resolveSiteOrigin(input: {
  siteUrl?: string | undefined;
  vercelUrl?: string | undefined;
}): string {
  const configured = input.siteUrl?.trim();
  if (configured !== undefined && configured.length > 0) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {
      // Fall through to safer defaults.
    }
  }

  const vercelHost = input.vercelUrl?.trim();
  if (vercelHost !== undefined && vercelHost.length > 0) {
    const host = vercelHost.replace(/^https?:\/\//, "");
    if (host.length > 0 && !host.includes("/") && !host.includes("\\")) {
      return `https://${host}`;
    }
  }

  return "http://localhost:3000";
}

/**
 * Origin for same-app redirects (Proxy / confirm). Uses the request Host only
 * when it matches an allow-list, so host-only Auth cookies survive
 * 127.0.0.1 ↔ localhost differences without trusting arbitrary hosts.
 */
export function resolveRedirectOrigin(input: {
  hostHeader: string | null;
  siteUrl?: string | undefined;
  vercelUrl?: string | undefined;
}): string {
  const fallback = resolveSiteOrigin({
    siteUrl: input.siteUrl,
    vercelUrl: input.vercelUrl,
  });

  const host = input.hostHeader?.split(",")[0]?.trim().toLowerCase();
  if (host === undefined || host.length === 0) {
    return fallback;
  }

  const allowed = new Set<string>(["localhost:3000", "127.0.0.1:3000"]);
  try {
    allowed.add(new URL(fallback).host.toLowerCase());
  } catch {
    // ignore invalid fallback
  }

  if (!allowed.has(host)) {
    return fallback;
  }

  const protocol =
    host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";
  return `${protocol}://${host}`;
}
