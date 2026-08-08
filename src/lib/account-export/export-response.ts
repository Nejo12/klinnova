import type { CandidateAccountExportResult } from "./candidate-export";
import type { EmployerAccountExportResult } from "./employer-export";
import { exportFilename } from "./filename";
import {
  EXPORT_FAILURE_MESSAGE,
  EXPORT_UNAUTHENTICATED_MESSAGE,
  EXPORT_UNAVAILABLE_MESSAGE,
} from "./messages";

export type ExportHttpResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

type BuilderResult = CandidateAccountExportResult | EmployerAccountExportResult;

/**
 * Pure mapping from a builder result to an HTTP response shape — no
 * Next.js/Request/cookie dependency, so this is unit-testable directly.
 * Route Handlers only call this and wrap the result in a `Response`.
 */
export function buildExportHttpResponse(
  role: "candidate" | "employer",
  result: BuilderResult,
): ExportHttpResponse {
  if (result.kind === "unauthenticated") {
    return {
      status: 401,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ error: EXPORT_UNAUTHENTICATED_MESSAGE }),
    };
  }

  if (result.kind === "unavailable") {
    return {
      status: 403,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ error: EXPORT_UNAVAILABLE_MESSAGE }),
    };
  }

  if (result.kind === "failure") {
    return {
      status: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ error: EXPORT_FAILURE_MESSAGE }),
    };
  }

  const filename = exportFilename(role, result.payload.exported_at);

  return {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
    body: `${JSON.stringify(result.payload, null, 2)}\n`,
  };
}
