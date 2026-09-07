import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const logoutAllDevicesAction = vi.hoisted(() => vi.fn());

vi.mock("@/app/auth/actions", () => ({
  logoutAllDevicesAction,
}));

import { LogoutAllDevices } from "@/components/auth/logout-all-devices";

function installDialogMethods() {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: vi.fn(function showModal(this: HTMLDialogElement) {
        this.setAttribute("open", "");
      }),
    },
    close: {
      configurable: true,
      value: vi.fn(function close(this: HTMLDialogElement) {
        this.removeAttribute("open");
      }),
    },
  });
}

describe("LogoutAllDevices", () => {
  beforeEach(() => {
    installDialogMethods();
    logoutAllDevicesAction.mockReset();
    logoutAllDevicesAction.mockResolvedValue(undefined);
  });

  it("does not mutate auth when opened or cancelled", async () => {
    const user = userEvent.setup();
    render(<LogoutAllDevices />);

    const trigger = screen.getByRole("button", {
      name: "Log out all devices",
    });
    await user.click(trigger);

    expect(logoutAllDevicesAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(logoutAllDevicesAction).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("Escape closes with no mutation and returns focus", async () => {
    const user = userEvent.setup();
    render(<LogoutAllDevices />);
    const trigger = screen.getByRole("button", {
      name: "Log out all devices",
    });
    await user.click(trigger);

    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(logoutAllDevicesAction).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("invokes global logout only after explicit confirmation", async () => {
    const user = userEvent.setup();
    render(<LogoutAllDevices />);
    await user.click(
      screen.getByRole("button", { name: "Log out all devices" }),
    );

    const buttons = screen.getAllByRole("button", {
      name: "Log out all devices",
    });
    await user.click(buttons.at(-1)!);

    await waitFor(() =>
      expect(logoutAllDevicesAction).toHaveBeenCalledTimes(1),
    );
  });
});
