import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";

function dateKeyFor(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function InsightsScreen() {
  const navigate = useNavigate();
  const { closet, history, currentOutfit, itemById, weather } = useApp();
  const [notice, setNotice] = useState("");

  const weeklyHistory = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const startKey = dateKeyFor(start);
    return history.filter((entry) => entry.date >= startKey);
  }, [history]);

  const mostWorn = useMemo(() => {
    const counts = new Map<string, number>();
    weeklyHistory.flatMap((entry) => entry.itemIds).forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [weeklyHistory]);

  const unwornPieces = useMemo(() => {
    const wornIds = new Set(history.flatMap((h) => h.itemIds));
    return closet.filter((item) => !wornIds.has(item.id));
  }, [closet, history]);

  const confidence = currentOutfit
    ? currentOutfit.score >= 85
      ? "High Style Harmony"
      : currentOutfit.score >= 70
        ? "Balanced Modern Fit"
        : "Creative Statement Look"
    : "Your curated look will appear here";

  const confidenceBody = currentOutfit
    ? currentOutfit.score >= 85
      ? "Colors and proportions are perfectly aligned with optimal neutral balance."
      : currentOutfit.score >= 70
        ? "The pieces complement each other naturally. High versatility throughout the day."
        : "Bold contrast with standout personality."
    : "Open the Outfits tab to generate today's look.";

  const outfitText = currentOutfit
    ? currentOutfit.itemIds
        .map(itemById)
        .filter(Boolean)
        .map((item) => item?.name)
        .join(" · ") || "Your FITLY look"
    : "No outfit selected yet";

  async function shareLook() {
    const text = `Today's FITLY look: ${outfitText}. Styled with FITLY.`;
    const browserNavigator = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    try {
      if (typeof browserNavigator.share === "function") {
        await browserNavigator.share({ title: "Today's FITLY look", text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setNotice(typeof browserNavigator.share === "function" ? "Ready to share." : "Outfit caption copied.");
    } catch {
      setNotice("Sharing was cancelled.");
    }
    window.setTimeout(() => setNotice(""), 2200);
  }

  return (
    <div className="space-y-4 pb-8 text-[#102642] dark:text-white transition-colors">
      {/* Header */}
      <section className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[1.4px] text-[#73819A]">
            WARDROBE ANALYTICS
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#0B1F4B] dark:text-white">
            Style Insights
          </h1>
        </div>
        <button
          onClick={() => navigate("/widgets")}
          className="flex items-center gap-1.5 rounded-full bg-[#EAF0F8] dark:bg-[#1E293B] px-3.5 py-1.5 text-xs font-bold text-[#0B1F4B] dark:text-white shadow-xs active:scale-95 transition-transform"
        >
          <span>📱</span>
          <span>Home Widgets</span>
        </button>
      </section>

      {/* Hero Analytics Card */}
      <section className="rounded-3xl bg-gradient-to-br from-[#0B1F4B] via-[#163568] to-[#1E437E] p-5 text-white shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[1.4px] text-[#BFD3EA]">
              STYLE HEALTH
            </p>
            <h2 className="mt-1.5 text-xl font-black leading-tight">
              {confidence}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#DCE7F4] max-w-[280px]">
              {confidenceBody}
            </p>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl shadow-inner">
            ✨
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
          <div>
            <p className="text-lg font-black">{weeklyHistory.length}</p>
            <p className="text-[10px] text-white/70">Looks Worn</p>
          </div>
          <div>
            <p className="text-lg font-black">{closet.length}</p>
            <p className="text-[10px] text-white/70">In Rotation</p>
          </div>
          <div>
            <p className="text-lg font-black">{unwornPieces.length}</p>
            <p className="text-[10px] text-white/70">Unworn Pieces</p>
          </div>
        </div>
      </section>

      {/* Rotation Stats Grid */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#73819A]">
            MOST WORN PIECE
          </p>
          <p className="mt-2 text-sm font-black truncate text-[#0B1F4B] dark:text-white">
            {mostWorn ? itemById(mostWorn[0])?.name ?? "Favorite" : "None yet"}
          </p>
          <p className="text-[10px] text-[#73819A] mt-0.5">
            {mostWorn ? `${mostWorn[1]} times this week` : "Log outfits to track"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-4 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#73819A]">
            WEATHER COMFORT
          </p>
          <p className="mt-2 text-sm font-black text-[#0B1F4B] dark:text-white">
            {weather ? `${Math.round(weather.temperatureC)}°C ${weather.condition}` : "Optimal"}
          </p>
          <p className="text-[10px] text-[#73819A] mt-0.5">
            Real-time layer check
          </p>
        </div>
      </section>

      {/* Quick Action Rows */}
      <section className="space-y-2 pt-1">
        <button
          onClick={() => navigate("/widgets")}
          className="flex w-full items-center justify-between rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-3.5 text-left shadow-sm transition-transform active:scale-98"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-lg">
              📱
            </span>
            <div>
              <b className="block text-xs text-[#0B1F4B] dark:text-white">
                FigCraft Home Screen Widgets
              </b>
              <span className="text-[10.5px] text-[#73819A]">
                Customize 4 widget sizes for your home screen.
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-[#73819A]">›</span>
        </button>

        <button
          onClick={shareLook}
          className="flex w-full items-center justify-between rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-3.5 text-left shadow-sm transition-transform active:scale-98"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 dark:bg-purple-950/40 text-lg">
              📤
            </span>
            <div>
              <b className="block text-xs text-[#0B1F4B] dark:text-white">
                Share Today's Look
              </b>
              <span className="text-[10.5px] text-[#73819A]">
                Export caption for Instagram, WhatsApp, or messages.
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-[#73819A]">›</span>
        </button>

        <button
          onClick={() => navigate("/packing")}
          className="flex w-full items-center justify-between rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-3.5 text-left shadow-sm transition-transform active:scale-98"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-lg">
              🧳
            </span>
            <div>
              <b className="block text-xs text-[#0B1F4B] dark:text-white">
                Trip Capsule Wardrobe
              </b>
              <span className="text-[10.5px] text-[#73819A]">
                Generate minimalist pack lists for upcoming trips.
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-[#73819A]">›</span>
        </button>
      </section>

      {notice && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0B1F4B] px-5 py-2 text-xs font-bold text-white shadow-xl animate-fade">
          {notice}
        </div>
      )}
    </div>
  );
}
