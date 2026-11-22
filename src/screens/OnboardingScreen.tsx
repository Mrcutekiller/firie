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

      {/* ── TOP EDITORIAL APP BAR (No video toggle, clean and minimal) ── */}
      <header className="relative z-20 flex h-14 items-center justify-between px-4 pt-3 max-w-lg mx-auto w-full">
        {step !== "welcome" ? (
          <button
            onClick={() => {
              if (step === "why") setStep("welcome");
              else if (step === "how") setStep("why");
              else if (step === "profile") setStep("how");
            }}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-lg font-bold text-white shadow-md active:scale-90 transition-transform"
          >
            ‹
          </button>
        ) : (
          <div className="w-9" />
        )}

        {/* Center Brand Identity */}
        <div className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md px-3.5 py-1 border border-white/20 shadow-sm">
          <BrandLogo size={22} rounded="rounded-lg" />
          <span className="text-xs font-black tracking-wider text-white">FITLY</span>
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
        </div>

        {/* Swipe Hint Pill */}
        <div className="flex items-center gap-1 text-[10px] font-bold text-white/70 uppercase tracking-wider bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
          <span>Swipe</span>
          <span>⟷</span>
        </div>
      </header>

      {/* ── BOTTOM DOCKED CONTROLS (Appears immediately, video fully visible, swipe enabled) ── */}
      <main className="relative z-10 mx-auto w-full max-w-md px-4 pb-2 mt-auto animate-fade">
        {/* ── STEP 1: WELCOME SCREEN ── */}
        {step === "welcome" && (
          <div className="rounded-3xl bg-black/40 backdrop-blur-xl p-5 border border-white/20 shadow-2xl text-left space-y-3.5">
            {/* Prominent Large App Logo */}
            <div className="flex items-center gap-3.5">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xl p-2 border border-white/80">
                <BrandLogo size={52} rounded="rounded-xl" />
                <span className="absolute -bottom-1 -right-1 rounded-full bg-[#0B1F4B] text-white p-0.5 text-[9px] shadow-md border border-white/20">
                  ✨
                </span>
              </div>
              <div>
                <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-300 border border-white/15">
                  ● PERSONAL AI WARDROBE
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
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[#0B1F4B] text-xs sm:text-sm font-black shadow-2xl hover:bg-slate-100 active:scale-98 transition-all"
              >
                <span>Explore FITLY</span>
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
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                ● THE FITLY ADVANTAGE
              </span>
              <h2 className="mt-0.5 text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                Why Choose FITLY?
              </h2>
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
                  <p className="text-[10px] text-slate-200">Curated looks for local cafes, rooftops & dinners</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep("how")}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[#0B1F4B] text-xs sm:text-sm font-black shadow-2xl hover:bg-slate-100 active:scale-98 transition-all"
            >
              <span>See How It Works</span>
              <span className="text-base font-bold">→</span>
            </button>
          </div>
        )}

        {/* ── STEP 3: HOW IT WORKS SCREEN ── */}
        {step === "how" && (
          <div className="rounded-3xl bg-black/40 backdrop-blur-xl p-5 border border-white/20 shadow-2xl text-left space-y-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                ● SIMPLE 3-STEP ROUTINE
              </span>
              <h2 className="mt-0.5 text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                How FITLY Works
              </h2>
            </div>

            <div className="space-y-2">
              <div className="rounded-2xl bg-black/40 backdrop-blur-md p-2.5 border border-white/20 flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400 text-[10px] font-black text-black">
                  1
                </span>
                <div>
                  <h3 className="text-xs font-black text-white">Snap What You Own</h3>
                  <p className="text-[10px] text-slate-200">Digitize tops, bottoms & sneakers in seconds</p>
                </div>
              </div>

              <div className="rounded-2xl bg-black/40 backdrop-blur-md p-2.5 border border-white/20 flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-400 text-[10px] font-black text-black">
                  2
                </span>
                <div>
                  <h3 className="text-xs font-black text-white">Get Curated AI Looks</h3>
                  <p className="text-[10px] text-slate-200">Daily flat-lays adapted to live Addis weather</p>
                </div>
              </div>

              <div className="rounded-2xl bg-black/40 backdrop-blur-md p-2.5 border border-white/20 flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400 text-[10px] font-black text-black">
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
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[#0B1F4B] text-xs sm:text-sm font-black shadow-2xl hover:bg-slate-100 active:scale-98 transition-all"
            >
              <span>Set Up My Profile</span>
              <span className="text-base font-bold">→</span>
            </button>
          </div>
        )}

        {/* ── STEP 4: PROFILE & STYLE SELECTION SCREEN ── */}
        {step === "profile" && (
          <div className="rounded-3xl bg-black/45 backdrop-blur-xl p-5 border border-white/20 shadow-2xl text-left space-y-2.5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                ● TAILOR YOUR STYLE
              </span>
              <h2 className="mt-0.5 text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                Make It Yours
              </h2>
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
                  placeholder="biruk13r@gmail.com"
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
                        ? "bg-white text-[#0B1F4B] border-white shadow-lg"
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
                        ? "bg-white text-[#0B1F4B] border-white shadow-lg"
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
                          ? "bg-blue-500 text-white border-blue-400 shadow-md"
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
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[#0B1F4B] text-xs sm:text-sm font-black shadow-2xl hover:bg-slate-100 active:scale-98 transition-all"
              >
                <span>Enter My Wardrobe ✨</span>
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ── BOTTOM NAVIGATION & STEP INDICATOR DOCK ── */}
      <footer className="relative z-20 px-4 pb-4 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between rounded-full bg-black/40 backdrop-blur-md px-3.5 py-1.5 border border-white/15 shadow-sm">
          <div className="flex items-center gap-2">
            {(["welcome", "why", "how", "profile"] as Step[]).map((s, idx) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? "w-6 bg-white" : "w-2 bg-white/30 hover:bg-white/60"
                }`}
                title={`Jump to step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="text-[10px] font-mono text-white/80">
            PAGE {Object.keys(STEP_VIDEOS).indexOf(step) + 1} OF 4
          </div>
        </div>
      </footer>
    </div>
  );
}
