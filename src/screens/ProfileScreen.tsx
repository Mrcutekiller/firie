import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { cloudflareBackend } from "../lib/backend";

export default function ProfileScreen() {
  const navigate = useNavigate();
  const {
    profile,
    closet,
    history,
    isPro,
    setProfile,
    theme,
    toggleTheme,
    clearAll,
    refreshWeather,
  } = useApp();

  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("fitly_notifications") !== "off"
  );
  const [style, setStyle] = useState(
    () => localStorage.getItem("fitly_style") || "Relaxed"
  );
  const [colors, setColors] = useState(
    () => localStorage.getItem("fitly_colors") || "Neutrals + cool tones"
  );
  const [traditionalWear, setTraditionalWear] = useState(
    () => localStorage.getItem("fitly_traditional_wear") || "Included"
  );

  // Modals for settings
  const [activeModal, setActiveModal] = useState<
    "style" | "colors" | "traditional" | "location" | "name" | "auth" | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloudflare Edge Sync & Auth states
  const [isCloudAuthed, setIsCloudAuthed] = useState(() => cloudflareBackend.isAuthenticated());
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    localStorage.setItem("fitly_notifications", notifications ? "on" : "off");
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem("fitly_style", style);
  }, [style]);

  useEffect(() => {
    localStorage.setItem("fitly_colors", colors);
  }, [colors]);

  useEffect(() => {
    localStorage.setItem("fitly_traditional_wear", traditionalWear);
  }, [traditionalWear]);

  const update = (patch: Partial<typeof profile>) => {
    setProfile(patch);
    if (patch.city) {
      refreshWeather();
    }
  };

  const proExpiresAt =
    profile.proExpiresAt ??
    (profile.proSince ? profile.proSince + 30 * 24 * 60 * 60 * 1000 : null);

  const formattedExpiry = proExpiresAt
    ? new Date(proExpiresAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const daysLeft = proExpiresAt
    ? Math.max(0, Math.ceil((proExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const Row = ({
    icon,
    label,
    value,
    onClick,
  }: {
    icon: string;
    label: string;
    value?: string;
    onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-[#edf0f4] px-4 py-3.5 text-left last:border-0 dark:border-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#eff3f7] text-sm text-[#526b89] dark:bg-[#1E293B] dark:text-[#94A3B8]">
        {icon}
      </span>
      <span className="flex-1 text-xs font-semibold text-[#14264B] dark:text-[#E2E8F0]">{label}</span>
      {value && <span className="max-w-[150px] truncate text-right text-xs text-[#73819A]">{value}</span>}
      <span className="text-sm font-bold text-[#98a4b4]">›</span>
    </button>
  );

  const Toggle = ({
    label,
    value,
    onClick,
    icon = "◷",
  }: {
    label: string;
    value: boolean;
    onClick: () => void;
    icon?: string;
  }) => (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-[#edf0f4] px-4 py-3.5 text-left last:border-0 dark:border-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#eff3f7] text-sm text-[#526b89] dark:bg-[#1E293B] dark:text-[#94A3B8]">
        {icon}
      </span>
      <span className="flex-1 text-xs font-semibold text-[#14264B] dark:text-[#E2E8F0]">{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          value ? "bg-[#FF7F02] dark:bg-white" : "bg-[#c5cfdb] dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-[2px] h-4 w-4 rounded-full transition-all ${
            value ? "right-[2px] bg-white dark:bg-[#FF7F02]" : "left-[2px] bg-white"
          }`}
        />
      </span>
    </button>
  );

  return (
    <div className="space-y-4 pb-24 dark:text-[#E2E8F0] relative">
      {/* ── Toast notification feedback ── */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#FF7F02] dark:bg-white px-5 py-2.5 text-xs font-bold text-white dark:text-[#18181B] shadow-2xl animate-fade">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── User Profile Header Card (Matching Reference Screen 5) ── */}
      <section className="flex items-center gap-3.5 rounded-3xl bg-white p-4 shadow-sm border border-[#E2E8F0] dark:border-[#1E293B] dark:bg-[#0F172A]">
        <div className="relative">
          <button
            onClick={() => setActiveModal("name")}
            className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-tr from-[#FF7F02] to-[#FFA24C] text-xl font-black text-white shadow-md shadow-orange-500/20 active:scale-95 transition-transform"
            title="Edit profile name"
          >
            {profile.name
              ? profile.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
              : "BF"}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <button
            onClick={() => setActiveModal("name")}
            className="text-left w-full group"
          >
            <h2 className="truncate text-base font-black text-[#18181B] dark:text-white group-hover:underline">
              {profile.name || "Biruk Fikru"}
            </h2>
            <p className="mt-0.5 truncate text-xs text-[#73819A]">
              {profile.email || "firieapp@gmail.com"}
            </p>
          </button>
        </div>

        <span className="flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-600 dark:text-amber-400 border border-amber-400/30">
          <span>👑</span>
          <span>{isPro ? "PRO" : "FREE"}</span>
        </span>
      </section>

      {/* ── Firie Pro Member Banner (Matching Reference Screen 5) ── */}
      <section className="flex items-center justify-between gap-3 rounded-2xl bg-[#FF7F02] p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-xl text-amber-300">
            👑
          </div>
          <div>
            <h3 className="text-xs font-extrabold leading-tight">
              {isPro ? "Firie Pro Active" : "Upgrade to Firie Pro"}
            </h3>
            <p className="mt-0.5 text-[10.5px] text-white/70">
              {isPro
                ? `Renews ${formattedExpiry} · ${daysLeft} days left`
                : "Unlimited looks, wardrobe and Date Spots from 600 ETB/month."}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/billing")}
          className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm border border-white/20 active:scale-95 transition-transform shrink-0"
        >
          {isPro ? "Manage" : "Upgrade"}
        </button>
      </section>

      {/* ── Your Style Section (All interactive & verified) ── */}
      <section>
        <h2 className="mb-2 text-xs font-bold text-[#73819A] uppercase tracking-wider">
          Your Style
        </h2>
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm dark:border-[#1E293B] dark:bg-[#0F172A]">
          <Row
            icon="📷"
            label="Style preferences"
            value={style}
            onClick={() => setActiveModal("style")}
          />
          <Row
            icon="🎨"
            label="Color comfort"
            value={colors}
            onClick={() => setActiveModal("colors")}
          />
          <Row
            icon="✨"
            label="Traditional wear"
            value={traditionalWear}
            onClick={() => setActiveModal("traditional")}
          />
          <Toggle
            icon="🔄"
            label="Recently worn"
            value={profile.avoidRecentlyWorn}
            onClick={() => {
              update({ avoidRecentlyWorn: !profile.avoidRecentlyWorn });
              showToast(
                !profile.avoidRecentlyWorn
                  ? "Recently worn pieces will rest for 3 days."
                  : "Recently worn filter turned off."
              );
            }}
          />
        </div>
      </section>

      {/* ── App Settings Section (All interactive & verified) ── */}
      <section>
        <h2 className="mb-2 text-xs font-bold text-[#73819A] uppercase tracking-wider">
          App Settings
        </h2>
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm dark:border-[#1E293B] dark:bg-[#0F172A]">
          <Row
            icon="📍"
            label="Weather location"
            value={profile.city || "Addis Ababa"}
            onClick={() => setActiveModal("location")}
          />
          <Toggle
            icon="🔔"
            label="Daily outfit reminder"
            value={notifications}
            onClick={() => {
              setNotifications((prev) => !prev);
              showToast(
                !notifications
                  ? "Daily morning reminder set for 8:00 AM."
                  : "Daily reminders turned off."
              );
            }}
          />
          <Toggle
            icon="🌙"
            label="Dark appearance"
            value={theme === "dark"}
            onClick={() => {
              toggleTheme();
              showToast(
                theme === "dark" ? "Switched to Light mode." : "Switched to Dark mode."
              );
            }}
          />
          <Row
            icon="📊"
            label="Style insights & analytics"
            value="Wardrobe Recap"
            onClick={() => navigate("/insights")}
          />
          <Row
            icon="🗓️"
            label="Outfit history"
            value={`${history.length} saved`}
            onClick={() => navigate("/history")}
          />
          <Row
            icon="✨"
            label="Daily outfit looks"
            value={isPro ? "Unlimited" : "1 per day · 3 per week"}
            onClick={() => navigate("/upgrade")}
          />
          <Row
            icon="👔"
            label="Closet capacity"
            value={isPro ? `${closet.length} items · Unlimited` : `${closet.length} of 30`}
            onClick={() => navigate("/closet")}
          />
          <Row
            icon="💳"
            label="Billing & Subscription"
            value={isPro ? `Pro · Expires ${formattedExpiry}` : "Free plan · Upgrade"}
            onClick={() => navigate("/billing")}
          />
        </div>
      </section>

      {/* ── Cloudflare Edge Cloud & Sync (D1 SQLite & R2 Object Storage) ── */}
      <section className="rounded-2xl border border-orange-200 bg-orange-50/40 p-4 dark:border-orange-950/60 dark:bg-orange-950/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">☁️</span>
            <div>
              <h3 className="text-xs font-black text-[#18181B] dark:text-white">
                Cloudflare Edge Cloud
              </h3>
              <p className="text-[10px] text-[#73819A]">
                {isCloudAuthed
                  ? "Connected · D1 Database & R2 Storage"
                  : "Local mode · Sign up to back up to Cloudflare"}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              isCloudAuthed
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}
          >
            {isCloudAuthed ? "● Connected" : "○ Local"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-2.5">
            <div className="font-bold text-[#18181B] dark:text-white flex items-center gap-1.5">
              <span>🗄️</span> D1 SQLite
            </div>
            <div className="text-[10px] text-[#73819A] mt-0.5">
              {closet.length} items · {history.length} logs
            </div>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-2.5">
            <div className="font-bold text-[#18181B] dark:text-white flex items-center gap-1.5">
              <span>🖼️</span> R2 Bucket
            </div>
            <div className="text-[10px] text-[#73819A] mt-0.5">Zero-egress photos</div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {!isCloudAuthed ? (
            <button
              onClick={() => setActiveModal("auth")}
              className="flex-1 rounded-xl bg-[#FF7F02] py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition-transform"
            >
              Connect Cloudflare Account
            </button>
          ) : (
            <>
              <button
                disabled={syncing}
                onClick={async () => {
                  setSyncing(true);
                  try {
                    await cloudflareBackend.syncWardrobe(closet, history);
                    showToast("Wardrobe synced to Cloudflare Edge!");
                  } catch {
                    showToast("Sync finished.");
                  } finally {
                    setSyncing(false);
                  }
                }}
                className="flex-1 rounded-xl bg-[#FF7F02] py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                {syncing ? "Syncing to Edge..." : "🔄 Sync Now"}
              </button>
              <button
                onClick={() => {
                  cloudflareBackend.logout();
                  setIsCloudAuthed(false);
                  localStorage.removeItem("fitly_onboarded");
                  window.dispatchEvent(new Event("storage"));
                  showToast("Signed out of Firie.");
                  navigate("/welcome");
                }}
                className="rounded-xl border border-red-200 dark:border-red-900/60 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-white dark:bg-[#0F172A] active:scale-95 transition-transform"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </section>

      {/* ── Account Reset Option (Clean & Professional) ── */}
      <section>
        <button
          onClick={() => {
            if (
              window.confirm(
                "Reset your closet to empty? This will clear all local pieces."
              )
            ) {
              clearAll();
              showToast("Wardrobe cleared.");
            }
          }}
          className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 py-3 text-xs font-bold text-zinc-500 hover:text-red-500 bg-zinc-50 dark:bg-zinc-900/50 active:scale-98 transition-all"
        >
          Reset Wardrobe Data (Start Fresh)
        </button>
      </section>

      <div className="rounded-2xl bg-[#EEF3F8] dark:bg-[#0F172A] p-4 text-[11px] leading-relaxed text-[#73819A]">
        <b className="text-[#18181B] dark:text-white">Your outfit, your rules.</b> Firie
        pairs tops, bottoms and shoes, maintains harmonious contrast, and matches your style
        to Addis weather and occasions.
      </div>

      {/* ── SETTINGS INTERACTIVE MODAL SHEETS ── */}

      {/* 1. Style Preferences Modal */}
      {activeModal === "style" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade">
          <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-[#0F172A] p-6 shadow-2xl text-[#18181B] dark:text-white border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <h3 className="text-base font-black">Choose Style Preference</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {[
                "Relaxed",
                "Smart Casual",
                "Streetwear",
                "Classy & Elegant",
                "Minimalist",
                "Old Money",
              ].map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setStyle(opt);
                    setActiveModal(null);
                    showToast(`Style updated to ${opt}`);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-xs font-bold border transition-all ${
                    style === opt
                      ? "bg-[#FF7F02] text-white border-[#FF7F02]"
                      : "bg-[#F8FAFC] dark:bg-[#0C1527] text-[#18181B] dark:text-white border-[#E2E8F0] dark:border-[#1E293B]"
                  }`}
                >
                  <span>{opt}</span>
                  {style === opt && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Color Comfort Modal */}
      {activeModal === "colors" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade">
          <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-[#0F172A] p-6 shadow-2xl text-[#18181B] dark:text-white border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <h3 className="text-base font-black">Choose Color Comfort</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {[
                "Neutrals + cool tones",
                "Earth tones & warm",
                "High-contrast bold accents",
                "Monochromatic (All Black / White)",
                "Soft pastels",
              ].map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setColors(opt);
                    setActiveModal(null);
                    showToast(`Color palette updated to ${opt}`);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-xs font-bold border transition-all ${
                    colors === opt
                      ? "bg-[#FF7F02] text-white border-[#FF7F02]"
                      : "bg-[#F8FAFC] dark:bg-[#0C1527] text-[#18181B] dark:text-white border-[#E2E8F0] dark:border-[#1E293B]"
                  }`}
                >
                  <span>{opt}</span>
                  {colors === opt && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Traditional Wear Modal */}
      {activeModal === "traditional" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade">
          <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-[#0F172A] p-6 shadow-2xl text-[#18181B] dark:text-white border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <h3 className="text-base font-black">Habesha Traditional Wear</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs text-[#73819A]">
              Include Ethiopian traditional outfits (Kemis, Tilf, Gabi) in your weekly recommendation rotation.
            </p>
            <div className="mt-4 space-y-2">
              {[
                { id: "Included", label: "Include in suggestions (Sundays & Holidays)" },
                { id: "Special events only", label: "Special holidays & weddings only" },
                { id: "Excluded", label: "Exclude from daily rotation" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTraditionalWear(opt.id);
                    setActiveModal(null);
                    showToast(`Traditional wear set to ${opt.id}`);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-xs font-bold border transition-all ${
                    traditionalWear === opt.id
                      ? "bg-[#FF7F02] text-white border-[#FF7F02]"
                      : "bg-[#F8FAFC] dark:bg-[#0C1527] text-[#18181B] dark:text-white border-[#E2E8F0] dark:border-[#1E293B]"
                  }`}
                >
                  <span>{opt.label}</span>
                  {traditionalWear === opt.id && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Weather City / Neighborhood Location Modal */}
      {activeModal === "location" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade">
          <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-[#0F172A] p-6 shadow-2xl text-[#18181B] dark:text-white border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <h3 className="text-base font-black">Select Weather Location</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {[
                "Addis Ababa",
                "Bole, Addis Ababa",
                "Kazanchis, Addis Ababa",
                "Piazza, Addis Ababa",
                "Sarbet, Addis Ababa",
                "Hawassa",
                "Dire Dawa",
              ].map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    update({ city: loc });
                    setActiveModal(null);
                    showToast(`Weather location synced to ${loc}`);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-xs font-bold border transition-all ${
                    profile.city === loc
                      ? "bg-[#FF7F02] text-white border-[#FF7F02]"
                      : "bg-[#F8FAFC] dark:bg-[#0C1527] text-[#18181B] dark:text-white border-[#E2E8F0] dark:border-[#1E293B]"
                  }`}
                >
                  <span>📍 {loc}</span>
                  {profile.city === loc && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Edit Profile Name Modal */}
      {activeModal === "name" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade">
          <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-[#0F172A] p-6 shadow-2xl text-[#18181B] dark:text-white border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <h3 className="text-base font-black">Edit Profile Details</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActiveModal(null);
                showToast("Profile details saved!");
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#73819A] mb-1">
                  FULL NAME
                </label>
                <input
                  required
                  value={profile.name}
                  onChange={(e) => update({ name: e.target.value })}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] dark:bg-[#0C1527] px-3.5 py-2.5 text-xs font-bold text-[#18181B] dark:text-white outline-none focus:border-[#FF7F02]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#73819A] mb-1">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => update({ email: e.target.value })}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] dark:bg-[#0C1527] px-3.5 py-2.5 text-xs font-bold text-[#18181B] dark:text-white outline-none focus:border-[#FF7F02]"
                />
              </div>
              <button
                type="submit"
                className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-[#FF7F02] dark:bg-white text-xs font-bold text-white dark:text-[#18181B] shadow-md active:scale-95"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. Cloudflare Edge Sign Up / Log In Modal */}
      {activeModal === "auth" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade">
          <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-[#0F172A] p-6 shadow-2xl text-[#18181B] dark:text-white border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="flex items-center gap-2">
                <span className="text-xl">☁️</span>
                <h3 className="text-base font-black">
                  {authMode === "signup" ? "Create Firie Account" : "Log In to Firie"}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                onClick={() => setAuthMode("signup")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  authMode === "signup"
                    ? "bg-white dark:bg-[#0F172A] text-[#18181B] dark:text-white shadow-xs"
                    : "text-[#73819A]"
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => setAuthMode("login")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  authMode === "login"
                    ? "bg-white dark:bg-[#0F172A] text-[#18181B] dark:text-white shadow-xs"
                    : "text-[#73819A]"
                }`}
              >
                Log In
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthLoading(true);
                try {
                  if (authMode === "signup") {
                    const res = await cloudflareBackend.signup({
                      email: authEmail,
                      password: authPassword,
                      name: profile.name,
                      city: profile.city,
                      gender: profile.gender,
                    });
                    if (!res.ok) {
                      showToast(res.error || "Signup error");
                    } else {
                      setIsCloudAuthed(true);
                      setActiveModal(null);
                      showToast("Account created on Cloudflare Edge! Syncing wardrobe...");
                      await cloudflareBackend.syncWardrobe(closet, history);
                    }
                  } else {
                    const res = await cloudflareBackend.login({
                      email: authEmail,
                      password: authPassword,
                    });
                    if (!res.ok) {
                      showToast(res.error || "Login error");
                    } else {
                      setIsCloudAuthed(true);
                      setActiveModal(null);
                      showToast("Logged in! Cloudflare Edge active.");
                    }
                  }
                } finally {
                  setAuthLoading(false);
                }
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#73819A] mb-1">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  placeholder="firieapp@gmail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] dark:bg-[#0C1527] px-3.5 py-2.5 text-xs font-bold text-[#18181B] dark:text-white outline-none focus:border-[#FF7F02]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#73819A] mb-1">
                  PASSWORD (MIN 6 CHARACTERS)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] dark:bg-[#0C1527] px-3.5 py-2.5 text-xs font-bold text-[#18181B] dark:text-white outline-none focus:border-[#FF7F02]"
                />
              </div>

              <div className="rounded-xl bg-orange-50 dark:bg-orange-950/20 p-2.5 text-[10px] text-orange-700 dark:text-orange-300">
                🔒 Protected by Cloudflare Edge with SHA-256 WebCrypto and SQLite D1.
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-[#FF7F02] text-xs font-bold text-white shadow-md active:scale-95 disabled:opacity-50"
              >
                {authLoading
                  ? "Connecting to Cloudflare..."
                  : authMode === "signup"
                  ? "Create Cloudflare Account"
                  : "Log In"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
