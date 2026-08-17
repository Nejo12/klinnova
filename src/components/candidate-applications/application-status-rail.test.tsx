import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationStatusRail } from "@/components/candidate-applications/application-status-rail";

describe("ApplicationStatusRail", () => {
  it("marks exactly the 3rd node current for shortlisted, 4th node text is Decision not Accepted", () => {
    render(<ApplicationStatusRail status="shortlisted" />);
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("In review")).toBeInTheDocument();
    expect(screen.getByText("Shortlisted")).toBeInTheDocument();
    expect(screen.getByText("Decision")).toBeInTheDocument();
    expect(screen.queryByText("Accepted")).not.toBeInTheDocument();
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
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
