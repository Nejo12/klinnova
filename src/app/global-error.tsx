"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import "@/styles/tokens.css";
import "@/styles/globals.scss";
import {
  GLOBAL_ERROR_BODY,
  GLOBAL_ERROR_HEADING,
  GLOBAL_ERROR_RELOAD_LABEL,
} from "@/lib/observability/messages";

import styles from "./error.module.scss";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Root-layout last-resort error boundary (M5.1 Unit G) — replaces
 * src/app/layout.tsx entirely when it activates, so it declares its own
 * <html>/<body> and re-imports the design tokens/global stylesheet layout.tsx
 * would otherwise provide. Reports to Sentry via the same scrubbed
 * beforeSend pipeline as error.tsx.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className={styles.page}>
          <h1 className={styles.heading}>{GLOBAL_ERROR_HEADING}</h1>
          <p className={styles.body}>{GLOBAL_ERROR_BODY}</p>
          <button type="button" className={styles.action} onClick={reset}>
            {GLOBAL_ERROR_RELOAD_LABEL}
          </button>
        </main>
      </body>
    </html>
  );
}
