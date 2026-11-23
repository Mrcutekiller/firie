import { useState, useRef, useEffect } from "react";
import BrandLogo from "../components/BrandLogo";

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto transition after 3.5s if user hasn't clicked
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-black text-white select-none cursor-pointer"
    >
      {/* ── Background Video: Page 10 (Cinematic App Opening) ── */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src="/videos/page-10.mp4"
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? "opacity-90" : "opacity-40"
          }`}
        />
        {/* Cinematic dark gradients to guarantee text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />
      </div>

      {/* Top Brand Pill */}
      <div className="relative z-10 pt-12 px-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 border border-white/20">
          <span className="h-2 w-2 rounded-full bg-[#FF7F02] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
            2026 COLLECTION
          </span>
        </div>
        <span className="text-[10px] font-semibold text-white/60 tracking-wider">
          ADDIS ABABA
        </span>
      </div>

      {/* Center Opening Hero: App Logo and Name (Clean Floating Emblem without Box) */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center my-auto">
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute -inset-6 rounded-full bg-[#FF7F02] opacity-40 blur-2xl animate-pulse" />
          <BrandLogo size={96} className="relative drop-shadow-[0_8px_28px_rgba(255,127,2,0.6)]" />
        </div>

        <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
          Firie
        </h1>

        <p className="mt-2 text-xs font-bold tracking-widest uppercase text-orange-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          Precision Wardrobe Intelligence
        </p>

        <p className="mt-3 max-w-xs text-xs text-slate-200 leading-relaxed font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          Effortless daily outfits curated from the clothes you already own.
        </p>
      </div>

      {/* Bottom Action Area */}
      <div className="relative z-10 pb-12 px-6 max-w-md mx-auto w-full">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDone();
          }}
          className="group relative flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF7F02] to-[#FF9E3B] px-6 text-sm font-black text-white shadow-xl shadow-orange-500/30 border border-white/20 active:scale-95 transition-all"
        >
          <span>Get Started</span>
          <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
        </button>

        <p className="mt-3 text-center text-[10px] text-white/60 font-medium">
          Tap anywhere to continue
        </p>
      </div>
    </div>
  );
}
