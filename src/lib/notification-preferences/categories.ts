import { z } from "zod";

export const notificationCategorySchema = z.enum([
  "candidate_application_updates",
  "employer_new_applicants",
]);
export type NotificationCategory = z.infer<typeof notificationCategorySchema>;
export const preferenceResultSchema = z.object({
  result: z.literal("ready"),
  email_enabled: z.boolean(),
});
