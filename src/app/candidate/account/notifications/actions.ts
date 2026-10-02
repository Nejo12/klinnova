"use server";
import { revalidatePath } from "next/cache";
import { saveCurrentEmailPreference } from "@/lib/notification-preferences/current-preference";
export async function saveCandidateEmailPreference(enabled: boolean) {
  const result = await saveCurrentEmailPreference(
    "candidate_application_updates",
    enabled,
  );
  if (result.status === "saved")
    revalidatePath("/candidate/account/notifications");
  return result;
}
