import { useState, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";

interface Props {
  onDone: (name: string, city: string, email: string, gender: "men" | "women") => void;
}

type Step = "welcome" | "why" | "how" | "profile";

interface VideoMeta {
  src: string;
  poster: string;
  title: string;
  subtitle: string;
}

const STEP_VIDEOS: Record<Step, VideoMeta> = {
  welcome: {
    src: "/videos/page-1.mp4",
    poster: "/images/page_previews/page_1.jpg",
    title: "DIGITAL WARDROBE INTELLIGENCE",
    subtitle: "Stillness Collection · Addis Ababa",
  },
  why: {
    src: "/videos/page-2.mp4",
    poster: "/images/page_previews/page_2.jpg",
    title: "AI OUTFIT DISCOVERY",
    subtitle: "Fluid Swipe & Color Theory",
  },
  how: {
    src: "/videos/page-3.mp4",
    poster: "/images/page_previews/page_3.jpg",
    title: "SILHOUETTE & PROPORTIONS",
    subtitle: "Tactile Textures & Fluid Drape",
  },
  profile: {
    src: "/videos/page-4.mp4",
    poster: "/images/page_previews/page_4.jpg",
    title: "PERSONALIZE YOUR CLOSET",
    subtitle: "Tailored Cuts & Climate Sync",
  },
};

export default function OnboardingScreen({ onDone }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Addis Ababa");
  const [gender, setGender] = useState<"men" | "women">("men");
  const [stylePreference, setStylePreference] = useState("Relaxed");

  // Touch Swipe Gesture Tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Detect predominantly horizontal swipe (threshold: 40px)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        // Swipe Left -> Next Page
        if (step === "welcome") setStep("why");
        else if (step === "why") setStep("how");
        else if (step === "how") setStep("profile");
      } else {
        // Swipe Right -> Previous Page
        if (step === "profile") setStep("how");
        else if (step === "how") setStep("why");
        else if (step === "why") setStep("welcome");
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    localStorage.setItem("fitly_style", stylePreference);
    localStorage.setItem("fitly_onboarded", "1");
    onDone(name.trim() || "Biruk", city.trim() || "Addis Ababa", email.trim().toLowerCase(), gender);
    navigate("/", { replace: true });
  }

  const currentVideo = STEP_VIDEOS[step];

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white font-sans select-none flex flex-col justify-between"
    >
      {/* ── 100% VISIBLE CINEMATIC BACKGROUND VIDEO ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          key={currentVideo.src}
          src={currentVideo.src}
          poster={currentVideo.poster}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover object-center transition-all duration-700"
        />

        {/* Soft bottom vignette only so video is fully seen and text is readable */}
        <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
      </div>

      {/* Top area left clean and unobstructed per user request */}
      <div className="pt-4" />

      {/* ── BOTTOM DOCKED CONTROLS (Appears immediately, video fully visible, swipe enabled) ── */}
      <main className="relative z-10 mx-auto w-full max-w-md px-4 pb-2 mt-auto animate-fade">
        {/* ── STEP 1: WELCOME SCREEN ── */}
        {step === "welcome" && (
          <div className="rounded-3xl bg-black/40 backdrop-blur-xl p-5 border border-white/20 shadow-2xl text-left space-y-3.5">
            {/* Prominent Large App Logo */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xl p-2 border border-orange-200">
                <BrandLogo size={52} rounded="rounded-xl" />
                <span className="absolute -bottom-1 -right-1 rounded-full bg-[#FF7F02] text-white p-0.5 text-[9px] shadow-md border border-white/20">
                  ✨
                </span>
              </div>
              <div>
                <span className="inline-block rounded-full bg-[#FF7F02]/30 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-orange-300 border border-orange-400/30">
                  ● ፍሬ · PERSONAL AI WARDROBE
                </span>
                <h1 className="text-2xl font-black tracking-tight text-white leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  Dress better. Live stylish.
                </h1>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-100 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              Your personal AI stylist. Effortless daily outfits curated directly from the clothes you already own. Swipe or tap below to start.
            </p>

            {/* Value Pills with High Contrast */}
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/25 shadow-xs">
                🪄 AI Cutouts
              </span>
              <span className="rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/25 shadow-xs">
                ☀️ 21°C Addis Sync
              </span>
              <span className="rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/25 shadow-xs">
                🔒 On-Device Privacy
              </span>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-1 space-y-2">
              <button
                onClick={() => setStep("why")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-white text-xs sm:text-sm font-black shadow-2xl shadow-orange-500/40 active:scale-98 transition-all"
              >
                <span>Explore ፍሬ (Firie)</span>
                <span className="text-base font-bold">→</span>
              </button>

              <button
                onClick={() => {
                  localStorage.setItem("fitly_onboarded", "1");
                  onDone("Biruk", "Addis Ababa", "", "men");
                  navigate("/", { replace: true });
                }}
                className="h-8 w-full text-[11px] font-extrabold text-white/90 hover:text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-colors"
              >
                Skip to app as Guest ›
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: WHY CHOOSE US SCREEN ── */}
        {step === "why" && (
          <div className="rounded-3xl bg-black/40 backdrop-blur-xl p-5 border border-white/20 shadow-2xl text-left space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  ● THE ፍሬ (FIRIE) ADVANTAGE
                </span>
                <h2 className="mt-0.5 text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  Why Choose ፍሬ (Firie)?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setStep("welcome")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 border border-white/20 text-sm font-bold text-white shadow-xs active:scale-90 transition-transform"
                title="Go back"
              >
                ‹
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5 rounded-2xl bg-black/40 backdrop-blur-md p-2.5 border border-white/20">
                <span className="text-base">🪄</span>
                <div>
                  <h3 className="text-xs font-black text-white">Instant AI Garment Cutouts</h3>
                  <p className="text-[10px] text-slate-200">Auto-isolates clothes into boutique flat-lays</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl bg-black/40 backdrop-blur-md p-2.5 border border-white/20">
                <span className="text-base">🎨</span>
                <div>
                  <h3 className="text-xs font-black text-white">12-Hue Color Harmony Science</h3>
                  <p className="text-[10px] text-slate-200">Color wheel rules for guaranteed outfit cohesion</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl bg-black/40 backdrop-blur-md p-2.5 border border-white/20">
                <span className="text-base">📍</span>
                <div>
                  <h3 className="text-xs font-black text-white">Addis Spots & Weather Sync</h3>
                  <p className="text-[10px] text-slate-200">Venue matches & budgets — included with Pro</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep("how")}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-white text-xs sm:text-sm font-black shadow-2xl shadow-orange-500/40 active:scale-98 transition-all"
            >
              <span>See How It Works</span>
              <span className="text-base font-bold">→</span>
            </button>
          </div>
        )}

        {/* ── STEP 3: HOW IT WORKS SCREEN ── */}
        {step === "how" && (
          <div className="rounded-3xl bg-black/40 backdrop-blur-xl p-5 border border-white/20 shadow-2xl text-left space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  ● SIMPLE 3-STEP ROUTINE
                </span>
                <h2 className="mt-0.5 text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  How ፍሬ Works
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setStep("why")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 border border-white/20 text-sm font-bold text-white shadow-xs active:scale-90 transition-transform"
                title="Go back"
              >
                ‹
              </button>
            </div>

            <div className="space-y-2">
              <div className="rounded-2xl bg-black/40 backdrop-blur-md p-2.5 border border-white/20 flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#FF7F02] text-[10px] font-black text-white">
                  1
                </span>
                <div>
                  <h3 className="text-xs font-black text-white">Snap What You Own</h3>
                  <p className="text-[10px] text-slate-200">Digitize tops, bottoms & sneakers in seconds</p>
                </div>
              </div>

              <div className="rounded-2xl bg-black/40 backdrop-blur-md p-2.5 border border-white/20 flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#FF7F02] text-[10px] font-black text-white">
                  2
                </span>
                <div>
                  <h3 className="text-xs font-black text-white">Get Curated AI Looks</h3>
                  <p className="text-[10px] text-slate-200">One fresh look a day, adapted to live Addis weather</p>
                </div>
              </div>

              <div className="rounded-2xl bg-black/40 backdrop-blur-md p-2.5 border border-white/20 flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#FF7F02] text-[10px] font-black text-white">
                  3
                </span>
                <div>
                  <h3 className="text-xs font-black text-white">Pose with AR Guides</h3>
                  <p className="text-[10px] text-slate-200">Line up with model silhouette overlays</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep("profile")}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-white text-xs sm:text-sm font-black shadow-2xl shadow-orange-500/40 active:scale-98 transition-all"
            >
              <span>Set Up My Profile</span>
              <span className="text-base font-bold">→</span>
            </button>
          </div>
        )}

        {/* ── STEP 4: PROFILE & STYLE SELECTION SCREEN ── */}
        {step === "profile" && (
          <div className="rounded-3xl bg-black/45 backdrop-blur-xl p-5 border border-white/20 shadow-2xl text-left space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  ● TAILOR YOUR STYLE
                </span>
                <h2 className="mt-0.5 text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  Make It Yours
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setStep("how")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 border border-white/20 text-sm font-bold text-white shadow-xs active:scale-90 transition-transform"
                title="Go back"
              >
                ‹
              </button>
            </div>

            <form onSubmit={submit} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-white mb-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    YOUR NAME
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Biruk Fikru"
                    className="w-full rounded-xl border border-white/30 bg-black/40 px-3 py-2 text-xs font-bold text-white placeholder-white/50 outline-none focus:border-white focus:bg-black/60 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-white mb-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    CITY
                  </label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Addis Ababa"
                    className="w-full rounded-xl border border-white/30 bg-black/40 px-3 py-2 text-xs font-bold text-white placeholder-white/50 outline-none focus:border-white focus:bg-black/60 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-white mb-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  EMAIL ADDRESS
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="firieapp@gmail.com"
                  className="w-full rounded-xl border border-white/30 bg-black/40 px-3 py-2 text-xs font-bold text-white placeholder-white/50 outline-none focus:border-white focus:bg-black/60 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-white mb-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  WHO ARE WE STYLING?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender("men")}
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-black border transition-all ${
                      gender === "men"
                        ? "bg-[#FF7F02] text-white border-orange-400 shadow-lg shadow-orange-500/25"
                        : "bg-black/40 text-slate-200 border-white/20"
                    }`}
                  >
                    <span>🧑</span>
                    <span>Men's Fashion</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender("women")}
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-black border transition-all ${
                      gender === "women"
                        ? "bg-[#FF7F02] text-white border-orange-400 shadow-lg shadow-orange-500/25"
                        : "bg-black/40 text-slate-200 border-white/20"
                    }`}
                  >
                    <span>👩</span>
                    <span>Women's Fashion</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-white mb-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  INITIAL STYLE VIBE
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {["Relaxed", "Casual", "Street", "Classy"].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setStylePreference(s)}
                      className={`h-8 rounded-xl text-[10px] font-black border transition-all ${
                        stylePreference === s
                          ? "bg-[#FF7F02] text-white border-orange-400 shadow-md"
                          : "bg-black/40 text-slate-200 border-white/20"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-white text-xs sm:text-sm font-black shadow-2xl shadow-orange-500/40 active:scale-98 transition-all"
              >
                <span>Enter My Wardrobe ✨</span>
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Bottom padding */}
      <div className="pb-4" />
    </div>
  );
}
