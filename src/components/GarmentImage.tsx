import { useState } from "react";
import { cn } from "./ui";
import type { Slot } from "../lib/types";

/** Simple garment silhouettes used when a photo is missing or fails to load. */
const PATHS: Record<Slot, string> = {
  top: "M32 14 L20 21 L13 41 L22 46 L27 32 L27 86 L73 86 L73 32 L78 46 L87 41 L80 21 L68 14 L58 21 L50 25 L42 21 Z",
  bottom: "M34 14 L66 14 L71 86 L55 86 L50 42 L45 86 L29 86 Z",
  shoes:
    "M18 58 L18 46 L38 41 L52 50 L79 56 Q87 59 87 67 L87 72 L18 72 Z",
  cap: "M18 64 Q18 30 50 30 Q82 30 82 64 L90 64 Q90 72 82 72 L18 72 Q10 72 10 64 Z",
  ring: "M50 34 A22 22 0 1 0 50 78 A22 22 0 1 0 50 34 Z",
  accessory:
    "M22 32 L42 32 Q50 20 58 32 L78 32 Q84 32 84 38 L84 78 Q84 84 78 84 L22 84 Q16 84 16 78 L16 38 Q16 32 22 32 Z",
};

export function garmentSvgDataUrl(slot: Slot, colorHex: string, transparent = false): string {
  const isRing = slot === "ring";
  const d = PATHS[slot] ?? PATHS.top;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    (transparent ? "" : `<rect width="100" height="100" fill="#f1f5fb"/>`) +
    `<path d="${d}" fill="${isRing ? "none" : colorHex}" stroke="${
      isRing ? colorHex : "rgba(11,31,58,0.18)"
    }" stroke-width="${isRing ? 7 : 2}" stroke-linejoin="round"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface Props {
  src?: string;
  alt: string;
  slot: Slot;
  colorHex: string;
  className?: string;
  transparent?: boolean;
}

/** Renders a closet photo, falling back to a coloured silhouette on error. */
export default function GarmentImage({ src, alt, slot, colorHex, className, transparent = false }: Props) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;
  return (
    <img
      src={showFallback ? garmentSvgDataUrl(slot, colorHex, transparent) : src}
      alt={alt}
      loading="eager"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={cn("pointer-events-none select-none", className)}
    />
  );
}
