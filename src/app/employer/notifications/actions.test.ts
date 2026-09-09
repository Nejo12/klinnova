import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((href: string): never => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
);
const revalidatePath = vi.hoisted(() => vi.fn());
const createServerSupabaseClient = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

import {
  markAllEmployerNotificationsReadAction,
  openEmployerNotificationAction,
} from "@/app/employer/notifications/actions";

describe("Employer notification actions", () => {
  const rpc = vi.fn();

  beforeEach(() => {
    rpc.mockReset();
    redirect.mockClear();
    revalidatePath.mockClear();
    createServerSupabaseClient.mockReset();
    createServerSupabaseClient.mockResolvedValue({ rpc });
  });

  it("marks one notification read through the bounded RPC and opens its returned application", async () => {
    rpc.mockResolvedValue({
      data: {
        result: "ok",
        application_id: "22222222-2222-4222-8222-222222222222",
      },
      error: null,
    });
    const formData = new FormData();
    formData.set("notificationId", "11111111-1111-4111-8111-111111111111");

    await expect(openEmployerNotificationAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/employer/applications/22222222-2222-4222-8222-222222222222",
    );
    expect(rpc).toHaveBeenCalledWith(
      "mark_current_employer_notification_read",
      { p_notification_id: "11111111-1111-4111-8111-111111111111" },
    );
  });

  it("does not accept a caller-supplied application destination", async () => {
    const formData = new FormData();
    formData.set("notificationId", "not-a-uuid");
    formData.set("applicationId", "22222222-2222-4222-8222-222222222222");

    await expect(openEmployerNotificationAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/employer/notifications",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("marks all notification rows read without invoking application mutation RPCs", async () => {
    rpc.mockResolvedValue({
      data: { result: "ok", updated_count: 3 },
      error: null,
    });

    await markAllEmployerNotificationsReadAction();

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "mark_all_current_employer_notifications_read",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/employer/notifications");
  });
});
