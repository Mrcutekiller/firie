import { useEffect } from "react";
import BrandLogo from "../components/BrandLogo";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      title="Tap to continue"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 text-white overflow-hidden cursor-pointer select-none"
    >
      {/* Animated logo */}
      <div className="splash-logo animate-splash flex items-center justify-center">
        <BrandLogo size={72} rounded="rounded-2xl" />
      </div>

      {/* App name */}
      <p className="mt-6 text-4xl font-extrabold tracking-[0.25em] text-white">
        FITLY
      </p>

      {/* Tagline */}
      <p className="splash-tagline mt-2">Your closet, your style.</p>

      {/* Floating emoji dots */}
      <div className="absolute bottom-14 flex gap-6">
        <span
          className="animate-float text-2xl"
          style={{ animationDelay: "0ms" }}
        >
          👗
        </span>
        <span
          className="animate-float text-2xl"
          style={{ animationDelay: "300ms" }}
        >
          👔
        </span>
        <span
          className="animate-float text-2xl"
          style={{ animationDelay: "600ms" }}
        >
          👟
        </span>
      </div>
    </div>
  );
}
