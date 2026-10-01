"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  markAllCandidateNotificationsReadResultSchema,
  markCandidateNotificationReadResultSchema,
} from "@/lib/candidate/notifications/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function openCandidateNotificationAction(
  formData: FormData,
): Promise<void> {
  const id = z.string().uuid().safeParse(formData.get("notificationId"));
  if (!id.success) redirect("/candidate/notifications?error=read");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "mark_current_candidate_notification_read",
    { p_notification_id: id.data },
  );
  const parsed = markCandidateNotificationReadResultSchema.safeParse(data);
  if (error !== null || !parsed.success || parsed.data.result !== "ok")
    redirect("/candidate/notifications?error=read");
  revalidatePath("/candidate/notifications");
  redirect(`/candidate/applications/${parsed.data.application_id}`);
}

export async function markAllCandidateNotificationsReadAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "mark_all_current_candidate_notifications_read",
  );
  const parsed = markAllCandidateNotificationsReadResultSchema.safeParse(data);
  if (error !== null || !parsed.success || parsed.data.result !== "ok")
    redirect("/candidate/notifications?error=read");
  revalidatePath("/candidate/notifications");
  redirect("/candidate/notifications");
}
