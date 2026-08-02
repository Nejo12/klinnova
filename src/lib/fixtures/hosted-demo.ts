import { readFileSync } from "node:fs";
import path from "node:path";

export type HostedFixtureEnvironment = "local" | "preview" | "production";

export type HostedFixtureAction = "apply" | "cleanup";

export type HostedFixtureManifest = {
  description: string;
  companyId: string;
  vacancyIds: string[];
  languageRequirementIds: string[];
  expiryDays: number;
};

export type ParsedHostedFixtureArgs = {
  action: HostedFixtureAction;
  environment: HostedFixtureEnvironment;
  projectRef: string;
  confirmProduction: string | null;
  dryRun: boolean;
};

/** In-process / child execution contract — credentials never appear in argv. */
export type HostedFixtureExecutionBoundary = {
  shell: false;
  argv: string[];
  env: { SUPABASE_DB_URL: string };
};

export type HostedFixtureRun =
  | {
      ok: true;
      args: ParsedHostedFixtureArgs;
      /** Null for dry-run (no connection). Never log this value. */
      databaseUrl: string | null;
      execution: HostedFixtureExecutionBoundary | null;
    }
  | { ok: false; error: string };

export type HostedFixtureValidationResult =
  { ok: true; args: ParsedHostedFixtureArgs } | { ok: false; error: string };

export const PRODUCTION_CONFIRMATION = "I_UNDERSTAND_HOSTED_DEMO";
export const SUPABASE_DB_URL_ENV = "SUPABASE_DB_URL";

const ENVIRONMENTS = ["local", "preview", "production"] as const;
const ACTIONS = ["apply", "cleanup"] as const;

const FORBIDDEN_CREDENTIAL_FLAGS = [
  "--database-url",
  "--db-url",
  "--connection-string",
  "--connection-url",
  "--postgres-url",
  "--pg-url",
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const URL_LIKE_RE = /^(?:postgresql|postgres):\/\//i;

export function defaultFixturesRoot(cwd = process.cwd()): string {
  return path.join(cwd, "supabase", "fixtures", "hosted");
}

export function loadHostedFixtureManifest(
  fixturesRoot = defaultFixturesRoot(),
): HostedFixtureManifest {
  const raw = readFileSync(path.join(fixturesRoot, "manifest.json"), "utf8");
  const parsed = JSON.parse(raw) as HostedFixtureManifest;
  assertManifest(parsed);
  return parsed;
}

function assertManifest(manifest: HostedFixtureManifest): void {
  if (!UUID_RE.test(manifest.companyId)) {
    throw new Error("Invalid companyId in hosted fixture manifest");
  }
  for (const id of manifest.vacancyIds) {
    if (!UUID_RE.test(id)) {
      throw new Error(`Invalid vacancy id in hosted fixture manifest: ${id}`);
    }
  }
  for (const id of manifest.languageRequirementIds) {
    if (!UUID_RE.test(id)) {
      throw new Error(
        `Invalid language requirement id in hosted fixture manifest: ${id}`,
      );
    }
  }
  if (!Number.isInteger(manifest.expiryDays) || manifest.expiryDays <= 0) {
    throw new Error("expiryDays must be a positive integer");
  }
}

export function readHostedFixtureSql(
  action: HostedFixtureAction,
  fixturesRoot = defaultFixturesRoot(),
): string {
  const fileName = action === "apply" ? "apply.sql" : "cleanup.sql";
  return readFileSync(path.join(fixturesRoot, fileName), "utf8");
}

/** Reject dangerous SQL patterns and require every known fixture ID to appear. */
export function assertSafeHostedFixtureSql(
  sql: string,
  manifest: HostedFixtureManifest,
): void {
  const withoutLineComments = sql
    .split("\n")
    .map((line) => {
      const commentIndex = line.indexOf("--");
      return commentIndex === -1 ? line : line.slice(0, commentIndex);
    })
    .join("\n")
    .toLowerCase();

  if (/\btruncate\b/.test(withoutLineComments)) {
    throw new Error("Hosted fixture SQL must not truncate tables");
  }
  if (/delete\s+from\s+public\.\w+\s*;/.test(withoutLineComments)) {
    throw new Error("Hosted fixture SQL must not use unqualified DELETE");
  }
  if (
    /delete\s+from\s+public\.(companies|vacancies|vacancy_language_requirements)\s+where\s+source\s*=/.test(
      withoutLineComments,
    )
  ) {
    throw new Error(
      "Hosted fixture SQL must not delete by broad source filters",
    );
  }
  if (
    /\bdrop\s+table\b/.test(withoutLineComments) ||
    /\bdrop\s+schema\b/.test(withoutLineComments)
  ) {
    throw new Error("Hosted fixture SQL must not drop schema objects");
  }

  const requiredIds = [
    manifest.companyId,
    ...manifest.vacancyIds,
    ...manifest.languageRequirementIds,
  ];
  for (const id of requiredIds) {
    if (!sql.includes(id)) {
      throw new Error(`Hosted fixture SQL is missing expected id ${id}`);
    }
  }
}

function readFlag(argv: readonly string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index === -1) {
    return null;
  }
  return argv[index + 1] ?? null;
}

function hasFlag(argv: readonly string[], name: string): boolean {
  return argv.includes(name);
}

function readEqualsFlag(argv: readonly string[], name: string): string | null {
  const prefix = `${name}=`;
  for (const arg of argv) {
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }
  return null;
}

function isEnvironment(value: string): value is HostedFixtureEnvironment {
  return (ENVIRONMENTS as readonly string[]).includes(value);
}

function isAction(value: string): value is HostedFixtureAction {
  return (ACTIONS as readonly string[]).includes(value);
}

function rejectCredentialArguments(argv: readonly string[]): string | null {
  for (const arg of argv) {
    if (
      (FORBIDDEN_CREDENTIAL_FLAGS as readonly string[]).includes(arg) ||
      FORBIDDEN_CREDENTIAL_FLAGS.some((flag) => arg.startsWith(`${flag}=`))
    ) {
      return `Forbidden credential argument "${arg.split("=")[0]}". Pass credentials only via ${SUPABASE_DB_URL_ENV}.`;
    }
    if (URL_LIKE_RE.test(arg)) {
      return `Positional database URL arguments are forbidden. Pass credentials only via ${SUPABASE_DB_URL_ENV}.`;
    }
    if (/service_role|eyJhbGciOi|sb_secret_/i.test(arg)) {
      return "Refusing arguments that look like inline secret dumps.";
    }
  }
  return null;
}

export function parseHostedFixtureArgs(
  argv: readonly string[],
): HostedFixtureValidationResult {
  // pnpm may forward a literal "--" separator; ignore it.
  const args = argv.filter((arg) => arg !== "--");

  const credentialError = rejectCredentialArguments(args);
  if (credentialError !== null) {
    return { ok: false, error: credentialError };
  }

  const actionArg = args[0];
  if (actionArg === undefined || !isAction(actionArg)) {
    return {
      ok: false,
      error: `Usage: hosted-demo <apply|cleanup> --env <local|preview|production> --project-ref <ref> [--confirm-production=${PRODUCTION_CONFIRMATION}] [--dry-run]. Credentials: export ${SUPABASE_DB_URL_ENV} (never on the CLI).`,
    };
  }

  const environment = readFlag(args, "--env");
  if (environment === null || !isEnvironment(environment)) {
    return {
      ok: false,
      error:
        "Missing or invalid --env. Expected local, preview, or production.",
    };
  }

  const projectRef = readFlag(args, "--project-ref");
  if (projectRef === null || projectRef.trim() === "") {
    return {
      ok: false,
      error: "Missing --project-ref. Explicit project targeting is required.",
    };
  }

  const confirmProduction =
    readFlag(args, "--confirm-production") ??
    readEqualsFlag(args, "--confirm-production");

  if (environment === "production") {
    if (confirmProduction !== PRODUCTION_CONFIRMATION) {
      return {
        ok: false,
        error: `Production requires --confirm-production=${PRODUCTION_CONFIRMATION}`,
      };
    }
  } else if (confirmProduction !== null) {
    return {
      ok: false,
      error:
        "--confirm-production is only valid with --env production and must be omitted otherwise.",
    };
  }

  return {
    ok: true,
    args: {
      action: actionArg,
      environment,
      projectRef: projectRef.trim(),
      confirmProduction,
      dryRun: hasFlag(args, "--dry-run"),
    },
  };
}

export type HostedFixtureEnv = Readonly<Record<string, string | undefined>>;

export function resolveSupabaseDbUrl(
  env: HostedFixtureEnv,
): { ok: true; databaseUrl: string } | { ok: false; error: string } {
  const value = env[SUPABASE_DB_URL_ENV]?.trim();
  if (value === undefined || value === "") {
    return {
      ok: false,
      error: `Missing ${SUPABASE_DB_URL_ENV}. Export it temporarily for this command; do not pass credentials on the command line.`,
    };
  }
  return { ok: true, databaseUrl: value };
}

export function buildHostedFixtureExecutionBoundary(
  args: ParsedHostedFixtureArgs,
  databaseUrl: string,
): HostedFixtureExecutionBoundary {
  const argv = [
    "hosted-demo",
    args.action,
    "--env",
    args.environment,
    "--project-ref",
    args.projectRef,
  ];
  if (args.confirmProduction !== null) {
    argv.push(`--confirm-production=${args.confirmProduction}`);
  }
  if (args.dryRun) {
    argv.push("--dry-run");
  }
  return {
    shell: false,
    argv,
    env: { SUPABASE_DB_URL: databaseUrl },
  };
}

/** Parse CLI args and resolve credentials from env (never from argv). */
export function prepareHostedFixtureRun(
  argv: readonly string[],
  env: HostedFixtureEnv,
): HostedFixtureRun {
  const parsed = parseHostedFixtureArgs(argv);
  if (!parsed.ok) {
    return parsed;
  }

  const { args } = parsed;
  if (args.dryRun) {
    return {
      ok: true,
      args,
      databaseUrl: null,
      execution: null,
    };
  }

  const resolved = resolveSupabaseDbUrl(env);
  if (!resolved.ok) {
    return resolved;
  }

  return {
    ok: true,
    args,
    databaseUrl: resolved.databaseUrl,
    execution: buildHostedFixtureExecutionBoundary(args, resolved.databaseUrl),
  };
}

/** Safe console summary — never include the database URL or passwords. */
export function formatHostedFixturePlan(
  args: ParsedHostedFixtureArgs,
  manifest: HostedFixtureManifest,
): string {
  return [
    `action=${args.action}`,
    `environment=${args.environment}`,
    `project_ref=${args.projectRef}`,
    `dry_run=${args.dryRun ? "yes" : "no"}`,
    `company_id=${manifest.companyId}`,
    `vacancy_ids=${manifest.vacancyIds.join(",")}`,
    `language_requirement_ids=${manifest.languageRequirementIds.join(",")}`,
    `expiry_days=${manifest.expiryDays}`,
    `credential_source=env:${SUPABASE_DB_URL_ENV}`,
  ].join("\n");
}

/** Strip accidental credential material from error text before logging. */
export function sanitizeHostedFixtureError(message: string): string {
  return message
    .replace(/(?:postgresql|postgres):\/\/\S+/gi, "(redacted)")
    .replace(/password\s*=\s*\S+/gi, "password=(redacted)");
}
