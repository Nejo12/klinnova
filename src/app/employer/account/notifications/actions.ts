"use server";
import { revalidatePath } from "next/cache";
import { saveCurrentEmailPreference } from "@/lib/notification-preferences/current-preference";
export async function saveEmployerEmailPreference(enabled: boolean) {
  const result = await saveCurrentEmailPreference(
    "employer_new_applicants",
    enabled,
  );
  if (result.status === "saved")
    revalidatePath("/employer/account/notifications");
  return result;
}
