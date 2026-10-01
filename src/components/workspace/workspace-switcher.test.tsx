import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/account/workspace-actions", () => ({
  activateWorkspaceAction: vi.fn(),
}));

import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";

describe("WorkspaceSwitcher", () => {
  it("shows one current workspace and one deliberate dual-account switch", () => {
    render(<WorkspaceSwitcher current="candidate" hasCandidate hasEmployer />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Workspace and account: Candidate",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "Switch workspace" });
    expect(within(dialog).getByText("Current")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Employer" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("link", { name: "Candidate" }),
    ).toBeNull();
  });

  it("shows Candidate initials and display name when identity is available", () => {
    render(
      <WorkspaceSwitcher
        current="candidate"
        hasCandidate
        hasEmployer={false}
        displayName="Ada Candidate"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Workspace and account: Candidate",
    });
    expect(trigger).toHaveTextContent("AC");
    expect(trigger).toHaveTextContent("Ada Candidate");

    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Switch workspace" });
    expect(within(dialog).getByText("Ada Candidate")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Candidate").length).toBeGreaterThan(0);
  });

  it("offers explicit second-capability creation instead of silently adding it", () => {
    render(
      <WorkspaceSwitcher current="employer" hasCandidate={false} hasEmployer />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Workspace and account: Employer",
      }),
    );

    expect(
      screen.getByRole("button", {
        name: "Also use Klinnova as a candidate",
      }),
    ).toBeInTheDocument();
  });

  it("uses the existing Popover Escape and focus-return behavior", () => {
    render(<WorkspaceSwitcher current="candidate" hasCandidate hasEmployer />);
    const trigger = screen.getByRole("button", {
      name: "Workspace and account: Candidate",
    });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
