import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

import { classifyNameStatusZ, parseNameStatusZ } from "./classify-change.mjs";

function record(status, ...paths) {
  return Buffer.from(`${status}\0${paths.join("\0")}\0`, "utf8");
}

function records(...entries) {
  return Buffer.concat(entries);
}

function classify(...entries) {
  return classifyNameStatusZ(records(...entries));
}

function assertClassified(result, tier, nonRuntimeOnly, databaseSensitive) {
  assert.equal(result.tier, tier);
  assert.equal(result.non_runtime_only, nonRuntimeOnly);
  assert.equal(result.database_sensitive, databaseSensitive);
}

describe("CI change classifier", () => {
  it("classifies exact Tier A paths as non-runtime only", () => {
    assertClassified(classify(record("M", "docs/04-mvp.md")), "A", true, false);
    assertClassified(classify(record("M", "AGENTS.md")), "A", true, false);
    assertClassified(
      classify(record("M", ".agents/skills/klinnova-review/SKILL.md")),
      "A",
      true,
      false,
    );
    assertClassified(
      classify(record("M", ".codex/config.toml")),
      "A",
      true,
      false,
    );
  });

  it("keeps mixed docs and agent metadata in Tier A", () => {
    assertClassified(
      classify(
        record("M", "docs/agent/governance.md"),
        record("M", ".agents/skills/klinnova-review/agents/openai.yaml"),
      ),
      "A",
      true,
      false,
    );
  });

  it("classifies known presentation and static paths as Tier B", () => {
    assertClassified(
      classify(record("M", "src/components/homepage/homepage.module.scss")),
      "B",
      false,
      false,
    );
    assertClassified(
      classify(record("M", "src/styles/globals.scss")),
      "B",
      false,
      false,
    );
    assertClassified(
      classify(record("M", "public/some-static-asset")),
      "B",
      false,
      false,
    );
    assertClassified(
      classify(record("M", "eslint.config.mjs")),
      "B",
      false,
      false,
    );
  });

  it("classifies sensitive and unknown paths as Tier C", () => {
    assertClassified(
      classify(record("M", "src/lib/auth/confirm.ts")),
      "C",
      false,
      true,
    );
    assertClassified(
      classify(record("M", "src/app/employer/applications/page.tsx")),
      "C",
      false,
      true,
    );
    assertClassified(
      classify(record("A", "supabase/migrations/example.sql")),
      "C",
      false,
      true,
    );
    assertClassified(classify(record("M", "package.json")), "C", false, true);
    assertClassified(
      classify(record("M", "e2e/example.spec.ts")),
      "C",
      false,
      true,
    );
    assertClassified(
      classify(record("M", ".github/workflows/ci.yml")),
      "C",
      false,
      true,
    );
    assertClassified(
      classify(record("M", "scripts/example.mjs")),
      "C",
      false,
      true,
    );
    assertClassified(classify(record("M", ".env.example")), "C", false, true);
    assertClassified(
      classify(record("M", "src/lib/public-jobs/load-public-vacancies.ts")),
      "C",
      false,
      true,
    );
    assertClassified(
      classify(record("M", "unknown/path.foo")),
      "C",
      false,
      true,
    );
  });

  it("uses the highest-risk tier for mixed changes", () => {
    assertClassified(
      classify(
        record("M", "docs/04-mvp.md"),
        record("M", "src/styles/globals.scss"),
      ),
      "B",
      false,
      false,
    );
    assertClassified(
      classify(
        record("M", "src/styles/globals.scss"),
        record("M", "src/lib/auth/confirm.ts"),
      ),
      "C",
      false,
      true,
    );
    assertClassified(
      classify(record("M", "docs/04-mvp.md"), record("M", "unknown/path.foo")),
      "C",
      false,
      true,
    );
  });

  it("fails safe on empty, rename, copy, malformed, and unsafe path input", () => {
    assertClassified(classifyNameStatusZ(Buffer.alloc(0)), "C", false, true);
    assertClassified(
      classify(record("R100", "docs/old.md", "docs/new.md")),
      "C",
      false,
      true,
    );
    assertClassified(
      classify(record("C100", "docs/source.md", "docs/copy.md")),
      "C",
      false,
      true,
    );
    assertClassified(
      classifyNameStatusZ(Buffer.from("M\0docs/04-mvp.md", "utf8")),
      "C",
      false,
      true,
    );
    assertClassified(
      classify(record("M", "../docs/04-mvp.md")),
      "C",
      false,
      true,
    );
  });

  it("parses deletions by the deleted path when unambiguous", () => {
    assertClassified(classify(record("D", "docs/04-mvp.md")), "A", true, false);
    assertClassified(
      classify(record("D", "src/components/homepage/homepage.module.scss")),
      "B",
      false,
      false,
    );
    assertClassified(
      classify(record("D", "src/lib/auth/confirm.ts")),
      "C",
      false,
      true,
    );
  });

  it("parses NUL-delimited paths containing spaces", () => {
    const result = classify(record("M", "docs/file with spaces.md"));

    assertClassified(result, "A", true, false);
    assert.deepEqual(result.changedFiles, ["docs/file with spaces.md"]);
  });

  it("marks unexpected git status records as malformed", () => {
    const parsed = parseNameStatusZ(record("U", "docs/04-mvp.md"));

    assert.equal(parsed.ok, false);
    assert.equal(parsed.reason, "unexpected git status U");
  });

  it("can be imported from node eval without running the CLI entrypoint", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        'import "./scripts/ci/classify-change.mjs"; console.log("imported");',
      ],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), "imported");
    assert.equal(result.stderr.trim(), "");
  });
});
