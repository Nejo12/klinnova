import { z } from "zod";

export const candidateNotificationKindSchema = z.enum([
  "application_shortlisted",
  "application_accepted",
  "application_rejected",
]);
export const candidateNotificationSchema = z.object({
  notification_id: z.string().uuid(),
  kind: candidateNotificationKindSchema,
  application_id: z.string().uuid(),
  vacancy_title: z.string().min(1),
  employer_display_name: z.string(),
  created_at: z.string().datetime({ offset: true }),
  read_at: z.string().datetime({ offset: true }).nullable(),
});
export const candidateNotificationsSchema = z.array(
  candidateNotificationSchema,
);
export type CandidateNotification = z.infer<typeof candidateNotificationSchema>;
export const markCandidateNotificationReadResultSchema = z.discriminatedUnion(
  "result",
  [
    z.object({ result: z.literal("ok"), application_id: z.string().uuid() }),
    z.object({ result: z.literal("unavailable") }),
  ],
);
export const markAllCandidateNotificationsReadResultSchema =
  z.discriminatedUnion("result", [
    z.object({
      result: z.literal("ok"),
      updated_count: z.number().int().min(0),
    }),
    z.object({ result: z.literal("unavailable"), updated_count: z.literal(0) }),
  ]);
