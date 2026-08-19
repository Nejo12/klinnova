import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/candidate/applications/[applicationId]/loading";
import styles from "@/components/candidate-application-confirmation/application-confirmation.module.scss";

describe("candidate application confirmation Loading", () => {
  it("announces a busy 'Loading application' status region", () => {
    render(<Loading />);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveTextContent("Loading application");
  });

  it("renders the fixed job-details and candidate-profile meta row counts", () => {
    const { container } = render(<Loading />);

    const sections = container.querySelectorAll(`.${styles.section}`);
    // Job details, Candidate profile, Status timeline.
    expect(sections).toHaveLength(3);

    const [jobDetailsSection, candidateProfileSection] = sections;
    expect(
      jobDetailsSection?.querySelectorAll(`.${styles.metaRow}`),
    ).toHaveLength(8);
    expect(
      candidateProfileSection?.querySelectorAll(`.${styles.metaRow}`),
    ).toHaveLength(7);
  });

  it("renders status timeline rows as a list, not fabricated event text", () => {
    const { container } = render(<Loading />);

    const timelineItems = container.querySelectorAll(
      `.${styles.timelineItem}`,
    );
    expect(timelineItems.length).toBeGreaterThan(0);
  });

  it("does not render the conditional accepted banner or outcomes section", () => {
    render(<Loading />);

    expect(screen.queryByText("Application accepted")).toBeNull();
    expect(screen.queryByText("Interview and hire updates")).toBeNull();
  });

  it("renders no interactive controls", () => {
    render(<Loading />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
