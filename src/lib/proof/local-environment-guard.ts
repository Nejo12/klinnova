/**
 * Structural safety checks for local Slice proof orchestration.
 * Never logs secret values — only host/port/path shape.
 */

export type EnvLike = Record<string, string | undefined>;

export type LocalProofGuardResult = { ok: true } | { ok: false; error: string };

const LOCAL_API_HOSTS = new Set(["127.0.0.1", "localhost"]);
const LOCAL_API_PORT = 54321;
const LOCAL_DB_PORT = 54322;

const REMOTE_DB_URL_KEYS = [
  "SUPABASE_DB_URL",
  "DATABASE_URL",
  "STINT_DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
] as const;

/** Consecutive argv token sequences that imply hosted/linked mutation. */
const FORBIDDEN_MUTATION_SEQUENCES = [
  ["supabase", "link"],
  ["db", "push"],
  ["migration", "up"],
  ["db", "remote"],
  ["functions", "deploy"],
  ["secrets", "set"],
] as const;

const FORBIDDEN_MUTATION_FLAGS = new Set([
  "--linked",
  "--project-ref",
  "--db-url",
  "--database-url",
  "--connection-string",
]);

function normalizeArgvTokens(argv: readonly string[]): string[] {
  return argv.map((arg) => arg.toLowerCase());
}

function hasTokenSequence(
  tokens: readonly string[],
  sequence: readonly string[],
): boolean {
  if (sequence.length === 0 || tokens.length < sequence.length) {
    return false;
  }
  for (let index = 0; index <= tokens.length - sequence.length; index += 1) {
    let matched = true;
    for (let offset = 0; offset < sequence.length; offset += 1) {
      if (tokens[index + offset] !== sequence[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return true;
    }
  }
  return false;
}

const PRODUCTION_HOSTS = new Set(["stint.company", "www.stint.company"]);

function hostnameLooksLocal(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost")
  );
}

/** Parse a URL without logging credentials. */
export function inspectUrlShape(
  raw: string,
):
  | { ok: true; protocol: string; hostname: string; port: string }
  | { ok: false; error: string } {
  try {
    const parsed = new URL(raw);
    return {
      ok: true,
      protocol: parsed.protocol,
      hostname: parsed.hostname.toLowerCase(),
      port: parsed.port,
    };
  } catch {
    return { ok: false, error: "Value is not a parseable URL." };
  }
}

function effectivePort(protocol: string, port: string): number | null {
  if (port.length > 0) {
    const numeric = Number(port);
    return Number.isInteger(numeric) ? numeric : null;
  }
  if (protocol === "http:") {
    return 80;
  }
  if (protocol === "https:") {
    return 443;
  }
  if (protocol === "postgresql:" || protocol === "postgres:") {
    return 5432;
  }
  return null;
}

function rejectRemoteLookingHost(
  hostname: string,
  label: string,
): string | null {
  if (hostname.endsWith(".supabase.co") || hostname.includes("supabase.co")) {
    return `${label} points at a hosted Supabase hostname. Local proof refuses remote databases.`;
  }
  if (PRODUCTION_HOSTS.has(hostname)) {
    return `${label} points at Production application hostname. Local proof refuses Production mutation targets.`;
  }
  if (!hostnameLooksLocal(hostname)) {
    return `${label} hostname is not the local Supabase host (127.0.0.1 / localhost).`;
  }
  return null;
}

/**
 * Validate browser-facing Supabase URL is the established local API.
 * A variable name containing "local" is never treated as proof of safety.
 */
export function assertLocalSupabaseApiUrl(
  raw: string | undefined,
  label = "NEXT_PUBLIC_SUPABASE_URL",
): LocalProofGuardResult {
  if (raw === undefined || raw.trim().length === 0) {
    return {
      ok: false,
      error: `${label} is required for local proof and must be http://127.0.0.1:54321 (or localhost).`,
    };
  }

  const shape = inspectUrlShape(raw.trim());
  if (!shape.ok) {
    return { ok: false, error: `${label}: ${shape.error}` };
  }

  const hostError = rejectRemoteLookingHost(shape.hostname, label);
  if (hostError !== null) {
    return { ok: false, error: hostError };
  }

  if (shape.protocol !== "http:") {
    return {
      ok: false,
      error: `${label} must use http:// for the local Supabase API.`,
    };
  }

  if (!LOCAL_API_HOSTS.has(shape.hostname)) {
    return {
      ok: false,
      error: `${label} must resolve to 127.0.0.1 or localhost.`,
    };
  }

  const port = effectivePort(shape.protocol, shape.port);
  if (port !== LOCAL_API_PORT) {
    return {
      ok: false,
      error: `${label} must use local API port ${LOCAL_API_PORT}.`,
    };
  }

  return { ok: true };
}

/**
 * If a database URL is supplied, it must be the local Postgres port.
 * Absence is allowed (proof uses CLI-managed local services).
 */
export function assertOptionalLocalDatabaseUrl(
  raw: string | undefined,
  label: string,
): LocalProofGuardResult {
  if (raw === undefined || raw.trim().length === 0) {
    return { ok: true };
  }

  const shape = inspectUrlShape(raw.trim());
  if (!shape.ok) {
    return { ok: false, error: `${label}: ${shape.error}` };
  }

  if (shape.protocol !== "postgresql:" && shape.protocol !== "postgres:") {
    return {
      ok: false,
      error: `${label} must be a postgres/postgresql URL when set.`,
    };
  }

  const hostError = rejectRemoteLookingHost(shape.hostname, label);
  if (hostError !== null) {
    return { ok: false, error: hostError };
  }

  const port = effectivePort(shape.protocol, shape.port);
  if (port !== LOCAL_DB_PORT) {
    return {
      ok: false,
      error: `${label} must use local database port ${LOCAL_DB_PORT} when set for proof.`,
    };
  }

  return { ok: true };
}

/** Refuse argv that would drive hosted/linked mutation from a proof script. */
export function assertNoHostedMutationIntent(
  argv: readonly string[],
): LocalProofGuardResult {
  const tokens = normalizeArgvTokens(argv);

  for (const token of tokens) {
    if (
      FORBIDDEN_MUTATION_FLAGS.has(token) ||
      token.startsWith("--project-ref=")
    ) {
      return {
        ok: false,
        error: `Refusing proof execution that includes hosted mutation intent (${token}).`,
      };
    }
    if (/^(?:postgresql|postgres):\/\//i.test(token)) {
      return {
        ok: false,
        error:
          "Refusing proof execution that includes a database URL argument.",
      };
    }
  }

  for (const sequence of FORBIDDEN_MUTATION_SEQUENCES) {
    if (hasTokenSequence(tokens, sequence)) {
      return {
        ok: false,
        error: `Refusing proof execution that includes hosted mutation intent (${sequence.join(" ")}).`,
      };
    }
  }

  return { ok: true };
}

/**
 * Service-role material must never be scheduled for browser/public env.
 * Detects structural misuse without printing values.
 */
export function assertNoServiceRoleExposure(
  env: EnvLike,
): LocalProofGuardResult {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || value.length === 0) {
      continue;
    }
    const upper = key.toUpperCase();
    const looksServiceRole =
      upper.includes("SERVICE_ROLE") ||
      upper.includes("SUPABASE_SECRET") ||
      value.startsWith("sb_secret_");

    if (looksServiceRole && upper.startsWith("NEXT_PUBLIC_")) {
      return {
        ok: false,
        error: `${key} exposes a privileged secret shape to the browser. Local proof refuses this environment.`,
      };
    }
  }
  return { ok: true };
}

/**
 * Full local proof environment gate used by `pnpm proof:slice4`.
 */
export function assertLocalProofEnvironment(
  env: EnvLike,
  argv: readonly string[] = [],
): LocalProofGuardResult {
  const mutation = assertNoHostedMutationIntent(argv);
  if (!mutation.ok) {
    return mutation;
  }

  const serviceRole = assertNoServiceRoleExposure(env);
  if (!serviceRole.ok) {
    return serviceRole;
  }

  const api = assertLocalSupabaseApiUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  if (!api.ok) {
    return api;
  }

  for (const key of REMOTE_DB_URL_KEYS) {
    const db = assertOptionalLocalDatabaseUrl(env[key], key);
    if (!db.ok) {
      return db;
    }
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl !== undefined && siteUrl.trim().length > 0) {
    const shape = inspectUrlShape(siteUrl.trim());
    if (!shape.ok) {
      return { ok: false, error: `NEXT_PUBLIC_SITE_URL: ${shape.error}` };
    }
    if (PRODUCTION_HOSTS.has(shape.hostname)) {
      return {
        ok: false,
        error:
          "NEXT_PUBLIC_SITE_URL points at Production. Local proof refuses Production mutation targets.",
      };
    }
    if (
      shape.hostname.endsWith(".supabase.co") ||
      shape.hostname.includes("supabase.co")
    ) {
      return {
        ok: false,
        error:
          "NEXT_PUBLIC_SITE_URL points at a hosted Supabase hostname. Local proof refuses remote targets.",
      };
    }
  }

  // A filename containing "local" never proves safety — only structural URL checks above do.
  return { ok: true };
}
