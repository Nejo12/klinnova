import "server-only";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  preferenceResultSchema,
  type NotificationCategory,
} from "@/lib/notification-preferences/categories";

export async function loadCurrentEmailPreference(
  category: NotificationCategory,
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return { status: "unauthenticated" as const };
  const { data, error } = await supabase.rpc(
    "get_current_notification_email_preference",
    { p_category: category },
  );
  if (error !== null) return { status: "failure" as const };
  if (z.object({ result: z.literal("unavailable") }).safeParse(data).success)
    return { status: "unavailable" as const };
  const parsed = preferenceResultSchema.safeParse(data);
  return parsed.success
    ? { status: "ready" as const, enabled: parsed.data.email_enabled }
    : { status: "failure" as const };
}

export async function saveCurrentEmailPreference(
  category: NotificationCategory,
  enabled: boolean,
) {
  const parsed = z.boolean().safeParse(enabled);
  if (!parsed.success) return { status: "failure" as const };
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc(
      "set_current_notification_email_preference",
      { p_category: category, p_email_enabled: parsed.data },
    );
    const saved = z
      .object({ result: z.literal("ok"), email_enabled: z.boolean() })
      .safeParse(data);
    if (
      error !== null ||
      !saved.success ||
      saved.data.email_enabled !== enabled
    )
      return { status: "failure" as const };
    return { status: "saved" as const, enabled: saved.data.email_enabled };
  } catch {
    return { status: "failure" as const };
  }
}
