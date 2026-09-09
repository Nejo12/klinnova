import { z } from "zod";

export const employerNotificationSchema = z.object({
  notification_id: z.string().uuid(),
  kind: z.literal("new_application"),
  application_id: z.string().uuid(),
  vacancy_title: z.string().min(1),
  created_at: z.string().min(1),
  read_at: z.string().min(1).nullable(),
});

export const employerNotificationsSchema = z.array(employerNotificationSchema);

export type EmployerNotification = z.infer<typeof employerNotificationSchema>;

export const markEmployerNotificationReadResultSchema = z.discriminatedUnion(
  "result",
  [
    z.object({
      result: z.literal("ok"),
      application_id: z.string().uuid(),
    }),
    z.object({ result: z.literal("unavailable") }),
    z.object({ result: z.literal("employer_unavailable") }),
  ],
);

export const markAllEmployerNotificationsReadResultSchema =
  z.discriminatedUnion("result", [
    z.object({
      result: z.literal("ok"),
      updated_count: z.number().int().min(0),
    }),
    z.object({
      result: z.literal("unavailable"),
      updated_count: z.literal(0),
    }),
    z.object({
      result: z.literal("employer_unavailable"),
      updated_count: z.literal(0),
    }),
  ]);
