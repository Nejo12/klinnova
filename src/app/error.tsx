"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@nova-component/ui";

import {
  ERROR_BOUNDARY_BODY,
  ERROR_BOUNDARY_HEADING,
  ERROR_BOUNDARY_RETRY_LABEL,
} from "@/lib/observability/messages";

import styles from "./error.module.scss";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Route-segment error boundary (M5.1 Unit G). Reports to Sentry via the
 * scrubbed beforeSend pipeline configured in
 * src/sentry.server.config.ts/src/instrumentation-client.ts — never logs
 * or renders the raw error message/stack to the user.
 */
export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>{ERROR_BOUNDARY_HEADING}</h1>
      <p className={styles.body}>{ERROR_BOUNDARY_BODY}</p>
      <Button type="button" className={styles.action} onClick={reset}>
        {ERROR_BOUNDARY_RETRY_LABEL}
      </Button>
    </main>
  );
}
