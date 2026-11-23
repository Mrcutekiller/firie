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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-[#18181B] overflow-hidden cursor-pointer select-none"
    >
      {/* Animated logo */}
      <div className="splash-logo animate-splash flex items-center justify-center p-3 rounded-3xl bg-white shadow-2xl border border-orange-100">
        <BrandLogo size={80} rounded="rounded-2xl" />
      </div>

      {/* App name */}
      <p className="mt-6 text-3xl font-black tracking-tight text-[#18181B]">
        ፍሬ <span className="text-[#FF7F02] text-xl font-bold">(Firie)</span>
      </p>

      {/* Tagline */}
      <p className="mt-1 text-xs font-bold text-[#FF7F02] tracking-wider uppercase">Your closet, your style.</p>

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
