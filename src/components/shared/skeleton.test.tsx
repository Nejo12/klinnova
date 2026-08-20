import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DelayedReveal,
  Skeleton,
  SkeletonRegion,
} from "@/components/shared/skeleton";

describe("Skeleton", () => {
  it("is hidden from the accessibility tree", () => {
    const { container } = render(<Skeleton height="2rem" />);

    const block = container.firstElementChild;
    expect(block).toHaveAttribute("aria-hidden", "true");
  });

  it("defaults to full width and a sm radius, applying the given height", () => {
    const { container } = render(<Skeleton height="2rem" />);

    const block = container.firstElementChild as HTMLElement;
    expect(block.style.width).toBe("100%");
    expect(block.style.height).toBe("2rem");
    expect(block.className).toMatch(/radiusSm/i);
  });

  it("respects explicit width and radius props", () => {
    const { container } = render(
      <Skeleton width="8rem" height="1.5rem" radius="pill" />,
    );

    const block = container.firstElementChild as HTMLElement;
    expect(block.style.width).toBe("8rem");
    expect(block.style.height).toBe("1.5rem");
    expect(block.className).toMatch(/radiusPill/i);
  });

  it("supports the md radius option", () => {
    const { container } = render(<Skeleton height="1rem" radius="md" />);

    const block = container.firstElementChild as HTMLElement;
    expect(block.className).toMatch(/radiusMd/i);
  });
});

describe("SkeletonRegion", () => {
  it("exposes a busy status region with no explicit aria-live", () => {
    render(
      <SkeletonRegion label="Loading vacancies">
        <Skeleton height="1rem" />
      </SkeletonRegion>,
    );

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).not.toHaveAttribute("aria-live");
  });

  it("renders the label as visually-hidden text within the region", () => {
    render(
      <SkeletonRegion label="Loading vacancies">
        <Skeleton height="1rem" />
      </SkeletonRegion>,
    );

    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("Loading vacancies");
  });
});

describe("DelayedReveal", () => {
  it("renders its children into the DOM immediately", () => {
    render(
      <DelayedReveal>
        <p>Real content</p>
      </DelayedReveal>,
    );

    expect(screen.getByText("Real content")).toBeInTheDocument();
  });
});
