import { describe, expect, it, vi } from "vitest";

import {
  runPreviewDbPush,
  type SpawnRunner,
} from "@/lib/proof/preview-db-push";

const PREVIEW_REF = "previewfakeref000000";
const PRODUCTION_REF = "productionfakeref9999";

const VALID_ENV = {
  STINT_PREVIEW_SUPABASE_URL: `https://${PREVIEW_REF}.supabase.co`,
  STINT_PREVIEW_SUPABASE_DB_URL: `postgresql://postgres:pw@db.${PREVIEW_REF}.supabase.co:5432/postgres`,
  STINT_PREVIEW_SUPABASE_PROJECT_REF: PREVIEW_REF,
  STINT_PRODUCTION_SUPABASE_PROJECT_REF: PRODUCTION_REF,
};

describe("runPreviewDbPush", () => {
  it("never invokes the runner when the Preview target guard fails closed", () => {
    const runner = vi.fn() as unknown as SpawnRunner;

    const code = runPreviewDbPush({}, runner);

    expect(code).toBe(1);
    expect(runner).not.toHaveBeenCalled();
  });

  it("never invokes the runner when only some Preview target env vars are set", () => {
    const runner = vi.fn() as unknown as SpawnRunner;

    const code = runPreviewDbPush(
      { STINT_PREVIEW_SUPABASE_URL: VALID_ENV.STINT_PREVIEW_SUPABASE_URL },
      runner,
    );

    expect(code).toBe(1);
    expect(runner).not.toHaveBeenCalled();
  });

  it("invokes the runner with a guarded db push command once the target is verified, and never with --linked", () => {
    const runner = vi.fn().mockReturnValue({
      status: 0,
      error: undefined,
    }) as unknown as SpawnRunner;

    const code = runPreviewDbPush(VALID_ENV, runner);

    expect(code).toBe(0);
    expect(runner).toHaveBeenCalledTimes(1);
    const [command, args] = (runner as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, string[], unknown];
    expect(command).toBe("supabase");
    expect(args).toEqual([
      "db",
      "push",
      "--db-url",
      VALID_ENV.STINT_PREVIEW_SUPABASE_DB_URL,
    ]);
    expect(args).not.toContain("--linked");
  });

  it("propagates a non-zero runner exit status", () => {
    const runner = vi.fn().mockReturnValue({
      status: 3,
      error: undefined,
    }) as unknown as SpawnRunner;

    const code = runPreviewDbPush(VALID_ENV, runner);

    expect(code).toBe(3);
  });

  it("reports failure when the runner itself errors (e.g. supabase CLI not found)", () => {
    const runner = vi.fn().mockReturnValue({
      status: null,
      error: new Error("spawn supabase ENOENT"),
    }) as unknown as SpawnRunner;

    const code = runPreviewDbPush(VALID_ENV, runner);

    expect(code).toBe(1);
  });

  it("refuses a target that resolves to the configured Production project ref, even with a fully-formed env", () => {
    const runner = vi.fn() as unknown as SpawnRunner;

    const code = runPreviewDbPush(
      {
        ...VALID_ENV,
        STINT_PREVIEW_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
        STINT_PREVIEW_SUPABASE_DB_URL: `postgresql://postgres:pw@db.${PRODUCTION_REF}.supabase.co:5432/postgres`,
      },
      runner,
    );

    expect(code).toBe(1);
    expect(runner).not.toHaveBeenCalled();
  });
});
