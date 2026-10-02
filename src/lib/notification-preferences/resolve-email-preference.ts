import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getPublicEnv } from "@/lib/env/public";
import {
  notificationCategorySchema,
  type NotificationCategory,
} from "@/lib/notification-preferences/categories";
import type { Database } from "@/types/database";

/** Called only with the canonical recipient resolved by the existing N2/N3 lookup. */
export async function resolveRecipientEmailPreference(
  userId: string,
  category: NotificationCategory,
): Promise<boolean | null> {
  try {
    const id = z.string().uuid().parse(userId);
    const key = z.string().min(1).parse(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const client = createClient<Database>(
      getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
      key,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
    const { data, error } = await client
      .from("notification_preferences")
      .select("email_enabled")
      .eq("user_id", id)
      .eq("category", notificationCategorySchema.parse(category))
      .maybeSingle();
    if (error !== null) return null;
    if (data === null) return true;
    return z.object({ email_enabled: z.boolean() }).parse(data).email_enabled;
  } catch {
    return null;
  }
}
