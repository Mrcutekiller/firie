import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GarmentImage from "../components/GarmentImage";
import { cn } from "../components/ui";
import { useApp } from "../lib/store";
import { type ClosetItem, type EventType } from "../lib/types";

type WidgetSize = "small" | "medium" | "large" | "lockscreen";
type WidgetTheme = "navy" | "glass" | "onyx" | "light";

export default function HomeWidgetsScreen() {
  const navigate = useNavigate();
  const {
    currentOutfit,
    itemById,
    weather,
    profile,
    nextOutfit,
    lockOutfit,
    isLocked,
    unlockOutfit,
    generateFor,
  } = useApp();

  const [size, setSize] = useState<WidgetSize>("medium");
  const [widgetTheme, setWidgetTheme] = useState<WidgetTheme>("navy");
  const [deviceOs, setDeviceOs] = useState<"ios" | "android">("ios");
  const [showInstallHelp, setShowInstallHelp] = useState<boolean>(false);
  const [copiedTokens, setCopiedTokens] = useState<boolean>(false);
  const [isQuickStyling, setIsQuickStyling] = useState<boolean>(false);
  const [inWidgetToast, setInWidgetToast] = useState<string | null>(null);
  const [widgetOccasion, setWidgetOccasion] = useState<EventType>("none");
  const [showCodeSpec, setShowCodeSpec] = useState<boolean>(false);

  const items = (currentOutfit?.itemIds ?? []).map(itemById).filter((i): i is ClosetItem => Boolean(i));
  const top = items.find((i) => i.slot === "top");
  const bottom = items.find((i) => i.slot === "bottom");
  const shoes = items.find((i) => i.slot === "shoes");

  const themeStyles = {
    navy: "bg-[#FF7F02]/95 text-white border-white/15 backdrop-blur-xl",
    glass: "bg-white/30 dark:bg-black/45 text-slate-900 dark:text-white border-white/30 backdrop-blur-2xl shadow-xl",
    onyx: "bg-[#080E1A]/95 text-white border-white/10 backdrop-blur-xl",
    light: "bg-white/95 text-[#18181B] border-slate-200/80 shadow-lg backdrop-blur-xl",
  };

  const handleQuickStyle = (e?: React.MouseEvent, occ?: EventType) => {
    if (e) e.stopPropagation();
    setIsQuickStyling(true);
    if (isLocked) unlockOutfit();

    if (occ) {
      setWidgetOccasion(occ);
      generateFor(occ);
      setInWidgetToast(`⚡ In-Widget Styled for ${occ === "date" ? "Date Night 🍷" : occ === "party" ? "Party 🎉" : "Everyday ☕"}!`);
    } else {
      nextOutfit();
      setInWidgetToast("⚡ In-Widget Quick-Styled! (No App Opening Needed)");
    }

    setTimeout(() => {
      setIsQuickStyling(false);
      setTimeout(() => setInWidgetToast(null), 2400);
    }, 380);
  };

  const handleCopyTokens = () => {
    const spec = {
      app: "ፍሬ (Firie) Mobile",
      widget: `FigCraft Interactive Widget (${size.toUpperCase()})`,
      interactiveIntent: "QuickStyleIntent (Runs in background without app launch)",
      theme: widgetTheme,
      designTokens: {
        cornerRadius: size === "small" ? "22px" : "26px",
        primaryNavy: "#0B1F4B",
        secondaryNavy: "#163568",
        accentEmerald: "#10B981",
        verifiedBlue: "#3B82F6",
        amberAccent: "#F59E0B",
        fontFamily: "Inter, -apple-system, sans-serif",
      },
      liveData: {
        city: profile.city,
        temp: weather ? `${Math.round(weather.temperatureC)}°C` : "21°C",
        top: top?.name ?? "Olive Jacket",
        bottom: bottom?.name ?? "Beige Pants",
        shoes: shoes?.name ?? "White Sneakers",
        harmonyScore: "94%",
      },
    };
    navigator.clipboard?.writeText(JSON.stringify(spec, null, 2));
    setCopiedTokens(true);
    setTimeout(() => setCopiedTokens(false), 2000);
  };

  return (
    <div className="mx-auto max-w-[430px] pb-12 text-[#102642] dark:text-white transition-colors">
      {/* ── Header ── */}
      <header className="flex h-12 items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 place-items-center rounded-full border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#162744] text-base shadow-xs active:scale-95"
          aria-label="Back"
        >
          ‹
        </button>

        <div className="text-center">
          <h1 className="text-base font-black tracking-tight text-[#18181B] dark:text-white">
            Home Widgets Studio
          </h1>
          <p className="text-[10px] font-medium text-[#73819A]">
            FigCraft Interactive Desktop Widgets
          </p>
        </div>

        <button
          onClick={() => setShowInstallHelp(true)}
          className="grid h-10 w-10 place-items-center rounded-full border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#162744] text-sm font-bold shadow-xs active:scale-95"
          title="How to install widget"
        >
          ℹ
        </button>
      </header>

      {/* ── Size Switcher Tabs ── */}
      <div className="mt-3 flex rounded-2xl bg-[#EAF0F8] dark:bg-[#111C2E] p-1 text-xs font-bold">
        {(["small", "medium", "large", "lockscreen"] as WidgetSize[]).map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={cn(
              "flex-1 rounded-xl py-2 text-center capitalize transition-all",
              size === s
                ? "bg-white dark:bg-[#FF7F02] text-[#18181B] dark:text-white shadow-xs font-black"
                : "text-[#73819A] hover:text-[#18181B]"
            )}
          >
            {s === "small" ? "2×2" : s === "medium" ? "4×2" : s === "large" ? "4×4" : "Lock"}
          </button>
        ))}
      </div>

      {/* ── Theme Switcher ── */}
      <div className="mt-3 flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-[#73819A]">Widget Theme:</span>
        <div className="flex gap-1.5">
          {(["navy", "glass", "onyx", "light"] as WidgetTheme[]).map((t) => (
            <button
              key={t}
              onClick={() => setWidgetTheme(t)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-bold capitalize transition-all border",
                widgetTheme === t
                  ? "bg-[#FF7F02] dark:bg-white text-white dark:text-[#18181B] border-transparent shadow-xs"
                  : "bg-white dark:bg-[#1E293B] text-[#73819A] border-[#E2E8F0] dark:border-[#334155]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Phone Screen Mockup Canvas (FigCraft Canvas) ── */}
      <div className="mt-4 overflow-hidden rounded-[36px] border-[5px] border-[#2C384B] bg-gradient-to-b from-[#1C2C4A] via-[#101D33] to-[#080E1C] p-4 text-white shadow-2xl relative">
        {/* Dynamic Island / Notch */}
        <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-black shadow-md flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-slate-900 border border-slate-800" />
        </div>

        {/* In-Widget Toast Pill (simulating live in-widget background intent result) */}
        {inWidgetToast && (
          <div className="mx-auto mb-2 text-center animate-fade">
            <span className="inline-block rounded-full bg-emerald-500/90 text-white text-[10px] font-black px-3.5 py-1 shadow-lg backdrop-blur-md">
              {inWidgetToast}
            </span>
          </div>
        )}

        {/* Device Status Bar */}
        <div className="flex items-center justify-between px-2 text-[10px] font-semibold text-white/70 mb-3">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* ── Interactive Widget Preview Container ── */}
        <div className="my-2 flex justify-center">
          {/* 1. Small Widget (2x2) */}
          {size === "small" && (
            <div
              className={cn(
                "h-[158px] w-[158px] rounded-[24px] border p-3 flex flex-col justify-between transition-all select-none shadow-xl relative overflow-hidden",
                themeStyles[widgetTheme],
                isQuickStyling && "ring-2 ring-amber-400 scale-[0.98]"
              )}
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="flex items-center gap-1">
                  <span>📍</span>
                  <span className="truncate max-w-[50px]">{profile.city}</span>
                </span>
                {/* Interactive in-widget "Style Me" button */}
                <button
                  onClick={(e) => handleQuickStyle(e)}
                  title="Quick Style Me without opening app"
                  className="flex items-center gap-0.5 rounded-full bg-amber-400/25 px-2 py-0.5 text-[8.5px] font-black text-amber-300 border border-amber-300/40 active:scale-90 transition-transform"
                >
                  <span>✨</span>
                  <span>Style</span>
                </button>
              </div>

              {/* Garment miniatures */}
              <div className="relative flex flex-1 items-center justify-center py-1">
                {top && (
                  <div className="absolute left-1 top-1 h-14 w-14 transition-all">
                    <GarmentImage
                      src={top.imageUrl}
                      alt={top.name}
                      slot={top.slot}
                      colorHex={top.colorHex}
                      transparent
                      className="max-h-full max-w-full object-contain drop-shadow-md"
                    />
                  </div>
                )}
                {bottom && (
                  <div className="absolute right-1 bottom-1 h-16 w-12 transition-all">
                    <GarmentImage
                      src={bottom.imageUrl}
                      alt={bottom.name}
                      slot={bottom.slot}
                      colorHex={bottom.colorHex}
                      transparent
                      className="max-h-full max-w-full object-contain drop-shadow-md"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[9px] font-bold pt-1 border-t border-white/10">
                <span className="truncate max-w-[85px]">{top?.name || "Outfit"}</span>
                <span className="text-emerald-400">94%</span>
              </div>
            </div>
          )}

          {/* 2. Medium Widget (4x2) */}
          {size === "medium" && (
            <div
              className={cn(
                "h-[164px] w-full max-w-[340px] rounded-[26px] border p-3.5 flex flex-col justify-between transition-all select-none shadow-xl relative overflow-hidden",
                themeStyles[widgetTheme],
                isQuickStyling && "ring-2 ring-amber-400 scale-[0.98]"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[10.5px] font-bold opacity-90">
                    <span>{weather?.icon || "☀️"}</span>
                    <span>{profile.city} · {weather ? `${Math.round(weather.temperatureC)}°C` : "21°C"}</span>
                  </div>
                  <h3 className="mt-1 text-xs font-black tracking-tight leading-tight capitalize truncate max-w-[170px]">
                    {top && bottom ? `${top.color} & ${bottom.color}` : "Today's Curated Look"}
                  </h3>
                </div>

                {/* Direct "✨ Quick Style Me" Action Pill inside widget */}
                <button
                  onClick={(e) => handleQuickStyle(e)}
                  className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-[#18181B] px-3 py-1 text-[9.5px] font-black shadow-md active:scale-95 transition-transform"
                >
                  <span>✨</span>
                  <span>Quick Style Me</span>
                </button>
              </div>

              {/* In-Widget Occasion Filter Chips */}
              <div className="flex items-center gap-1.5 pt-1">
                {(["none", "date", "party"] as EventType[]).map((occ) => (
                  <button
                    key={occ}
                    onClick={(e) => handleQuickStyle(e, occ)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[8.5px] font-bold transition-all border",
                      widgetOccasion === occ
                        ? "bg-white text-[#18181B] border-white font-black"
                        : "bg-white/10 hover:bg-white/20 text-white/80 border-white/10"
                    )}
                  >
                    {occ === "none" ? "Everyday" : occ === "date" ? "🍷 Date" : "🎉 Party"}
                  </button>
                ))}
              </div>

              {/* Bottom Garment Spread & Wear Toggle */}
              <div className="flex items-center justify-between border-t border-white/10 pt-2">
                <div className="flex items-center gap-2">
                  {top && (
                    <div className="h-9 w-9">
                      <GarmentImage
                        src={top.imageUrl}
                        alt={top.name}
                        slot={top.slot}
                        colorHex={top.colorHex}
                        transparent
                        className="max-h-full max-w-full object-contain drop-shadow-sm"
                      />
                    </div>
                  )}
                  {bottom && (
                    <div className="h-9 w-9">
                      <GarmentImage
                        src={bottom.imageUrl}
                        alt={bottom.name}
                        slot={bottom.slot}
                        colorHex={bottom.colorHex}
                        transparent
                        className="max-h-full max-w-full object-contain drop-shadow-sm"
                      />
                    </div>
                  )}
                  {shoes && (
                    <div className="h-7 w-12">
                      <GarmentImage
                        src={shoes.imageUrl}
                        alt={shoes.name}
                        slot={shoes.slot}
                        colorHex={shoes.colorHex}
                        transparent
                        className="max-h-full max-w-full object-contain drop-shadow-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] font-black text-emerald-400">94%</span>
                  <button
                    onClick={() => {
                      if (currentOutfit) {
                        isLocked ? unlockOutfit() : lockOutfit(currentOutfit);
                      }
                    }}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[9px] font-bold active:scale-95 transition-transform",
                      isLocked ? "bg-emerald-500 text-white" : "bg-white/20 hover:bg-white/30 text-white"
                    )}
                  >
                    {isLocked ? "✓ Worn" : "Wear"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Large Widget (4x4) */}
          {size === "large" && (
            <div
              className={cn(
                "h-[320px] w-full max-w-[340px] rounded-[28px] border p-4 flex flex-col justify-between transition-all select-none shadow-xl relative overflow-hidden",
                themeStyles[widgetTheme],
                isQuickStyling && "ring-2 ring-amber-400 scale-[0.98]"
              )}
            >
              {/* Header with Quick Style Me */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-wider text-[#3B82F6]">ፍሬ (Firie)</span>
                  <span className="text-[10px] opacity-75">· {profile.city}</span>
                </div>
                <button
                  onClick={(e) => handleQuickStyle(e)}
                  className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-[#18181B] px-3 py-1 text-[9.5px] font-black shadow-md active:scale-95 transition-transform"
                >
                  <span>✨ Quick Style Me</span>
                </button>
              </div>

              {/* Garment Studio Center Canvas */}
              <div className="relative flex-1 w-full my-2">
                {top && (
                  <div className="absolute left-4 top-2 h-28 w-24 z-[2]">
                    <GarmentImage
                      src={top.imageUrl}
                      alt={top.name}
                      slot={top.slot}
                      colorHex={top.colorHex}
                      transparent
                      className="max-h-full max-w-full object-contain drop-shadow-lg"
                    />
                  </div>
                )}
                {bottom && (
                  <div className="absolute right-4 top-10 h-32 w-22 z-[3]">
                    <GarmentImage
                      src={bottom.imageUrl}
                      alt={bottom.name}
                      slot={bottom.slot}
                      colorHex={bottom.colorHex}
                      transparent
                      className="max-h-full max-w-full object-contain drop-shadow-lg"
                    />
                  </div>
                )}
                {shoes && (
                  <div className="absolute left-1/2 bottom-1 -translate-x-1/2 h-14 w-28 z-[4]">
                    <GarmentImage
                      src={shoes.imageUrl}
                      alt={shoes.name}
                      slot={shoes.slot}
                      colorHex={shoes.colorHex}
                      transparent
                      className="max-h-full max-w-full object-contain drop-shadow-md"
                    />
                  </div>
                )}
              </div>

              {/* Bottom Piece Badges & In-Widget Occasion switcher */}
              <div className="border-t border-white/10 pt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="truncate text-[10px] font-black capitalize max-w-[200px]">
                    {top?.name || "Jacket"} + {bottom?.name || "Trousers"}
                  </p>
                  <span className="text-[9.5px] font-black text-emerald-400">✨ 94% Match</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {(["none", "date", "party"] as EventType[]).map((occ) => (
                      <button
                        key={occ}
                        onClick={(e) => handleQuickStyle(e, occ)}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[8.5px] font-bold transition-all border",
                          widgetOccasion === occ
                            ? "bg-white text-[#18181B] border-white font-black"
                            : "bg-white/10 text-white/80 border-white/10"
                        )}
                      >
                        {occ === "none" ? "Everyday" : occ === "date" ? "🍷 Date" : "🎉 Party"}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate("/camera")}
                    className="rounded-full bg-white/20 hover:bg-white/30 px-2.5 py-0.5 text-[9px] font-bold shrink-0 active:scale-95 transition-transform"
                  >
                    📸 Pose
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. Lock Screen Widget */}
          {size === "lockscreen" && (
            <div className="w-full max-w-[310px] space-y-2 py-4">
              <button
                onClick={(e) => handleQuickStyle(e)}
                className="w-full mx-auto rounded-full bg-white/15 backdrop-blur-md px-4 py-2 flex items-center justify-between text-xs font-bold border border-white/20 active:scale-98 transition-transform"
              >
                <span className="flex items-center gap-1.5">
                  <span>📍</span>
                  <span>{profile.city} {weather ? `${Math.round(weather.temperatureC)}°` : "21°"}</span>
                </span>
                <span className="text-amber-300 flex items-center gap-1">
                  <span>✨ Quick Style</span>
                </span>
              </button>
              <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3 text-center border border-white/15">
                <p className="text-[11px] font-bold">
                  {top?.name || "Olive Jacket"} · {bottom?.name || "Beige Pants"}
                </p>
                <p className="text-[9.5px] text-white/70 mt-0.5">
                  Tap to quick-shuffle without opening app
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dummy Home Screen Apps Strip */}
        <div className="mt-4 grid grid-cols-4 gap-3 px-3 text-center text-[9px] font-semibold text-white/70">
          <div className="flex flex-col items-center gap-1">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white text-base shadow-sm">
              F
            </div>
            <span>ፍሬ (Firie)</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-500 text-white text-base shadow-sm">
              📷
            </div>
            <span>Photos</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-white text-base shadow-sm">
              🗺️
            </div>
            <span>Maps</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500 text-white text-base shadow-sm">
              ⚙️
            </div>
            <span>Settings</span>
          </div>
        </div>
      </div>

      {/* ── FigCraft Action Controls ── */}
      <div className="mt-5 space-y-2.5">
        <button
          onClick={(e) => handleQuickStyle(e)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#18181B] text-xs font-black shadow-md transition-transform active:scale-95"
        >
          <span>✨ Test "Quick Style Me" (Simulate in-widget run)</span>
        </button>

        <button
          onClick={() => setShowInstallHelp(true)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] dark:bg-white text-xs font-bold text-white dark:text-[#18181B] shadow-md transition-transform active:scale-95"
        >
          <span>📲 How to Add Widget to Home Screen</span>
        </button>

        <button
          onClick={() => setShowCodeSpec(!showCodeSpec)}
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-xs font-bold text-[#18181B] dark:text-white shadow-xs transition-transform active:scale-95"
        >
          <span>{showCodeSpec ? "Hide In-Widget Architecture" : "⚡ How It Works Without Opening the App"}</span>
        </button>

        <button
          onClick={handleCopyTokens}
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0C1527] text-[11px] font-bold text-[#73819A] hover:text-[#18181B] active:scale-95"
        >
          <span>{copiedTokens ? "✓ Copied to Clipboard!" : "📋 Copy FigCraft Design Spec & Tokens"}</span>
        </button>
      </div>

      {/* ── Architecture & Native Technical Details Accordion ── */}
      {showCodeSpec && (
        <div className="mt-4 rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-5 shadow-sm space-y-3 text-xs leading-relaxed animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h3 className="font-black text-[#18181B] dark:text-white">
                In-Widget Interactive Execution
              </h3>
              <p className="text-[10.5px] text-[#73819A]">
                Runs in the background without launching the ፍሬ (Firie) app
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
            <div className="rounded-2xl bg-[#F8FAFC] dark:bg-[#111C2E] p-3 border border-[#E2E8F0] dark:border-[#334155]">
              <b className="block text-[11px] text-[#18181B] dark:text-white mb-1">
                 Apple iOS 17 & 18 (WidgetKit + AppIntent)
              </b>
              <p className="text-[10.5px] text-[#64748B] dark:text-[#94A3B8]">
                Uses Apple's <code>AppIntent</code> protocol. Tapping the <b>"Quick Style Me"</b> button invokes <code>QuickStyleIntent: AppIntent</code> in a lightweight background process. It queries the local wardrobe cache, computes the color harmony score, and returns an updated <code>TimelineView</code> directly to the home screen without opening the app.
              </p>
            </div>

            <div className="rounded-2xl bg-[#F8FAFC] dark:bg-[#111C2E] p-3 border border-[#E2E8F0] dark:border-[#334155]">
              <b className="block text-[11px] text-[#18181B] dark:text-white mb-1">
                🤖 Google Android 12, 14 & 15 (Jetpack Glance)
              </b>
              <p className="text-[10.5px] text-[#64748B] dark:text-[#94A3B8]">
                Uses <code>GlanceModifier.clickable(actionRunCallback&lt;QuickStyleCallback&gt;())</code>. The broadcast receiver handles the event in the background, calculates the next look via the offline styling engine, and updates the widget's <code>RemoteViews</code> instantly without starting any activity.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Install Instructions Modal ── */}
      {showInstallHelp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade">
          <div className="w-full max-w-sm rounded-[32px] border border-white/20 bg-white dark:bg-[#0F172A] p-6 shadow-2xl animate-slide-up text-[#18181B] dark:text-white">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-base font-black tracking-tight">Add ፍሬ (Firie) to Home Screen</h3>
              <button
                onClick={() => setShowInstallHelp(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Platform Selector */}
            <div className="mt-1 flex rounded-xl bg-[#F1F5F9] dark:bg-[#1E293B] p-1 text-xs font-bold">
              <button
                onClick={() => setDeviceOs("ios")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-center transition-all",
                  deviceOs === "ios"
                    ? "bg-white dark:bg-[#FF7F02] text-[#18181B] dark:text-white shadow-xs"
                    : "text-[#73819A]"
                )}
              >
                 iOS (iPhone / iPad)
              </button>
              <button
                onClick={() => setDeviceOs("android")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-center transition-all",
                  deviceOs === "android"
                    ? "bg-white dark:bg-[#FF7F02] text-[#18181B] dark:text-white shadow-xs"
                    : "text-[#73819A]"
                )}
              >
                🤖 Android
              </button>
            </div>

            {/* Steps */}
            <div className="mt-4 space-y-3 text-xs text-[#475569] dark:text-[#CBD5E1]">
              {deviceOs === "ios" ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-[10px] font-black text-blue-700 dark:text-blue-300">
                      1
                    </span>
                    <p>Go to your iPhone Home Screen and long-press any empty space until the apps jiggle.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-[10px] font-black text-blue-700 dark:text-blue-300">
                      2
                    </span>
                    <p>Tap the <b>+</b> button in the top corner and search for <b>ፍሬ (Firie)</b>.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-[10px] font-black text-blue-700 dark:text-blue-300">
                      3
                    </span>
                    <p>Select your favorite size (2×2, 4×2, or 4×4) and tap <b>Add Widget</b>.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-100 dark:bg-amber-900/60 text-[10px] font-black text-amber-700 dark:text-amber-300">
                      ✨
                    </span>
                    <p>Tap <b>"Quick Style Me"</b> directly on your Home Screen anytime to get a new look without launching ፍሬ (Firie)!</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                      1
                    </span>
                    <p>Touch and hold an empty space on your Android Home Screen.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                      2
                    </span>
                    <p>Tap <b>Widgets</b> and scroll down to the <b>ፍሬ (Firie)</b> category.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                      3
                    </span>
                    <p>Drag the widget onto your home screen and resize to your preference.</p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowInstallHelp(false)}
              className="mt-6 w-full rounded-2xl bg-[#FF7F02] dark:bg-white text-white dark:text-[#18181B] py-3 text-xs font-bold active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
