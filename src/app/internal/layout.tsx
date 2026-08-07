import type { ReactNode } from "react";

import { InternalNav } from "@/components/internal-shared/internal-nav";

type InternalLayoutProps = {
  children: ReactNode;
};

/**
 * Shared shell for every /internal/* route. Adds a minimal nav between the
 * two existing operator surfaces (verification queue, employer moderation)
 * — not a general admin dashboard. Route-level authorization (operator gate)
 * remains in each page/action; this layout renders unconditionally and adds
 * no authorization logic of its own.
 */
export default function InternalLayout({ children }: InternalLayoutProps) {
  return (
    <>
      <InternalNav />
      {children}
    </>
  );
}
