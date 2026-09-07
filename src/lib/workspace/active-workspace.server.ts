import "server-only";

import { cookies } from "next/headers";

import {
  ACTIVE_WORKSPACE_COOKIE,
  type ActiveWorkspace,
  isActiveWorkspace,
} from "@/lib/workspace/active-workspace";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function readActiveWorkspace(): Promise<ActiveWorkspace | null> {
  const value = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
  return isActiveWorkspace(value) ? value : null;
}

/** Only call from a Server Action, where Next permits response-cookie writes. */
export async function writeActiveWorkspace(
  workspace: ActiveWorkspace,
): Promise<void> {
  (await cookies()).set(ACTIVE_WORKSPACE_COOKIE, workspace, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
