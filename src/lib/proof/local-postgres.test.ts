import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const connectMock = vi.hoisted(() => vi.fn());
const endMock = vi.hoisted(() => vi.fn());
const ClientMock = vi.hoisted(() =>
  vi.fn().mockImplementation(function MockClient() {
    return { connect: connectMock, query: queryMock, end: endMock };
  }),
);

vi.mock("pg", () => ({ Client: ClientMock }));

import {
  resolveLocalDatabaseUrl,
  withLocalPostgresReadOnlyTransaction,
} from "@/lib/proof/local-postgres";

function envWith(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return { ...process.env, ...overrides };
}

describe("resolveLocalDatabaseUrl", () => {
  it("accepts the default local connection string", () => {
    expect(resolveLocalDatabaseUrl(envWith({}))).toMatch(
      /^postgresql:\/\/.*127\.0\.0\.1/,
    );
  });

  it("rejects a hosted Supabase connection string", () => {
    expect(() =>
      resolveLocalDatabaseUrl(
        envWith({
          STINT_DATABASE_URL:
            "postgresql://user:pass@db.abcd.supabase.co:5432/postgres",
        }),
      ),
    ).toThrow(/localhost/i);
  });

  it("rejects an unparseable connection string", () => {
    expect(() =>
      resolveLocalDatabaseUrl(envWith({ STINT_DATABASE_URL: "not-a-url" })),
    ).toThrow(/parseable/i);
  });
});

describe("withLocalPostgresReadOnlyTransaction", () => {
  beforeEach(() => {
    queryMock.mockReset().mockResolvedValue({ rows: [] });
    connectMock.mockReset().mockResolvedValue(undefined);
    endMock.mockReset().mockResolvedValue(undefined);
    ClientMock.mockClear();
  });

  it("begins a REPEATABLE READ READ ONLY transaction before running the callback", async () => {
    await withLocalPostgresReadOnlyTransaction(async () => "ok");

    const firstCallSql = String(queryMock.mock.calls[0]?.[0]);
    expect(firstCallSql).toMatch(/BEGIN/i);
    expect(firstCallSql).toMatch(/REPEATABLE READ/i);
    expect(firstCallSql).toMatch(/READ ONLY/i);
  });

  it("commits after a successful callback and returns its result", async () => {
    const result = await withLocalPostgresReadOnlyTransaction(
      async () => "value",
    );

    expect(result).toBe("value");
    const sqlCalls = queryMock.mock.calls.map((call) => String(call[0]));
    expect(sqlCalls.some((sql) => /^COMMIT/i.test(sql))).toBe(true);
    expect(sqlCalls.some((sql) => /^ROLLBACK/i.test(sql))).toBe(false);
  });

  it("rolls back and rethrows the original error on a failed callback, without committing", async () => {
    const failure = new Error("measurement query failed");

    await expect(
      withLocalPostgresReadOnlyTransaction(async () => {
        throw failure;
      }),
    ).rejects.toThrow("measurement query failed");

    const sqlCalls = queryMock.mock.calls.map((call) => String(call[0]));
    expect(sqlCalls.some((sql) => /^ROLLBACK/i.test(sql))).toBe(true);
    expect(sqlCalls.some((sql) => /^COMMIT/i.test(sql))).toBe(false);
  });

  it("still rethrows the original measurement error if ROLLBACK itself fails", async () => {
    const measurementFailure = new Error("original measurement failure");
    queryMock.mockImplementation(async (sql: string) => {
      if (/^ROLLBACK/i.test(sql)) {
        throw new Error("rollback failed too");
      }
      return { rows: [] };
    });

    await expect(
      withLocalPostgresReadOnlyTransaction(async () => {
        throw measurementFailure;
      }),
    ).rejects.toThrow("original measurement failure");
  });

  it("always ends the client connection, on success or failure", async () => {
    await withLocalPostgresReadOnlyTransaction(async () => "ok");
    expect(endMock).toHaveBeenCalledTimes(1);

    endMock.mockClear();
    await expect(
      withLocalPostgresReadOnlyTransaction(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow();
    expect(endMock).toHaveBeenCalledTimes(1);
  });

  it("uses exactly one client connection for the whole callback — every query the callback issues shares one transaction/snapshot", async () => {
    await withLocalPostgresReadOnlyTransaction(async (client) => {
      await client.query("select 1");
      await client.query("select 2");
      await client.query("select 3");
      return "ok";
    });

    expect(ClientMock).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledTimes(1);
    // BEGIN + 3 callback queries + COMMIT, all through the same mocked client.
    expect(queryMock).toHaveBeenCalledTimes(5);
  });

  it("rejects a non-localhost connection string before ever connecting", async () => {
    await expect(
      withLocalPostgresReadOnlyTransaction(
        async () => "unreachable",
        envWith({
          STINT_DATABASE_URL:
            "postgresql://user:pass@db.abcd.supabase.co:5432/postgres",
        }),
      ),
    ).rejects.toThrow(/localhost/i);

    expect(connectMock).not.toHaveBeenCalled();
    expect(ClientMock).not.toHaveBeenCalled();
  });

  it("never includes connection credentials in a thrown error", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("nonexistent")) {
        throw new Error("relation does not exist");
      }
      return { rows: [] };
    });

    try {
      await withLocalPostgresReadOnlyTransaction(async (client) => {
        await client.query("select * from nonexistent");
      });
      expect.unreachable("expected the transaction to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toMatch(/postgres:postgres/);
      expect(message).not.toMatch(/password/i);
    }
  });
});
