import type { ApplicationStatus } from "@/lib/applications/status";
import { APPLICATION_STATUS_CODES } from "@/lib/applications/status";

const RAIL_NODE_LABELS = [
  "Submitted",
  "In review",
  "Shortlisted",
  "Decision",
] as const;

type ApplicationStatusRailProps = {
  status: ApplicationStatus;
};

export function ApplicationStatusRail({
  status,
}: ApplicationStatusRailProps): JSX.Element {
  // Clamp the node index to the range [0, 3] to ensure accepted/rejected both map to the 4th node
  const currentNodeIndex = Math.min(
    APPLICATION_STATUS_CODES.indexOf(status),
    3,
  );

  return (
    <ol
      style={{
        display: "flex",
        gap: "1rem",
        listStyle: "none",
        padding: 0,
        margin: 0,
      }}
    >
      {RAIL_NODE_LABELS.map((label, index) => (
        <li
          key={index}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              border: "2px solid currentColor",
              backgroundColor:
                index <= currentNodeIndex ? "currentColor" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-current={index <= currentNodeIndex ? "step" : undefined}
          />
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}
