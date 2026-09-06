import { readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton, type SkeletonVariant } from "@/components/skeleton/skeleton";

const skeletonSource = readFileSync(
  path.join(process.cwd(), "src/components/skeleton/skeleton.tsx"),
  "utf-8",
);

const skeletonStyles = readFileSync(
  path.join(process.cwd(), "src/components/skeleton/skeleton.module.scss"),
  "utf-8",
);

describe("Skeleton", () => {
  it.each<SkeletonVariant>(["line", "block", "card"])(
    "renders the %s variant as assistive-technology-hidden presentation",
    (variant) => {
      const { container } = render(<Skeleton variant={variant} />);
      const skeleton = container.firstElementChild;

      expect(skeleton).toHaveAttribute("data-variant", variant);
      expect(skeleton).toHaveAttribute("aria-hidden", "true");
      expect(skeleton).not.toHaveAttribute("role");
    },
  );

  it("renders the stable card composition without fabricated copy", () => {
    const { container } = render(<Skeleton variant="card" />);

    expect(
      container.querySelectorAll('[data-skeleton-part="media"]'),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll('[data-skeleton-part="title"]'),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll('[data-skeleton-part="body"]'),
    ).toHaveLength(2);
    expect(
      container.querySelectorAll('[data-skeleton-part="action"]'),
    ).toHaveLength(1);
    expect(container).toHaveTextContent("");
  });

  it("does not add card-only placeholders to line or block variants", () => {
    const { container, rerender } = render(<Skeleton variant="line" />);

    expect(container.querySelector("[data-skeleton-part]")).toBeNull();

    rerender(<Skeleton variant="block" />);

    expect(container.querySelector("[data-skeleton-part]")).toBeNull();
  });

  it("preserves an optional consumer class", () => {
    const { container } = render(<Skeleton className="consumer-layout" />);

    expect(container.firstElementChild).toHaveClass("consumer-layout");
  });

  it("remains a server component without embedded loading copy", () => {
    expect(skeletonSource).not.toContain('"use client"');
    expect(skeletonSource).not.toMatch(/loading|laden/i);
  });

  it("uses semantic paints, stable dimensions, and reduced-motion rules", () => {
    expect(skeletonStyles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(skeletonStyles).not.toMatch(/\brgba?\(/i);
    expect(skeletonStyles).toContain("var(--color-bg-subtle)");
    expect(skeletonStyles).toContain("var(--color-bg-surface)");
    expect(skeletonStyles).toContain("width: min(100%, 32.5rem)");
    expect(skeletonStyles).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(skeletonStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(skeletonStyles).toContain("animation: none");
  });
});
