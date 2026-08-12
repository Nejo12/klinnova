import { ImageResponse } from "next/og";

/**
 * Klinnova compact mark — Apple touch icon (M5.1 K2). Same master geometry
 * as src/app/icon.tsx (see that file for provenance). Filled square, not
 * transparent — iOS applies its own rounded-square mask automatically, so
 * pre-masking here would double-mask. Cream mark on an oxblood field,
 * matching the K1-validated touch-icon treatment.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK_COLOR = "#f2e9dd"; // cream mark, matches the existing design-system favicon example
const FIELD_COLOR = "#5c2a1c"; // approximate sRGB for --oxblood

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: FIELD_COLOR,
      }}
    >
      <svg
        width="118"
        height="118"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 40 L14 12 L28 8"
          stroke={MARK_COLOR}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 40 L34 36 L34 14"
          stroke={MARK_COLOR}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="30" cy="24" r="3" fill={MARK_COLOR} />
      </svg>
    </div>,
    { ...size },
  );
}
