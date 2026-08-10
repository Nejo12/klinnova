/**
 * Structural safety checks for the M5.1 Unit F persistent Preview Supabase
 * target (D-F1: a standalone project, never a Production project branch).
 *
 * Fails closed: any missing, ambiguous, or unparseable input is rejected.
 * Identity is established only by comparing the caller-supplied Preview and
 * Production Supabase project refs against the refs structurally extracted
 * from the target URLs — never by a name, label, or "looks like Preview"
 * heuristic.
 */

import { inspectUrlShape } from "./local-environment-guard.ts";

export type PreviewTargetGuardInput = {
  /** Preview project's browser-facing Supabase API URL, e.g. https://<ref>.supabase.co */
  supabaseUrl: string | undefined;
  /** Preview project's direct Postgres connection string, e.g. postgresql://...@db.<ref>.supabase.co:5432/postgres */
  databaseUrl: string | undefined;
  expectedPreviewProjectRef: string | undefined;
  expectedProductionProjectRef: string | undefined;
};

export type PreviewTargetGuardResult =
  { ok: true; projectRef: string } | { ok: false; error: string };

const SUPABASE_API_HOST_PATTERN = /^([a-z0-9]{1,63})\.supabase\.co$/i;
const SUPABASE_DB_HOST_PATTERN = /^db\.([a-z0-9]{1,63})\.supabase\.co$/i;

function checkUrlRef(
  raw: string | undefined,
  label: string,
  hostPattern: RegExp,
  allowedProtocols: readonly string[],
  previewRef: string,
  productionRef: string,
): { ok: true; projectRef: string } | { ok: false; error: string } {
  const trimmed = raw?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return {
      ok: false,
      error: `${label} is required. Refusing to guess the Preview target.`,
    };
  }

  const shape = inspectUrlShape(trimmed);
  if (!shape.ok) {
    return { ok: false, error: `${label}: ${shape.error}` };
  }

  if (!allowedProtocols.includes(shape.protocol)) {
    return {
      ok: false,
      error: `${label} must use ${allowedProtocols.join(" or ")}.`,
    };
  }

  const match = hostPattern.exec(shape.hostname);
  if (match === null) {
    return {
      ok: false,
      error: `${label} does not match the expected hosted Supabase hostname shape.`,
    };
  }

  const actualRef = (match[1] ?? "").toLowerCase();

  if (actualRef === productionRef) {
    return {
      ok: false,
      error: `${label} resolves to the configured Production project ref. Refusing.`,
    };
  }

  if (actualRef !== previewRef) {
    return {
      ok: false,
      error: `${label} project ref "${actualRef}" does not match the configured Preview project ref "${previewRef}". Refusing.`,
    };
  }

  return { ok: true, projectRef: actualRef };
}

/**
 * Validate that both the Preview API URL and the Preview database URL
 * structurally resolve to the same, explicitly-configured Preview project
 * ref — and never to the explicitly-configured Production project ref.
 */
export function assertPreviewSupabaseTarget(
  input: PreviewTargetGuardInput,
): PreviewTargetGuardResult {
  const previewRef = input.expectedPreviewProjectRef?.trim().toLowerCase();
  const productionRef = input.expectedProductionProjectRef
    ?.trim()
    .toLowerCase();

  if (previewRef === undefined || previewRef.length === 0) {
    return {
      ok: false,
      error:
        "expectedPreviewProjectRef is required. Refusing to guess the Preview target.",
    };
  }

  if (productionRef === undefined || productionRef.length === 0) {
    return {
      ok: false,
      error:
        "expectedProductionProjectRef is required. Refusing to guess the Production project ref to exclude.",
    };
  }

  if (previewRef === productionRef) {
    return {
      ok: false,
      error:
        "expectedPreviewProjectRef and expectedProductionProjectRef must not be equal. Refusing an ambiguous configuration.",
    };
  }

  const apiResult = checkUrlRef(
    input.supabaseUrl,
    "Preview Supabase API URL",
    SUPABASE_API_HOST_PATTERN,
    ["https:"],
    previewRef,
    productionRef,
  );
  if (!apiResult.ok) {
    return apiResult;
  }

  const dbResult = checkUrlRef(
    input.databaseUrl,
    "Preview Supabase database URL",
    SUPABASE_DB_HOST_PATTERN,
    ["postgresql:", "postgres:"],
    previewRef,
    productionRef,
  );
  if (!dbResult.ok) {
    return dbResult;
  }

  return { ok: true, projectRef: apiResult.projectRef };
}
