"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  markAllEmployerNotificationsReadResultSchema,
  markEmployerNotificationReadResultSchema,
} from "@/lib/employer/notifications/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const notificationIdSchema = z.string().uuid();

export async function openEmployerNotificationAction(
  formData: FormData,
): Promise<void> {
  const notificationId = notificationIdSchema.safeParse(
    formData.get("notificationId"),
  );
  if (!notificationId.success) {
    redirect("/employer/notifications");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "mark_current_employer_notification_read",
    { p_notification_id: notificationId.data },
  );

  if (error !== null || data === null) {
    redirect("/employer/notifications");
  }

  const parsed = markEmployerNotificationReadResultSchema.safeParse(data);
  if (!parsed.success || parsed.data.result !== "ok") {
    redirect("/employer/notifications");
  }

  redirect(`/employer/applications/${parsed.data.application_id}`);
}

export async function markAllEmployerNotificationsReadAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "mark_all_current_employer_notifications_read",
  );

  if (error === null && data !== null) {
    markAllEmployerNotificationsReadResultSchema.safeParse(data);
  }

  revalidatePath("/employer/notifications");
}
