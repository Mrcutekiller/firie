import { useState, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { cloudflareBackend } from "../lib/backend";

interface Props {
  onDone: (
    name: string,
    city: string,
    email: string,
    gender: "men" | "women",
    extra?: {
      height?: string;
      bodyFit?: string;
      ageGroup?: string;
      preferredStyle?: string;
      traditionalWear?: string;
    }
  ) => void;
  initialMode?: "signup" | "login";
}

type AuthMode = "signup" | "login";

export default function OnboardingScreen({ onDone, initialMode = "signup" }: Props) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Step 1: Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Name & Gender
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"men" | "women">("men");

  // Step 3: Height & Build Proportions
  const [height, setHeight] = useState("175 cm (5'9\")");
  const [bodyFit, setBodyFit] = useState("Athletic Build");

  // Step 4: Age & Neighborhood
  const [ageGroup, setAgeGroup] = useState("25–34");
  const [city, setCity] = useState("Addis Ababa (Bole)");

  // Step 5: Style & Traditional Wear
  const [preferredStyle, setPreferredStyle] = useState("Smart Casual");
  const [traditionalWear, setTraditionalWear] = useState("Include in weekly rotations");

  // Log In state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Video reference
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!email.trim() || !email.includes("@")) {
        setErrorMsg("Please enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
      }
    } else if (step === 2) {
      if (!name.trim()) {
        setErrorMsg("Please enter your name.");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinishSignup = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Attempt Cloudflare Edge account creation
      const res = await cloudflareBackend.signup({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim() || "Fashion Explorer",
        city: city.trim(),
        gender,
      });

      if (!res.ok) {
        // Fallback gracefully to offline local mode if edge is not yet reachable
        console.warn("Cloudflare Edge signup notice:", res.error);
      }

      // 2. Persist local storage keys
      localStorage.setItem("fitly_style", preferredStyle);
      localStorage.setItem("fitly_colors", "Neutrals + warm earth");
      localStorage.setItem("fitly_traditional_wear", traditionalWear);
      localStorage.setItem("fitly_account_email", email.trim().toLowerCase());
      localStorage.setItem("fitly_onboarded", "1");

      onDone(name.trim() || "Fashion Explorer", city.trim(), email.trim().toLowerCase(), gender, {
        height,
        bodyFit,
        ageGroup,
        preferredStyle,
        traditionalWear,
      });

      navigate("/", { replace: true });
    } catch {
      onDone(name.trim() || "Fashion Explorer", city.trim(), email.trim().toLowerCase(), gender);
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      if (!loginEmail.trim() || !loginPassword) {
        setErrorMsg("Please enter both email and password.");
        return;
      }

      const res = await cloudflareBackend.login({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });

      if (!res.ok) {
        setErrorMsg(res.error || "Invalid email or password.");
        return;
      }

      localStorage.setItem("fitly_account_email", loginEmail.trim().toLowerCase());
      localStorage.setItem("fitly_onboarded", "1");

      const user = res.user || {};
      onDone(
        user.name || "Fashion Explorer",
        user.city || "Addis Ababa",
        loginEmail.trim().toLowerCase(),
        user.gender || "men"
      );
      navigate("/", { replace: true });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to connect to Cloudflare Edge.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white font-sans select-none flex flex-col justify-between">
      {/* ── Background Video: Page 9 (Intelligent Proportions & Styling) ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          ref={videoRef}
          src="/videos/page-9.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover object-center opacity-70 transition-all duration-700"
        />
        {/* Dark readability overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/70" />
      </div>

      {/* Top Header & Brand */}
      <header className="relative z-10 pt-10 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg border border-orange-200">
            <BrandLogo size={28} rounded="rounded-lg" />
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-white leading-none">
              ፍሬ <span className="text-[#FF7F02] text-sm">(Firie)</span>
            </span>
            <p className="text-[9px] font-bold text-orange-200 tracking-wider uppercase">
              Addis Ababa · 2026
            </p>
          </div>
        </div>

        {/* Mode Toggle Pill */}
        <div className="flex rounded-full bg-white/10 p-1 backdrop-blur-md border border-white/20">
          <button
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
            }}
            className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
              mode === "signup"
                ? "bg-[#FF7F02] text-white shadow-md"
                : "text-white/70 hover:text-white"
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
            }}
            className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
              mode === "login"
                ? "bg-[#FF7F02] text-white shadow-md"
                : "text-white/70 hover:text-white"
            }`}
          >
            Log In
          </button>
        </div>
      </header>

      {/* ── Main Dynamic Card: Log In vs Multi-step Sign Up ── */}
      <main className="relative z-10 mx-auto w-full max-w-md px-5 py-6 my-auto">
        {mode === "login" ? (
          /* ================================================================= */
          /* LOG IN FORM                                                       */
          /* ================================================================= */
          <div className="rounded-3xl bg-black/60 backdrop-blur-xl p-6 border border-white/20 shadow-2xl space-y-4 animate-fade">
            <div>
              <span className="inline-block rounded-full bg-[#FF7F02]/30 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-orange-300 border border-orange-400/30">
                WELCOME BACK
              </span>
              <h2 className="text-2xl font-black text-white mt-1">Log in to your closet</h2>
              <p className="text-xs text-slate-300 mt-1">
                Access your synced wardrobe, saved looks, and daily styling recommendations.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-red-500/20 border border-red-500/40 p-2.5 text-xs text-red-200 font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-3 text-sm font-semibold text-white placeholder-white/40 outline-none focus:border-[#FF7F02] focus:bg-white/15"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  PASSWORD
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-3 text-sm font-semibold text-white placeholder-white/40 outline-none focus:border-[#FF7F02] focus:bg-white/15"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#FF7F02] to-[#FF9E3B] text-sm font-black text-white shadow-lg shadow-orange-500/30 border border-white/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                {loading ? "Logging in..." : "Log In to ፍሬ (Firie)"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMsg(null);
                  }}
                  className="text-xs text-orange-300 font-bold hover:underline"
                >
                  Don't have an account? Sign up here
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ================================================================= */
          /* MULTI-STEP SIGN UP QUESTIONNAIRE (1 or 2 Questions per Page)      */
          /* ================================================================= */
          <div className="rounded-3xl bg-black/60 backdrop-blur-xl p-6 border border-white/20 shadow-2xl space-y-4 animate-fade">
            {/* Step Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-orange-300 uppercase tracking-wider">
                  Step {step} of {totalSteps}
                </span>
                <span className="text-white/60">
                  {step === 1 && "Account Essentials"}
                  {step === 2 && "Identity & Wardrobe"}
                  {step === 3 && "Body & Proportions"}
                  {step === 4 && "Age & Climate"}
                  {step === 5 && "Style & Heritage"}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF7F02] to-[#FFA24C] transition-all duration-300"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-red-500/20 border border-red-500/40 p-2 text-xs text-red-200 font-medium">
                {errorMsg}
              </div>
            )}

            {/* ── STEP 1: Account Essentials ── */}
            {step === 1 && (
              <div className="space-y-3.5 animate-fade">
                <div>
                  <h3 className="text-xl font-black text-white">Create your styling account</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Your wardrobe is encrypted and securely synced across your devices.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    1. EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-white placeholder-white/40 outline-none focus:border-[#FF7F02] focus:bg-white/15"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    2. PASSWORD (MIN 6 CHARACTERS)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-white placeholder-white/40 outline-none focus:border-[#FF7F02] focus:bg-white/15"
                  />
                </div>
              </div>
            )}

            {/* ── STEP 2: Identity & Wardrobe Category ── */}
            {step === 2 && (
              <div className="space-y-3.5 animate-fade">
                <div>
                  <h3 className="text-xl font-black text-white">Who are we styling today?</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Personalizes your wardrobe silhouette and pose figure.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    1. YOUR NAME OR NICKNAME
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Biruk"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-white placeholder-white/40 outline-none focus:border-[#FF7F02] focus:bg-white/15"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    2. WARDROBE STYLING FOCUS
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender("men")}
                      className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold border transition-all ${
                        gender === "men"
                          ? "bg-[#FF7F02] text-white border-[#FF7F02] shadow-md"
                          : "bg-white/10 text-white/80 border-white/20 hover:bg-white/15"
                      }`}
                    >
                      <span>👔</span>
                      <span>Men's Fashion</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender("women")}
                      className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold border transition-all ${
                        gender === "women"
                          ? "bg-[#FF7F02] text-white border-[#FF7F02] shadow-md"
                          : "bg-white/10 text-white/80 border-white/20 hover:bg-white/15"
                      }`}
                    >
                      <span>👗</span>
                      <span>Women's Fashion</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Body & Proportions ── */}
            {step === 3 && (
              <div className="space-y-3.5 animate-fade">
                <div>
                  <h3 className="text-xl font-black text-white">Body proportions & drape</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Calculates jacket lengths, trouser cuts, and balanced silhouettes.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    1. YOUR HEIGHT
                  </label>
                  <select
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-[#FF7F02]"
                  >
                    <option value="160 cm (5'3&quot;)">160 cm (5'3")</option>
                    <option value="165 cm (5'5&quot;)">165 cm (5'5")</option>
                    <option value="170 cm (5'7&quot;)">170 cm (5'7")</option>
                    <option value="175 cm (5'9&quot;)">175 cm (5'9") - Average</option>
                    <option value="180 cm (5'11&quot;)">180 cm (5'11")</option>
                    <option value="185 cm (6'1&quot;)">185 cm (6'1")</option>
                    <option value="190+ cm (6'3&quot;+)">190+ cm (6'3"+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    2. PREFERRED SILHOUETTE BUILD
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    {[
                      "Slim Fit",
                      "Athletic Build",
                      "Regular Straight",
                      "Relaxed Oversized",
                    ].map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => setBodyFit(fit)}
                        className={`rounded-xl p-2.5 text-center border transition-all ${
                          bodyFit === fit
                            ? "bg-[#FF7F02] text-white border-[#FF7F02] shadow-md"
                            : "bg-white/10 text-white/80 border-white/20 hover:bg-white/15"
                        }`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Age & Climate Location ── */}
            {step === 4 && (
              <div className="space-y-3.5 animate-fade">
                <div>
                  <h3 className="text-xl font-black text-white">Age & weather sync</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Syncs morning temperature and styling maturity to your neighborhood.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    1. AGE GROUP
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                    {["18–24", "25–34", "35–44", "45+"].map((ag) => (
                      <button
                        key={ag}
                        type="button"
                        onClick={() => setAgeGroup(ag)}
                        className={`rounded-xl py-2 text-center border transition-all ${
                          ageGroup === ag
                            ? "bg-[#FF7F02] text-white border-[#FF7F02] shadow-md"
                            : "bg-white/10 text-white/80 border-white/20 hover:bg-white/15"
                        }`}
                      >
                        {ag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    2. PRIMARY CITY / NEIGHBORHOOD
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-[#FF7F02]"
                  >
                    <option value="Addis Ababa (Bole)">Addis Ababa (Bole)</option>
                    <option value="Addis Ababa (Kazanchis)">Addis Ababa (Kazanchis)</option>
                    <option value="Addis Ababa (Piazza)">Addis Ababa (Piazza)</option>
                    <option value="Addis Ababa (Sarbet)">Addis Ababa (Sarbet)</option>
                    <option value="Addis Ababa (Old Airport)">Addis Ababa (Old Airport)</option>
                    <option value="Hawassa">Hawassa</option>
                    <option value="Dire Dawa">Dire Dawa</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── STEP 5: Style Aesthetic & Heritage ── */}
            {step === 5 && (
              <div className="space-y-3.5 animate-fade">
                <div>
                  <h3 className="text-xl font-black text-white">Daily vibe & heritage</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Tell us what you love to wear and how you incorporate Habesha traditional fashion.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    1. PRIMARY DAILY STYLE
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    {[
                      "Casual Streetwear",
                      "Smart Casual",
                      "Minimalist Clean",
                      "Formal Tailored",
                    ].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setPreferredStyle(st)}
                        className={`rounded-xl p-2.5 text-center border transition-all ${
                          preferredStyle === st
                            ? "bg-[#FF7F02] text-white border-[#FF7F02] shadow-md"
                            : "bg-white/10 text-white/80 border-white/20 hover:bg-white/15"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    2. HABESHA TRADITIONAL WEAR
                  </label>
                  <div className="space-y-1.5 text-xs font-bold">
                    {[
                      "Include in weekly rotations",
                      "Reserve for holidays & weddings",
                      "Modern fusion with contemporary wear",
                    ].map((tw) => (
                      <button
                        key={tw}
                        type="button"
                        onClick={() => setTraditionalWear(tw)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 border transition-all ${
                          traditionalWear === tw
                            ? "bg-[#FF7F02] text-white border-[#FF7F02] shadow-md"
                            : "bg-white/10 text-white/80 border-white/20 hover:bg-white/15"
                        }`}
                      >
                        <span>✨ {tw}</span>
                        {traditionalWear === tw && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons for Multi-step */}
            <div className="flex gap-2 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-bold text-white hover:bg-white/15 active:scale-95 transition-all"
                >
                  ← Back
                </button>
              )}

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#FF7F02] to-[#FF9E3B] py-3 text-xs font-black text-white shadow-lg shadow-orange-500/30 border border-white/20 active:scale-95 transition-all"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinishSignup}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#FF7F02] to-[#FFA24C] py-3 text-xs font-black text-white shadow-lg shadow-orange-500/30 border border-white/20 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {loading ? "Creating Your Closet..." : "Finish & Enter Wardrobe ✨"}
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Subtle bottom note */}
      <footer className="relative z-10 pb-6 text-center text-[10px] text-white/50">
        ፍሬ (Firie) Digital Wardrobe Intelligence · Addis Ababa
      </footer>
    </div>
  );
}
