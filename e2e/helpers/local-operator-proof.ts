import { withLocalPostgres } from "./local-application-proof";

/**
 * Local-only operator fixture provisioning. There is no application RPC or
 * UI path to create a `verification_operators` row — that is intentional
 * (D-056; no operator-management RPC in Slice 5). This uses the same
 * approved localhost-only direct-Postgres boundary as
 * `withLocalPostgres`/`local-application-proof.ts`, never a service-role
 * application client, and never a schema/RLS change.
 */
export async function provisionLocalVerificationOperator(
  userId: string,
): Promise<void> {
  await withLocalPostgres(async (client) => {
    await client.query(
      `insert into public.verification_operators (user_id, created_by, active)
       values ($1, $1, true)
       on conflict (user_id) do update set active = true`,
      [userId],
    );
  });
}

export async function getLocalUserIdByEmail(email: string): Promise<string> {
  return withLocalPostgres(async (client) => {
    const result = await client.query<{ id: string }>(
      `select id from auth.users where email = $1`,
      [email],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error(`no local auth user found for ${email}`);
    }
    return row.id;
  });
}
