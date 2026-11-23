import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { cn } from "../components/ui";

const PRO_PERKS = [
  {
    icon: "👗",
    title: "Unlimited Outfit Looks",
    desc: "Free members get one fresh look a day, up to three a week. Pro generates unlimited outfits, every day.",
  },
  {
    icon: "📸",
    title: "Unlimited Photo Style Camera",
    desc: "Infinite AI pose guides, low-angle alignment, and silhouette guides without daily or weekly caps.",
  },
  {
    icon: "🧥",
    title: "Unlimited Digital Wardrobe",
    desc: "Add hundreds of tops, bottoms, shoes, and traditional Habesha pieces with AI background removal.",
  },
  {
    icon: "🎨",
    title: "Editorial Harmony & Color Science",
    desc: "Unlocks advanced complementary, monochromatic, and contrast color theory scoring.",
  },
  {
    icon: "📍",
    title: "Date Spots — Pro Only",
    desc: "Venue discovery, verified menu prices, budget planning in ETB and an outfit matched to every spot.",
  },
  {
    icon: "✨",
    title: "Cinematic & Studio Filters",
    desc: "Unlock iPhone Cine, Golden Hour, and Studio lighting camera filters.",
  },
];

export default function UpgradeScreen() {
  const navigate = useNavigate();
  const { profile, isPro, upgradeToPro, cancelPro } = useApp();

  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPayment, setSelectedPayment] = useState<"card" | "telebirr" | "cbe">("card");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Expiry Date calculations
  const now = Date.now();
  const proExpiresAt =
    profile.proExpiresAt ??
    (profile.proSince ? profile.proSince + 30 * 24 * 60 * 60 * 1000 : null);

  const formattedExpiry = proExpiresAt
    ? new Date(proExpiresAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const daysRemaining = proExpiresAt
    ? Math.max(0, Math.ceil((proExpiresAt - now) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleUpgrade = (selectedCycle: "monthly" | "yearly") => {
    upgradeToPro(selectedCycle);
    showToast(`🎉 Upgraded to ፍሬ Pro (${selectedCycle === "yearly" ? "Annual" : "Monthly"})!`);
  };

  const handleExtend = () => {
    const extCycle = profile.billingCycle || "monthly";
    upgradeToPro(extCycle);
    showToast(`✓ Subscription extended for another ${extCycle === "yearly" ? "year" : "30 days"}!`);
  };

  const handleCancel = () => {
    cancelPro();
    setShowCancelModal(false);
    showToast("Subscription cancelled. Switched back to Free Tier.");
  };

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[480px] bg-white dark:bg-[#0c0a09] px-5 pb-12 pt-5 text-[#18181B] dark:text-[#E2E8F0] select-none font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#FF7F02] px-5 py-2.5 text-xs font-bold text-white shadow-2xl shadow-orange-500/40 animate-fade">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header ── */}
      <header className="flex items-center justify-between pb-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-[#18181B] border border-orange-100 dark:border-zinc-800 text-lg font-bold text-[#18181B] dark:text-white shadow-xs active:scale-95"
        >
          ‹
        </button>

        <h1 className="text-sm font-extrabold uppercase tracking-wider text-[#18181B] dark:text-white">
          Billing & Subscription
        </h1>

        <button
          onClick={() => showToast("Purchases up-to-date.")}
          className="text-[11px] font-bold text-[#FF7F02] active:scale-95"
        >
          Restore
        </button>
      </header>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* CASE A: PRO MEMBER SUBSCRIPTION MANAGEMENT & BILLING                        */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {isPro ? (
        <div className="space-y-4 animate-fade">
          {/* 1. Active Pro Hero Card */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-[#FF7F02] via-[#FF8A1C] to-[#FFA742] p-6 text-white shadow-xl shadow-orange-500/25">
            <div className="absolute right-0 top-0 -mr-6 -mt-6 h-36 w-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black text-white border border-white/30 backdrop-blur-xs">
                <span>👑</span>
                <span>ፍሬ PRO</span>
              </span>

              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-200 border border-emerald-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                <span>Active</span>
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-tight leading-tight">
              Unlimited Fashion &amp;<br />Photo Styling
            </h2>
            <p className="mt-1 text-xs text-white/90">
              You are on the {profile.billingCycle === "yearly" ? "Annual" : "Monthly"} Pro membership.
            </p>

            {/* Expiry & Days Left Ribbon */}
            <div className="mt-5 rounded-2xl bg-white/15 p-3.5 backdrop-blur-md border border-white/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/80">Next Renewal / Expiry:</span>
                <span className="font-extrabold text-white">{formattedExpiry || "Active"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-white/80">Time Remaining:</span>
                <span className="rounded-full bg-white/30 px-2.5 py-0.5 font-black text-white">
                  {daysRemaining} days left
                </span>
              </div>
            </div>
          </section>

          {/* 2. Billing & Payment Information ("bile") */}
          <section className="rounded-3xl border border-orange-100 dark:border-zinc-800 bg-[#FFFBF7] dark:bg-zinc-900 p-4.5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#FF7F02]">
              Billing Details &amp; Plan
            </h3>

            <div className="flex items-center justify-between border-b border-orange-100 dark:border-zinc-800 pb-3">
              <div>
                <p className="text-xs font-bold text-[#18181B] dark:text-white">Subscription Rate</p>
                <p className="text-[11px] text-[#71717A]">
                  {profile.billingCycle === "yearly" ? "4,320 ETB / year (Save 40%)" : "600 ETB / month"}
                </p>
              </div>
              <button
                onClick={() => handleUpgrade(profile.billingCycle === "yearly" ? "monthly" : "yearly")}
                className="rounded-full bg-orange-50 dark:bg-zinc-800 px-3 py-1 text-[10px] font-bold text-[#FF7F02] active:scale-95 transition-transform"
              >
                Switch to {profile.billingCycle === "yearly" ? "Monthly" : "Annual"}
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-orange-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-orange-100 dark:bg-zinc-800 text-base">
                  💳
                </div>
                <div>
                  <p className="text-xs font-bold text-[#18181B] dark:text-white">Mastercard •••• 4242</p>
                  <p className="text-[10px] text-[#71717A]">Expires 12/28 · Auto-billing</p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="text-[10px] font-bold text-[#FF7F02] hover:underline"
              >
                Change
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#18181B] dark:text-white">Billing Email</p>
                <p className="text-[11px] text-[#71717A] truncate max-w-[200px]">
                  {profile.email || "biruk13r@gmail.com"}
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                ✓ Verified
              </span>
            </div>
          </section>

          {/* 3. Invoices & Receipts ("bile") */}
          <section className="rounded-3xl border border-orange-100 dark:border-zinc-800 bg-[#FFFBF7] dark:bg-zinc-900 p-4.5 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#FF7F02]">
              Billing History &amp; Invoices
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-zinc-800/60 p-3 text-xs border border-orange-50">
                <div>
                  <p className="font-bold text-[#18181B] dark:text-white">Invoice #FIRIE-2026-11</p>
                  <p className="text-[10px] text-[#71717A]">Nov 22, 2026 · Auto-renewed</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-[#18181B] dark:text-white">
                    {profile.billingCycle === "yearly" ? "4,320 ETB" : "600 ETB"}
                  </span>
                  <p className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">Paid ✓</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-zinc-800/60 p-3 text-xs border border-orange-50">
                <div>
                  <p className="font-bold text-[#18181B] dark:text-white">Invoice #FIRIE-2026-10</p>
                  <p className="text-[10px] text-[#71717A]">Oct 22, 2026 · Subscription renewal</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-[#18181B] dark:text-white">600 ETB</span>
                  <p className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">Paid ✓</p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Action Buttons (Extend & Cancel) */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={handleExtend}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-xs font-black text-white shadow-xl shadow-orange-500/25 transition-transform active:scale-98"
            >
              <span>Extend Subscription Now (+{profile.billingCycle === "yearly" ? "1 Year" : "30 Days"})</span>
            </button>

            <button
              onClick={() => setShowCancelModal(true)}
              className="flex h-11 w-full items-center justify-center rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-zinc-900 text-xs font-bold text-rose-500 hover:bg-rose-50/50 active:scale-98 transition-colors"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      ) : (
        /* ────────────────────────────────────────────────────────────────────────── */
        /* CASE B: FREE USER UPGRADE & BILLING PAGE                                   */
        /* ────────────────────────────────────────────────────────────────────────── */
        <div className="space-y-4 animate-fade">
          {/* 1. Hero Upgrade Banner */}
          <section className="rounded-3xl bg-gradient-to-tr from-[#FF7F02] via-[#FF8A1C] to-[#FFA742] p-6 text-white shadow-xl shadow-orange-500/25 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/20 text-2xl text-white shadow-inner">
              👑
            </div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-white/90">
              ፍሬ PRO PASS
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight leading-tight">
              Unlock Your Complete<br />Wardrobe &amp; AI Studio
            </h2>
            <p className="mt-2 text-xs text-white/90 max-w-[280px] mx-auto">
              Unlimited outfit looks, an unlimited wardrobe, the full Photo Style camera toolkit and the complete Date Spots planner.
            </p>
          </section>

          {/* 2. Billing Cycle Switcher */}
          <section className="rounded-3xl border border-orange-100 dark:border-zinc-800 bg-[#FFFBF7] dark:bg-zinc-900 p-4.5 shadow-sm">
            <div className="flex rounded-2xl bg-white dark:bg-zinc-800 p-1 border border-orange-100">
              <button
                onClick={() => setCycle("monthly")}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-xs font-bold transition-all",
                  cycle === "monthly"
                    ? "bg-[#FF7F02] text-white shadow-sm"
                    : "text-[#71717A]"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setCycle("yearly")}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                  cycle === "yearly"
                    ? "bg-[#FF7F02] text-white shadow-sm"
                    : "text-[#71717A]"
                )}
              >
                <span>Yearly</span>
                <span className="rounded-full bg-amber-400 text-black px-2 py-0.5 text-[9px] font-extrabold">
                  Save 40%
                </span>
              </button>
            </div>

            <div className="mt-4 flex items-baseline justify-between border-b border-orange-100 dark:border-zinc-800 pb-3">
              <div>
                <b className="text-sm font-black text-[#18181B] dark:text-white">ፍሬ Pro Plan</b>
                <p className="text-[10px] text-[#71717A]">
                  {cycle === "monthly" ? "Billed 600 ETB/month" : "Billed 4,320 ETB/year (Save 40%)"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#18181B] dark:text-white">
                  {cycle === "monthly" ? "600 ETB" : "360 ETB"}
                </span>
                <span className="text-xs text-[#71717A]">/mo</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="mt-3.5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF7F02]">
                Select Payment Method
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedPayment("card")}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border p-2.5 text-xs font-bold transition-all",
                    selectedPayment === "card"
                      ? "border-[#FF7F02] bg-orange-50 text-[#FF7F02] shadow-xs"
                      : "border-orange-100 bg-white text-[#71717A]"
                  )}
                >
                  <span className="text-base">💳</span>
                  <span className="text-[10px] mt-1">Credit Card</span>
                </button>

                <button
                  onClick={() => setSelectedPayment("telebirr")}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border p-2.5 text-xs font-bold transition-all",
                    selectedPayment === "telebirr"
                      ? "border-[#FF7F02] bg-orange-50 text-[#FF7F02] shadow-xs"
                      : "border-orange-100 bg-white text-[#71717A]"
                  )}
                >
                  <span className="text-base">📱</span>
                  <span className="text-[10px] mt-1">Telebirr</span>
                </button>

                <button
                  onClick={() => setSelectedPayment("cbe")}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border p-2.5 text-xs font-bold transition-all",
                    selectedPayment === "cbe"
                      ? "border-[#FF7F02] bg-orange-50 text-[#FF7F02] shadow-xs"
                      : "border-orange-100 bg-white text-[#71717A]"
                  )}
                >
                  <span className="text-base">🏦</span>
                  <span className="text-[10px] mt-1">CBE Birr</span>
                </button>
              </div>
            </div>
          </section>

          {/* 3. Pro Feature Perks Breakdown */}
          <section className="rounded-3xl border border-orange-100 dark:border-zinc-800 bg-[#FFFBF7] dark:bg-zinc-900 p-4.5 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#FF7F02]">
              What's Included in Pro
            </h3>

            <div className="space-y-3">
              {PRO_PERKS.map((perk) => (
                <div key={perk.title} className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-orange-100 dark:bg-zinc-800 text-base">
                    {perk.icon}
                  </span>
                  <div>
                    <h4 className="text-xs font-extrabold text-[#18181B] dark:text-white">
                      {perk.title}
                    </h4>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#71717A]">
                      {perk.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Upgrade Call to Action Button */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleUpgrade(cycle)}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] hover:bg-[#E57200] text-sm font-black text-white shadow-xl shadow-orange-500/25 transition-transform active:scale-98"
            >
              <span>Unlock ፍሬ Pro · {cycle === "monthly" ? "600 ETB/mo" : "4,320 ETB/yr (40% OFF)"}</span>
              <span>→</span>
            </button>

            <p className="text-center text-[10px] text-[#A1A1AA]">
              Full 7-day money-back guarantee · Cancel anytime with 1 tap.
            </p>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* CANCEL CONFIRMATION MODAL                                                  */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0F172A] p-6 text-center shadow-2xl border border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-2xl text-rose-500">
              ⚠️
            </div>
            <h3 className="mt-4 text-lg font-black text-[#18181B] dark:text-white">
              Cancel Pro Membership?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#71717A]">
              You will lose unlimited outfit looks, photo camera poses, full wardrobe capacity and Date Spots when your current period ends on{" "}
              <b>{formattedExpiry || "the end of this billing cycle"}</b>.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleCancel}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-rose-500 text-xs font-bold text-white shadow-sm active:scale-95"
              >
                Yes, Cancel Subscription
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex h-11 w-full items-center justify-center rounded-xl border border-orange-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-[#18181B] dark:text-white"
              >
                Keep My Pro Benefits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* UPDATE PAYMENT METHOD MODAL                                                */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 text-center shadow-2xl border border-orange-100 dark:border-zinc-800">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-2xl text-[#FF7F02]">
              💳
            </div>
            <h3 className="mt-4 text-base font-black text-[#18181B] dark:text-white">
              Update Payment Method
            </h3>
            <p className="mt-1 text-xs text-[#71717A]">
              Choose your preferred auto-billing payment option.
            </p>

            <div className="mt-4 space-y-2 text-left">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  showToast("Payment method updated to Credit Card.");
                }}
                className="flex w-full items-center justify-between rounded-xl border border-orange-100 dark:border-zinc-800 p-3 text-xs font-bold hover:border-[#FF7F02]"
              >
                <span>💳 Credit / Debit Card (Mastercard / Visa)</span>
                <span>›</span>
              </button>

              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  showToast("Payment method updated to Telebirr.");
                }}
                className="flex w-full items-center justify-between rounded-xl border border-orange-100 dark:border-zinc-800 p-3 text-xs font-bold hover:border-[#FF7F02]"
              >
                <span>📱 Telebirr Mobile Account</span>
                <span>›</span>
              </button>

              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  showToast("Payment method updated to CBE Birr.");
                }}
                className="flex w-full items-center justify-between rounded-xl border border-orange-100 dark:border-zinc-800 p-3 text-xs font-bold hover:border-[#FF7F02]"
              >
                <span>🏦 Commercial Bank of Ethiopia (CBE)</span>
                <span>›</span>
              </button>
            </div>

            <button
              onClick={() => setShowPaymentModal(false)}
              className="mt-4 text-xs font-bold text-[#73819A] hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
