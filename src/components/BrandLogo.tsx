import { cn } from "./ui";

const LOGO_SRC = "/logo/firie-logo.png";

/**
 * Central brand mark for ፍሬ (Firie).
 * Uses the modern orange citrus logo from /public/logo/firie-logo.png.
 */
export default function BrandLogo({
  size = 36,
  rounded = "rounded-xl",
  className,
}: {
  size?: number;
  rounded?: string;
  className?: string;
}) {
  return (
    <img
      src={LOGO_SRC}
      alt="ፍሬ (Firie)"
      width={size}
      height={size}
      draggable={false}
      className={cn("object-contain", rounded, className)}
      style={{ width: size, height: size }}
    />
  );
}

export const LOGO_PATH = LOGO_SRC;

