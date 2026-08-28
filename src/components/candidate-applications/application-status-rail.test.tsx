import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationStatusRail } from "@/components/candidate-applications/application-status-rail";
import type { ApplicationStatus } from "@/lib/applications/status";

const expectedCurrentStage: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  reviewing: "In review",
  shortlisted: "Shortlisted",
  accepted: "Decision",
  rejected: "Decision",
};

describe("ApplicationStatusRail", () => {
  it.each(
    Object.entries(expectedCurrentStage) as [ApplicationStatus, string][],
  )("marks the correct current stage for %s", (status, stage) => {
    render(<ApplicationStatusRail status={status} />);

    const currentNodes = document.querySelectorAll('[aria-current="step"]');
    expect(currentNodes).toHaveLength(1);
    expect(currentNodes[0]).toHaveTextContent(stage);
  });

  it("marks exactly the 3rd node current for shortlisted, 4th node text is Decision not Accepted", () => {
    render(<ApplicationStatusRail status="shortlisted" />);
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("In review")).toBeInTheDocument();
    expect(screen.getByText("Shortlisted")).toBeInTheDocument();
    expect(screen.getByText("Decision")).toBeInTheDocument();
    expect(screen.queryByText("Accepted")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();

    const currentNodes = document.querySelectorAll('[aria-current="step"]');
    expect(currentNodes.length).toBe(1);
    expect(currentNodes[0]).toHaveTextContent("Shortlisted");
  });

  it("lights the 4th node for both accepted and rejected, never renders those words as the node label", () => {
    render(<ApplicationStatusRail status="accepted" />);
    expect(screen.getByText("Decision")).toBeInTheDocument();
    expect(screen.queryByText("Accepted")).not.toBeInTheDocument();
  });

  it("also lights the 4th node for rejected status, with Decision as the node label", () => {
    render(<ApplicationStatusRail status="rejected" />);
    expect(screen.getByText("Decision")).toBeInTheDocument();
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
    expect(screen.queryByText("Accepted")).not.toBeInTheDocument();
  });
});
