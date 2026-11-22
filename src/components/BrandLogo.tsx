import { cn } from "./ui";

const LOGO_SRC = "/logo/Icy%20Ribbon%20Hanger%20F%20Logo.png";

/**
 * Central brand mark. Uses the FITLY hanger logo from /public/logo so every
 * header, splash, empty state and navigation element stays consistent.
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
      alt="FITLY"
      width={size}
      height={size}
      draggable={false}
      className={cn("object-contain", rounded, className)}
      style={{ width: size, height: size }}
    />
  );
}

export const LOGO_PATH = LOGO_SRC;
