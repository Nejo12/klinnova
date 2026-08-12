import { ImageResponse } from "next/og";

/**
 * Klinnova compact mark — favicon (M5.1 K2). Master geometry is the
 * K1-approved Option 2 (angled doorway/aperture) mark, taken directly from
 * docs/klinnova/visual-validation.html's own existing SVG rendition:
 * two rounded strokes plus a small circle of light, in a 48x48 viewBox.
 *
 * Per the K1 founder checkpoint, favicon sizes use size-tuned rendering
 * rather than a naive scale-down of the 48x48 master: stroke-width 7 and
 * circle radius 4 (not the master's 5/3) — the same tuning already present
 * in visual-validation.html's own 14px rendition, extended here to the
 * 16x16 and 32x32 exports it didn't yet cover. This changes only the
 * favicon-size export, never the master mark geometry.
 */
const MARK_COLOR = "#5c2a1c"; // approximate sRGB for the design system's --oxblood (oklch(0.38 0.13 20))

export function generateImageMetadata() {
  return [
    { id: "16", size: { width: 16, height: 16 }, contentType: "image/png" },
    { id: "32", size: { width: 32, height: 32 }, contentType: "image/png" },
  ];
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const iconId = await id;
  const px = iconId === "16" ? 16 : 32;

  return new ImageResponse(
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 40 L14 12 L28 8"
        stroke={MARK_COLOR}
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 40 L34 36 L34 14"
        stroke={MARK_COLOR}
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="24" r="4" fill={MARK_COLOR} />
    </svg>,
    { width: px, height: px },
  );
}
