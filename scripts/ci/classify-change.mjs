#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const ZERO_SHA = "0000000000000000000000000000000000000000";

const TIER_A_EXACT_PATHS = new Set(["README.md", "AGENTS.md", "NOT_NOW.md"]);

const TIER_A_PREFIXES = ["docs/", ".agents/", ".codex/"];

const TIER_B_EXACT_PATHS = new Set([
  "src/app/icon.tsx",
  "src/app/apple-icon.tsx",
  ".prettierrc.json",
  ".prettierignore",
  "eslint.config.mjs",
]);

const TIER_B_PREFIXES = [
  "src/components/homepage/",
  "src/components/public-shared/",
  "src/components/legal/",
  "src/styles/",
  "src/app/impressum/",
  "src/app/privacy/",
  "src/app/terms/",
  "public/",
];

const TIER_B_FILE_PREFIXES = [
  "src/components/brand-mark.",
  "src/components/shell-header.",
  "src/app/error.",
  "src/app/global-error.",
];

const TIER_C_EXACT_PATHS = new Set([
  "src/types/database.ts",
  "package.json",
  "pnpm-lock.yaml",
  "next.config.ts",
  "tsconfig.json",
  "tsconfig.scripts.json",
  "vitest.config.mts",
  "playwright.config.ts",
  "playwright.webkit-smoke.config.ts",
  "src/proxy.ts",
]);

const TIER_C_PREFIXES = [
  "supabase/",
  ".github/workflows/",
  "scripts/",
  "e2e/",
  "src/lib/supabase/",
  "src/lib/auth/",
  "src/lib/env/",
  "src/lib/account-deletion/",
  "src/lib/account-export/",
  "src/lib/applications/",
  "src/lib/employer/",
  "src/lib/internal/",
  "src/lib/matching/",
  "src/lib/onboarding/",
  "src/lib/proof/",
  "src/lib/public-jobs/load-",
  "src/app/auth/",
  "src/app/login/",
  "src/app/register/",
  "src/app/forgot-password/",
  "src/app/reset-password/",
  "src/app/account/",
  "src/app/candidate/",
  "src/app/employer/",
  "src/app/internal/",
  "src/app/jobs/",
  "src/components/account-deletion/",
  "src/components/auth/",
  "src/components/candidate-application-confirmation/",
  "src/components/candidate-applications/",
  "src/components/candidate-job-detail/",
  "src/components/candidate-matches/",
  "src/components/candidate-nav/",
  "src/components/employer-applications/",
  "src/components/employer-onboarding/",
  "src/components/employer-shared/",
  "src/components/employer-vacancies/",
  "src/components/employer-verification/",
  "src/components/internal-moderation/",
  "src/components/internal-shared/",
  "src/components/internal-verification/",
  "src/components/onboarding/",
  "src/components/public-jobs/",
];

const SINGLE_PATH_STATUSES = new Set(["A", "D", "M", "T"]);

function matchesPrefix(path, prefixes) {
  return prefixes.some((prefix) => path.startsWith(prefix));
}

function matchesSameDirectoryFilePrefix(path, prefixes) {
  return prefixes.some((prefix) => {
    if (!path.startsWith(prefix)) {
      return false;
    }

    return !path.slice(prefix.length).includes("/");
  });
}

export function isTierAPath(path) {
  return TIER_A_EXACT_PATHS.has(path) || matchesPrefix(path, TIER_A_PREFIXES);
}

export function isTierBPath(path) {
  return (
    TIER_B_EXACT_PATHS.has(path) ||
    matchesPrefix(path, TIER_B_PREFIXES) ||
    matchesSameDirectoryFilePrefix(path, TIER_B_FILE_PREFIXES)
  );
}

export function isTierCPath(path) {
  return TIER_C_EXACT_PATHS.has(path) || matchesPrefix(path, TIER_C_PREFIXES);
}

function hasUnsafePathShape(path) {
  return (
    path.length === 0 ||
    path.startsWith("/") ||
    path === "." ||
    path.startsWith("../") ||
    path.includes("/../") ||
    path.endsWith("/..") ||
    /[\u0000-\u001f\u007f]/u.test(path)
  );
}

function tierA(reason, changedFiles, records) {
  return {
    tier: "A",
    non_runtime_only: true,
    database_sensitive: false,
    reason,
    changedFiles,
    records,
  };
}

function tierB(reason, changedFiles, records) {
  return {
    tier: "B",
    non_runtime_only: false,
    database_sensitive: false,
    reason,
    changedFiles,
    records,
  };
}

function tierC(reason, changedFiles = [], records = []) {
  return {
    tier: "C",
    non_runtime_only: false,
    database_sensitive: true,
    reason,
    changedFiles,
    records,
  };
}

function unique(paths) {
  return [...new Set(paths)];
}

export function parseNameStatusZ(buffer) {
  if (buffer.length === 0) {
    return { ok: false, reason: "empty diff", records: [], changedFiles: [] };
  }

  if (buffer[buffer.length - 1] !== 0) {
    return {
      ok: false,
      reason: "malformed NUL-delimited diff",
      records: [],
      changedFiles: [],
    };
  }

  const tokens = buffer.toString("utf8").slice(0, -1).split("\0");
  const records = [];
  const changedFiles = [];

  for (let index = 0; index < tokens.length;) {
    const status = tokens[index];
    index += 1;

    if (!status) {
      return {
        ok: false,
        reason: "malformed record: missing status",
        records,
        changedFiles: unique(changedFiles),
      };
    }

    const code = status[0];

    if (code === "R" || code === "C") {
      const oldPath = tokens[index];
      const newPath = tokens[index + 1];
      index += 2;

      if (oldPath === undefined || newPath === undefined) {
        return {
          ok: false,
          reason: `malformed ${status} record`,
          records,
          changedFiles: unique(changedFiles),
        };
      }

      records.push({ status, paths: [oldPath, newPath] });
      changedFiles.push(oldPath, newPath);
      continue;
    }

    const path = tokens[index];
    index += 1;

    if (path === undefined) {
      return {
        ok: false,
        reason: `malformed ${status} record`,
        records,
        changedFiles: unique(changedFiles),
      };
    }

    records.push({ status, paths: [path] });
    changedFiles.push(path);

    if (!SINGLE_PATH_STATUSES.has(code) || status.length !== 1) {
      return {
        ok: false,
        reason: `unexpected git status ${status}`,
        records,
        changedFiles: unique(changedFiles),
      };
    }
  }

  return { ok: true, records, changedFiles: unique(changedFiles) };
}

export function classifyNameStatusZ(buffer) {
  const parsed = parseNameStatusZ(buffer);
  if (!parsed.ok) {
    return tierC(parsed.reason, parsed.changedFiles, parsed.records);
  }

  const { records, changedFiles } = parsed;
  const hasRenameOrCopy = records.some((record) => {
    const code = record.status[0];
    return code === "R" || code === "C";
  });

  if (hasRenameOrCopy) {
    return tierC(
      "rename/copy record requires conservative validation",
      changedFiles,
      records,
    );
  }

  const unsafePath = changedFiles.find(hasUnsafePathShape);
  if (unsafePath !== undefined) {
    return tierC(`unsafe path shape: ${unsafePath}`, changedFiles, records);
  }

  if (changedFiles.every(isTierAPath)) {
    return tierA(
      "all paths are non-runtime governance/documentation paths",
      changedFiles,
      records,
    );
  }

  const hasDatabaseSensitivePath = changedFiles.some(isTierCPath);
  if (hasDatabaseSensitivePath) {
    return tierC(
      "at least one path is database/auth/security/tooling sensitive",
      changedFiles,
      records,
    );
  }

  const allKnownPresentationOrNonRuntime = changedFiles.every(
    (path) => isTierAPath(path) || isTierBPath(path),
  );

  if (allKnownPresentationOrNonRuntime) {
    return tierB(
      "all runtime paths are known presentation/static paths",
      changedFiles,
      records,
    );
  }

  return tierC(
    "unknown path outside Tier A and Tier B allowlists",
    changedFiles,
    records,
  );
}

function isZeroSha(sha) {
  return sha === ZERO_SHA;
}

function gitCommitExists(sha) {
  const result = spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], {
    stdio: "ignore",
  });

  return result.status === 0;
}

function classifyFromGit(baseSha, headSha) {
  if (!baseSha || !headSha || isZeroSha(baseSha)) {
    return tierC("missing or all-zero base/head SHA");
  }

  if (!gitCommitExists(baseSha)) {
    return tierC(`base commit is not available: ${baseSha}`);
  }

  if (!gitCommitExists(headSha)) {
    return tierC(`head commit is not available: ${headSha}`);
  }

  const result = spawnSync(
    "git",
    ["diff", "--name-status", "-z", "-M", baseSha, headSha],
    {
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024 * 10,
    },
  );

  if (result.error) {
    return tierC(`git diff failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    return tierC(
      `git diff exited with status ${result.status}: ${result.stderr.toString("utf8").trim()}`,
    );
  }

  return classifyNameStatusZ(result.stdout);
}

function parseArgs(argv) {
  const args = {
    base: undefined,
    head: undefined,
    githubOutput: undefined,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--base") {
      args.base = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--head") {
      args.head = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--github-output") {
      args.githubOutput = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--json") {
      args.json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function outputValue(value) {
  return value ? "true" : "false";
}

function githubOutputLines(result) {
  return [
    `non_runtime_only=${outputValue(result.non_runtime_only)}`,
    `database_sensitive=${outputValue(result.database_sensitive)}`,
    "",
  ].join("\n");
}

function logSummary(result) {
  console.log(`classification_tier=${result.tier}`);
  console.log(`non_runtime_only=${outputValue(result.non_runtime_only)}`);
  console.log(`database_sensitive=${outputValue(result.database_sensitive)}`);
  console.log(`reason=${result.reason}`);

  if (result.changedFiles.length > 0) {
    console.log("changed_files:");
    for (const file of result.changedFiles) {
      console.log(`- ${file}`);
    }
  }
}

export function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const result = classifyFromGit(args.base, args.head);

  if (args.githubOutput) {
    appendFileSync(args.githubOutput, githubOutputLines(result), "utf8");
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  logSummary(result);
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
