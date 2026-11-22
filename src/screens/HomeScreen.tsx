import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GarmentImage from "../components/GarmentImage";
import OutfitCalendarModal from "../components/OutfitCalendarModal";
import TripCapsuleModal from "../components/TripCapsuleModal";
import { cn } from "../components/ui";
import { useApp } from "../lib/store";
import { type ClosetItem, type EventType, type Slot } from "../lib/types";

const SLOT_POSITION_FLATLAY: Record<Slot, string> = {
  cap: "left-[24px] top-4 z-[4] h-[52px] w-[76px] -rotate-6",
  top: "left-[36px] top-[42px] z-[2] h-[176px] w-[165px]",
  bottom: "right-[26px] top-[95px] z-[3] h-[200px] w-[122px] rotate-1",
  shoes: "left-1/2 bottom-[14px] z-[4] h-[64px] w-[170px] -translate-x-1/2 -rotate-2",
  ring: "right-[34px] top-[30px] z-[5] h-[40px] w-[40px] rotate-12",
  accessory: "left-[30px] top-[225px] z-[5] h-[72px] w-[76px] -rotate-3",
};

export default function HomeScreen() {
  const navigate = useNavigate();
  const {
    profile,
    closet,
    outfits,
    outfitIndex,
    currentOutfit,
    isLocked,
    unlockOutfit,
    lockOutfit,
    isOutfitFavorite,
    toggleOutfitFavorite,
    itemById,
    setOutfitIndex,
    weather,
    refreshWeather,
    generateFor,
    confirmOutfit,
    isConfirmedToday,
    theme,
    toggleTheme,
    history,
    loadDemoCloset,
  } = useApp();

  const [selectedOccasion, setSelectedOccasion] = useState<EventType>(() => {
    return (localStorage.getItem("fitly_selected_occasion") as EventType) || "none";
  });
  const [showOccasionModal, setShowOccasionModal] = useState<boolean>(false);
  const [showWeatherModal, setShowWeatherModal] = useState<boolean>(false);
  const [showAdviceModal, setShowAdviceModal] = useState<boolean>(false);
  const [activeItem, setActiveItem] = useState<ClosetItem | null>(null);
  const [lockCelebration, setLockCelebration] = useState<boolean>(false);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [showCapsuleModal, setShowCapsuleModal] = useState<boolean>(false);

  // ── Tinder-Style Outfit Swiper Gesture & Physics State ──
  const [flyState, setFlyState] = useState<"idle" | "fly-left" | "fly-right" | "fly-rewind">("idle");
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [swipeToast, setSwipeToast] = useState<string | null>(null);

  const next = () => {
    if (isLocked) {
      unlockOutfit();
    }
    if (outfits.length > 1) {
      const newIdx = (outfitIndex + 1) % outfits.length;
      setOutfitIndex(newIdx);
      localStorage.setItem("fitly_last_outfit_index", String(newIdx));
    } else {
      generateFor(selectedOccasion);
    }
  };

  const prev = () => {
    if (isLocked) {
      unlockOutfit();
    }
    if (outfits.length > 1) {
      const newIdx = (outfitIndex - 1 + outfits.length) % outfits.length;
      setOutfitIndex(newIdx);
      localStorage.setItem("fitly_last_outfit_index", String(newIdx));
    } else {
      generateFor(selectedOccasion);
    }
  };

  const triggerSwipeLeft = () => {
    if (flyState !== "idle") return;
    if (isLocked) {
      unlockOutfit();
    }
    setFlyState("fly-left");
    setSwipeToast("✕ Passed: Next outfit coming up");
    setTimeout(() => {
      next();
      setFlyState("idle");
      setDragOffset(0);
      setTimeout(() => setSwipeToast(null), 1200);
    }, 260);
  };

  const triggerSwipeRight = () => {
    if (flyState !== "idle") return;
    setFlyState("fly-right");
    setSwipeToast("❤️ Swiped Right: Look locked as worn today!");
    setLockCelebration(true);
    setTimeout(() => {
      if (currentOutfit) {
        confirmOutfit(currentOutfit);
        lockOutfit(currentOutfit);
      }
      setFlyState("idle");
      setDragOffset(0);
      setTimeout(() => {
        setLockCelebration(false);
        setSwipeToast(null);
      }, 2000);
    }, 260);
  };

  const triggerRewind = () => {
    if (flyState !== "idle") return;
    prev();
    setFlyState("fly-rewind");
    setSwipeToast("↺ Rewound to previous look");
    setTimeout(() => {
      setFlyState("idle");
      setTimeout(() => setSwipeToast(null), 1000);
    }, 280);
  };

  const handleDragStart = (clientX: number) => {
    if (flyState !== "idle") return;
    setStartX(clientX);
    setIsDragging(true);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || isLocked || flyState !== "idle") return;
    setDragOffset(clientX - startX);
  };

  const handleDragEnd = () => {
    if (!isDragging || isLocked) return;
    setIsDragging(false);
    if (dragOffset > 70) {
      triggerSwipeRight();
    } else if (dragOffset < -70) {
      triggerSwipeLeft();
    } else {
      setDragOffset(0);
    }
  };

  const todayKeyStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }, []);

  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });

  const isViewingPastDate = selectedDateKey !== todayKeyStr;
  const historyOutfitForSelectedDate = useMemo(() => {
    if (!isViewingPastDate) return null;
    return history.find((h) => h.date === selectedDateKey) ?? null;
  }, [isViewingPastDate, selectedDateKey, history]);

  const items = useMemo(() => {
    if (historyOutfitForSelectedDate) {
      return historyOutfitForSelectedDate.itemIds
        .map(itemById)
        .filter((item): item is ClosetItem => Boolean(item));
    }
    return (currentOutfit?.itemIds ?? []).map(itemById).filter((item): item is ClosetItem => Boolean(item));
  }, [historyOutfitForSelectedDate, currentOutfit, itemById]);
  const top = items.find((item) => item.slot === "top");
  const bottom = items.find((item) => item.slot === "bottom");
  const title =
    top && bottom
      ? `${top.color} top, ${bottom.color.toLowerCase()} bottom`
      : top?.category === "traditional"
        ? "A traditional Habesha look"
        : "A curated look from your closet";

  const isFavorite = currentOutfit ? isOutfitFavorite(currentOutfit.id) : false;
  const dateStr = new Date()
    .toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
    .toLocaleUpperCase();

  const nextOutfit = useMemo(() => {
    if (outfits.length <= 1) return null;
    return outfits[(outfitIndex + 1) % outfits.length] ?? null;
  }, [outfits, outfitIndex]);

  const nextItems = useMemo(() => {
    if (!nextOutfit) return [];
    return nextOutfit.itemIds.map(itemById).filter((item): item is ClosetItem => Boolean(item));
  }, [nextOutfit, itemById]);

  // Card physics & visual transformations for Tinder stacking
  const dragProgress = Math.min(1, Math.abs(dragOffset) / 100);
  const isFlying = flyState === "fly-left" || flyState === "fly-right";
  const bgScale = isFlying ? 1 : 0.93 + dragProgress * 0.07;
  const bgTranslateY = isFlying ? 0 : 12 - dragProgress * 12;
  const bgOpacity = isFlying ? 1 : 0.65 + dragProgress * 0.35;

  const cardTransform = useMemo(() => {
    if (flyState === "fly-right") return "translateX(140%) rotate(24deg)";
    if (flyState === "fly-left") return "translateX(-140%) rotate(-24deg)";
    if (flyState === "fly-rewind") return "translateX(0) rotate(0deg)";
    return `translateX(${dragOffset}px) rotate(${dragOffset * 0.08}deg)`;
  }, [flyState, dragOffset]);

  const cardTransition = useMemo(() => {
    if (isDragging) return "none";
    if (flyState === "fly-left" || flyState === "fly-right") {
      return "transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.26s ease-out";
    }
    if (flyState === "fly-rewind") {
      return "transform 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.28s ease";
    }
    return "transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)";
  }, [isDragging, flyState]);

  const cardOpacity = useMemo(() => {
    if (flyState === "fly-left" || flyState === "fly-right") return 0;
    return 1;
  }, [flyState]);

  // Restore saved outfit browsing index on load if not locked
  useEffect(() => {
    if (!isLocked && outfits.length > 0) {
      const saved = Number(localStorage.getItem("fitly_last_outfit_index"));
      if (Number.isFinite(saved) && saved >= 0 && saved < outfits.length && outfitIndex !== saved) {
        setOutfitIndex(saved);
      }
    }
  }, [outfits.length, isLocked, outfitIndex, setOutfitIndex]);

  const daysOfWeek = useMemo(() => {
    const list = [];
    const base = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const hasHistory = history.some((h) => h.date === key);
      list.push({
        date: d,
        key,
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        isToday: i === 0,
        hasLoggedOutfit: hasHistory || (i === 0 && Boolean(currentOutfit)),
      });
    }
    return list;
  }, [history, currentOutfit]);

  const toggleFavorite = () => {
  if (!currentOutfit) return;
  toggleOutfitFavorite(currentOutfit);
};

const handleSelectOccasion = (occ: EventType) => {
  setSelectedOccasion(occ);
  localStorage.setItem("fitly_selected_occasion", occ);
  localStorage.setItem("fitly_has_requested_outfit", "true");
  setShowOccasionModal(false);
  generateFor(occ);
};

const occasionLabel =
  selectedOccasion === "date"
    ? "Date Night 🍷"
    : selectedOccasion === "party"
      ? "Party 庆祝 🎉"
      : "Normal Day ☕";

return (
    <div className="mx-auto flex min-h-[calc(100dvh-105px)] max-w-[430px] flex-col pb-3 text-[#102642] dark:text-[#f8fafc] transition-colors">
      {/* ── Top Header Bar (Matching Reference Layout) ── */}
      <header className="flex h-12 shrink-0 items-center justify-between px-1">
        {/* Left circular back / rewind action (Matching Reference Image) */}
        <button
          onClick={triggerRewind}
          aria-label="Previous outfit / Rewind"
          title="Previous Outfit / Rewind"
          className="grid h-10 w-10 place-items-center rounded-full border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#162744] text-base text-[#0B1F4B] dark:text-white shadow-sm transition-transform active:scale-95 hover:border-[#CBD5E1]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Center: Title & Subtitle */}
        <div className="text-center">
          <h1 className="text-base font-black tracking-tight text-[#0B1F4B] dark:text-white">
            Outfits You May Like
          </h1>
          <p className="text-[10px] font-medium text-[#73819A] dark:text-[#94A3B8]">
            {dateStr} · {occasionLabel}
          </p>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-1.5">
          {/* Home Widgets Studio (FigCraft) */}
          <button
            onClick={() => navigate("/widgets")}
            aria-label="Home Screen Widgets"
            title="Home Screen Widgets (FigCraft)"
            className="grid h-10 w-10 place-items-center rounded-full border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#162744] text-sm text-[#0B1F4B] dark:text-white shadow-sm transition-transform active:scale-95"
          >
            📱
          </button>

          {/* Occasion filter */}
          <button
            onClick={() => setShowOccasionModal(true)}
            aria-label="Filter occasion"
            title="Choose Occasion"
            className="grid h-10 w-10 place-items-center rounded-full border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#162744] text-sm text-[#0B1F4B] dark:text-white shadow-sm transition-transform active:scale-95"
          >
            🍸
          </button>

          {/* Dark Mode toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#162744] text-sm text-[#0B1F4B] dark:text-white shadow-sm transition-transform active:scale-95"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* ── Compact Date Navigation Strip ── */}
      <div className="no-scrollbar mt-1.5 flex items-center gap-1.5 overflow-x-auto px-1 py-1">
        {daysOfWeek.map((d) => {
          const isSelected = selectedDateKey === d.key;
          return (
            <button
              key={d.key}
              onClick={() => setSelectedDateKey(d.key)}
              className={cn(
                "relative flex h-[46px] min-w-[48px] flex-1 flex-col items-center justify-center rounded-2xl transition-all shadow-xs active:scale-95",
                isSelected
                  ? "bg-[#0B1F4B] dark:bg-white text-white dark:text-[#0B1F4B] shadow-md font-black"
                  : "border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8]"
              )}
            >
              <span className="text-[8.5px] font-bold uppercase tracking-tight opacity-80">{d.dayName}</span>
              <span className="text-[11.5px] font-extrabold">{d.dayNum}</span>
              {d.hasLoggedOutfit && (
                <span
                  className={cn(
                    "absolute bottom-1 h-1 w-1 rounded-full shadow-xs",
                    isSelected ? "bg-white dark:bg-[#0B1F4B]" : "bg-emerald-500"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Viewing Past / Planned Date Banner ── */}
      {isViewingPastDate && (
        <div className="mx-1 mt-2 flex items-center justify-between rounded-2xl bg-[#DCE5F2] dark:bg-[#1E2E4B] px-3.5 py-1.5 text-xs font-bold text-[#0B1F4B] dark:text-white shadow-xs animate-fade">
          <div className="flex items-center gap-2">
            <span>🗓️</span>
            <span className="text-[11px]">
              {historyOutfitForSelectedDate
                ? `Worn on ${new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}`
                : `Plan for ${new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}`}
            </span>
          </div>
          <button
            onClick={() => setSelectedDateKey(todayKeyStr)}
            className="rounded-full bg-white dark:bg-[#0B1F4B] px-2.5 py-0.5 text-[10px] font-black text-[#0B1F4B] dark:text-white shadow-xs active:scale-95"
          >
            Today ›
          </button>
        </div>
      )}

      {/* ── CASE 0: WARDROBE IS EMPTY (1ST OPEN) ── */}
      {closet.length === 0 ? (
        <div className="my-auto flex flex-col items-center justify-center rounded-3xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-7 text-center shadow-lg transition-all mt-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-3xl shadow-inner">
            ✨
          </div>
          <h2 className="mt-4 text-[20px] font-black text-[#0B1F4B] dark:text-white">
            Your Wardrobe Starts Here
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8] max-w-[280px]">
            Snap your real clothes with AI background removal to unlock personalized outfit recommendations.
          </p>

          <div className="mt-6 flex w-full max-w-[260px] flex-col gap-2">
            <button
              onClick={() => navigate("/add")}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0B1F4B] dark:bg-white text-xs font-bold text-white dark:text-[#0B1F4B] shadow-md transition-transform active:scale-95"
            >
              <span>📸 Add Your First Piece</span>
            </button>

            <button
              onClick={loadDemoCloset}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0C1527] text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] hover:text-[#0B1F4B] active:scale-95"
            >
              <span>✨ Load Sample Wardrobe (Test)</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── CASE 1: IMMERSIVE TINDER CARD STACK (Matching Reference Image) ── */
        <div className="mt-2 flex flex-1 flex-col">
          {/* Card Deck Wrapper */}
          <div className="relative flex flex-1 flex-col min-h-[460px] select-none">
            {/* Card 1: Next Outfit Deck Preview Layer (Curved frosted preview peeking behind) */}
            {nextOutfit && nextItems.length > 0 && (
              <div
                style={{
                  transform: `translateY(${bgTranslateY - 8}px) scale(${bgScale})`,
                  opacity: bgOpacity,
                  transition: isDragging
                    ? "none"
                    : "transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.28s ease",
                  willChange: "transform, opacity",
                }}
                className="absolute inset-x-2 -top-1.5 bottom-3 z-[1] overflow-hidden rounded-[32px] border border-white/20 dark:border-white/10 bg-gradient-to-b from-[#E8EEF6] via-[#DDE7F3] to-[#CFDDEE] dark:from-[#11203A] dark:via-[#0E1A30] dark:to-[#0A1324] shadow-lg pointer-events-none"
              >
                {/* Garments of next outfit */}
                {nextItems.map((item) => {
                  const onePiece =
                    item.slot === "top" &&
                    item.category === "traditional" &&
                    /kemis|dress|habesha/i.test(`${item.name} ${item.tags.join(" ")}`);
                  const slotClass = onePiece
                    ? "left-[36px] top-6 z-[2] h-[300px] w-[210px]"
                    : SLOT_POSITION_FLATLAY[item.slot];

                  return (
                    <div
                      key={`next-${item.id}`}
                      className={`absolute flex items-center justify-center pointer-events-none ${slotClass}`}
                    >
                      <GarmentImage
                        src={item.imageUrl}
                        alt={item.name}
                        slot={item.slot}
                        colorHex={item.colorHex}
                        transparent
                        className="max-h-full max-w-full object-contain drop-shadow-[0_10px_12px_rgba(11,31,75,0.18)] scale-[1.02]"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Card 0: Active Foreground Swipeable Tinder Card */}
            <section
              onPointerDown={(e) => {
                try {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                } catch {}
                handleDragStart(e.clientX);
              }}
              onPointerMove={(e) => {
                if (isDragging) handleDragMove(e.clientX);
              }}
              onPointerUp={(e) => {
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                } catch {}
                handleDragEnd();
              }}
              onPointerCancel={(e) => {
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                } catch {}
                handleDragEnd();
              }}
              onTouchStart={(e) => {
                if (e.touches && e.touches[0]) {
                  handleDragStart(e.touches[0].clientX);
                }
              }}
              onTouchMove={(e) => {
                if (e.touches && e.touches[0] && isDragging) {
                  handleDragMove(e.touches[0].clientX);
                }
              }}
              onTouchEnd={() => {
                handleDragEnd();
              }}
              onTouchCancel={() => {
                handleDragEnd();
              }}
              style={{
                transform: cardTransform,
                transition: cardTransition,
                opacity: cardOpacity,
                cursor: isDragging ? "grabbing" : "grab",
                touchAction: "pan-y",
                willChange: "transform, opacity",
              }}
              className="relative z-[2] min-h-[460px] flex-1 overflow-hidden rounded-[32px] border border-white/60 dark:border-white/10 bg-gradient-to-b from-[#FAFBFD] via-[#F4F7FC] to-[#EEF3FA] dark:from-[#0B1527] dark:via-[#091221] dark:to-[#070D18] shadow-2xl transition-shadow select-none flex flex-col justify-between"
              aria-label="Today's outfit swiper card"
            >
              {/* Dynamic Swipe Stamp: WEAR THIS (Swipe Right) */}
              {(dragOffset > 15 || flyState === "fly-right") && (
                <div
                  style={{
                    opacity: flyState === "fly-right" ? 1 : Math.min(1, Math.max(0, (dragOffset - 15) / 50)),
                    transform: `rotate(-14deg) scale(${1 + Math.min(0.2, Math.max(0, dragOffset - 15) / 200)})`,
                  }}
                  className="pointer-events-none absolute left-6 top-16 z-30 rounded-2xl border-[3.5px] border-emerald-500 bg-emerald-500/20 px-4 py-1.5 text-lg font-black tracking-widest text-emerald-600 dark:text-emerald-400 shadow-2xl backdrop-blur-xs transition-opacity"
                >
                  WEAR THIS ✓
                </div>
              )}

              {/* Dynamic Swipe Stamp: PASS (Swipe Left) */}
              {(dragOffset < -15 || flyState === "fly-left") && (
                <div
                  style={{
                    opacity: flyState === "fly-left" ? 1 : Math.min(1, Math.max(0, (Math.abs(dragOffset) - 15) / 50)),
                    transform: `rotate(14deg) scale(${1 + Math.min(0.2, Math.max(0, Math.abs(dragOffset) - 15) / 200)})`,
                  }}
                  className="pointer-events-none absolute right-6 top-16 z-30 rounded-2xl border-[3.5px] border-rose-500 bg-rose-500/20 px-4 py-1.5 text-lg font-black tracking-widest text-rose-600 dark:text-rose-400 shadow-2xl backdrop-blur-xs transition-opacity"
                >
                  PASS ✕
                </div>
              )}

              {/* Top-Left: Match Score Pill Badge */}
              <div className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-[#0B1F4B]/90 backdrop-blur-md px-3 py-1.5 border border-black/5 dark:border-white/10 shadow-sm">
                <span className="text-xs">✨</span>
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                  94% Match
                </span>
              </div>

              {/* Top-Right: Favorite Heart Bookmark */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite();
                }}
                aria-label={isFavorite ? "Remove favorite" : "Save outfit"}
                className={cn(
                  "absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full border shadow-sm active:scale-95 transition-all backdrop-blur-md",
                  isFavorite
                    ? "bg-rose-50 dark:bg-rose-950/60 border-rose-200 text-rose-500 text-base"
                    : "bg-white/90 dark:bg-[#0B1F4B]/90 border-black/5 dark:border-white/10 text-slate-400 text-base"
                )}
              >
                {isFavorite ? "♥" : "♡"}
              </button>

              {/* Garments Canvas Area (Pure Flat-Lay Studio) */}
              <div className="relative flex-1 w-full min-h-[300px]">
                {items.map((item) => {
                  const onePiece =
                    item.slot === "top" &&
                    item.category === "traditional" &&
                    /kemis|dress|habesha/i.test(`${item.name} ${item.tags.join(" ")}`);
                  const slotClass = onePiece
                    ? "left-[36px] top-6 z-[2] h-[300px] w-[210px]"
                    : SLOT_POSITION_FLATLAY[item.slot];

                  return (
                    <button
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveItem(item);
                      }}
                      title={`Inspect ${item.name}`}
                      className={`absolute flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 hover:brightness-105 ${slotClass}`}
                    >
                      <GarmentImage
                        src={item.imageUrl}
                        alt={item.name}
                        slot={item.slot}
                        colorHex={item.colorHex}
                        transparent
                        className="max-h-full max-w-full object-contain drop-shadow-[0_14px_16px_rgba(11,31,75,0.22)] scale-[1.05] transition-all duration-300"
                      />
                    </button>
                  );
                })}
              </div>

              {/* ── Glassmorphic In-Card Bottom Overlay (Matching Reference Design) ── */}
              <div className="relative z-20 w-full rounded-b-[32px] bg-gradient-to-t from-[#0B1F4B]/95 via-[#0B1F4B]/80 to-transparent p-5 pt-12 text-white">
                {/* 1. Location & Weather Indicator */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white/85">
                  <span className="text-amber-300">📍</span>
                  <span>{profile.city}, Ethiopia</span>
                  <span className="opacity-40">·</span>
                  <span>
                    {weather ? `${Math.round(weather.temperatureC)}°C ${weather.condition}` : "21°C Clear"}
                  </span>
                </div>

                {/* 2. Main Title with Blue Verified Checkmark */}
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="text-xl font-black text-white capitalize tracking-tight truncate">
                    {title}
                  </h2>
                  <span
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#3B82F6] text-white text-[10px] font-black shadow-sm"
                    title="FITLY Verified Color Harmony"
                  >
                    ✓
                  </span>
                </div>

                {/* 3. Translucent Category & Garment Pill Tags (Matching Food/Travel/Books in Reference) */}
                <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-0.5">
                  {top && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveItem(top);
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-white/18 hover:bg-white/30 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white border border-white/20 shrink-0 transition-colors"
                    >
                      <span>🧥</span>
                      <span className="truncate max-w-[90px]">{top.name}</span>
                    </button>
                  )}

                  {bottom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveItem(bottom);
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-white/18 hover:bg-white/30 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white border border-white/20 shrink-0 transition-colors"
                    >
                      <span>👖</span>
                      <span className="truncate max-w-[90px]">{bottom.name}</span>
                    </button>
                  )}

                  {items.find((i) => i.slot === "shoes") && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const shoes = items.find((i) => i.slot === "shoes");
                        if (shoes) setActiveItem(shoes);
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-white/18 hover:bg-white/30 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white border border-white/20 shrink-0 transition-colors"
                    >
                      <span>👟</span>
                      <span className="truncate max-w-[90px]">
                        {items.find((i) => i.slot === "shoes")?.name}
                      </span>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 rounded-full bg-white/18 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white border border-white/20 shrink-0">
                    <span>✨</span>
                    <span>{occasionLabel}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ── Floating 3-Button Action Bar (Directly below card, Matching Reference Image) ── */}
          <div className="mx-auto mt-4 mb-2 flex items-center justify-center gap-4 rounded-full bg-[#162744]/90 dark:bg-[#0B1527]/90 px-7 py-2.5 backdrop-blur-xl border border-white/15 dark:border-white/10 shadow-xl max-w-[290px] w-full">
            {/* Button 1: Pass / Swipe Left (✕) */}
            <button
              onClick={triggerSwipeLeft}
              aria-label="Pass / Next Outfit"
              title="Pass / Next Look (Swipe Left)"
              className="grid h-11 w-11 place-items-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Button 2: Wear / Love / Swipe Right (♥) */}
            <button
              onClick={triggerSwipeRight}
              aria-label="Wear / Lock Outfit"
              title="Wear This Look (Swipe Right)"
              className={cn(
                "grid h-12 w-12 place-items-center rounded-full transition-all active:scale-90 shadow-md",
                isConfirmedToday
                  ? "bg-emerald-500 text-white shadow-emerald-500/30"
                  : "bg-white/20 text-white hover:bg-white/30"
              )}
            >
              <span className="text-xl leading-none">♥</span>
            </button>

            {/* Button 3: AI Style Advice / Chat (💬) */}
            <button
              onClick={() => setShowAdviceModal(true)}
              aria-label="AI Styling Advice"
              title="AI Style Rationale & Color Harmony"
              className="grid h-11 w-11 place-items-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="currentColor"
              >
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </button>
          </div>

          {/* Locked / Worn Today Status Pill */}
          {isLocked && (
            <div className="mt-1 flex items-center justify-between rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2 border border-emerald-200 dark:border-emerald-800/40">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span>✓ Worn Today</span>
                <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">· Saved to history</span>
              </span>
              <button
                onClick={unlockOutfit}
                className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 underline active:scale-95"
              >
                Unlock & Browse
              </button>
            </div>
          )}

          {/* Swipe toast feedback */}
          {swipeToast && (
            <div className="mt-1 text-center animate-fade">
              <span className="inline-block rounded-full bg-black/75 px-3 py-1 text-[10.5px] font-bold text-white backdrop-blur-xs">
                {swipeToast}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Lock Celebration Floating Toast ── */}
      {lockCelebration && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#0B1F4B] dark:bg-white px-5 py-2.5 text-xs font-bold text-white dark:text-[#0B1F4B] shadow-2xl animate-bounce">
          <span>✨</span>
          <span>Look locked in! Enjoy your style today.</span>
        </div>
      )}

      {/* ── AI Styling Advice Bottom Sheet Modal (Triggered by 💬) ── */}
      {showAdviceModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade">
          <div className="w-full max-w-sm rounded-[32px] border border-white/20 bg-white dark:bg-[#0F172A] p-6 shadow-2xl animate-slide-up text-[#0B1F4B] dark:text-white">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <div>
                  <h3 className="text-base font-black">AI Style Breakdown</h3>
                  <p className="text-[10.5px] text-[#64748B] dark:text-[#94A3B8]">
                    94% Harmony Score · {occasionLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdviceModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* AI Explanation Box */}
            <div className="mt-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] p-4 text-xs">
              <p className="font-bold text-[#0B1F4B] dark:text-white flex items-center gap-1.5 mb-1.5">
                <span>💡</span>
                <span>Why this combination works</span>
              </p>
              <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                {currentOutfit?.reason ||
                  "Balanced neutral contrast between the top and bottom pieces, engineered to flatter proportion and complement the current weather."}
              </p>
            </div>

            {/* Garment details list */}
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                Pieces in this look
              </p>
              <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between rounded-xl bg-[#F1F5F9] dark:bg-[#111C2E] px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {it.slot === "top" ? "🧥" : it.slot === "bottom" ? "👖" : "👟"}
                      </span>
                      <span className="font-bold">{it.name}</span>
                    </div>
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] capitalize">
                      {it.color} · {it.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  if (currentOutfit) {
                    confirmOutfit(currentOutfit);
                    lockOutfit(currentOutfit);
                    setLockCelebration(true);
                    setTimeout(() => setLockCelebration(false), 2500);
                  }
                  setShowAdviceModal(false);
                }}
                className="flex-1 rounded-2xl bg-[#0B1F4B] dark:bg-white text-white dark:text-[#0B1F4B] py-3 text-xs font-bold active:scale-95 shadow-md"
              >
                ✓ Wear This Look
              </button>
              <button
                onClick={() => setShowAdviceModal(false)}
                className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] px-5 py-3 text-xs font-bold active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Weather & Daily Styling Advisory Sheet ── */}
      {showWeatherModal && weather && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade">
          <div className="w-full max-w-sm rounded-[32px] border border-white/20 bg-white dark:bg-[#0F172A] p-6 shadow-2xl animate-slide-up text-[#0B1F4B] dark:text-white">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{weather.icon}</span>
                <div>
                  <h3 className="text-base font-black">{profile.city} Weather</h3>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    {Math.round(weather.temperatureC)}°C · {weather.condition}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWeatherModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-[#F1F5F9] dark:bg-[#1E293B] p-4 text-xs">
              <p className="font-bold text-[#0B1F4B] dark:text-white flex items-center gap-1.5 mb-1">
                <span>💡</span>
                <span>FITLY Styling Advice</span>
              </p>
              <p className="text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                {weather.temperatureC >= 22
                  ? "Warm & clear. Opt for breathable fabrics, short sleeves, or light linen pants. Keep sun accessories like sunglasses handy."
                  : weather.temperatureC >= 15
                  ? "Mild day. Great for layering — pair a crewneck tee with a light overshirt or chore jacket so you can adapt as temperature shifts."
                  : "Crisp conditions. Heavy layering advised — wear your warmest coat, knitwear, and closed-toe leather boots or sneakers."}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  refreshWeather();
                  setShowWeatherModal(false);
                }}
                className="flex-1 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] py-3 text-xs font-bold active:scale-95"
              >
                ↻ Refresh Weather
              </button>
              <button
                onClick={() => setShowWeatherModal(false)}
                className="flex-1 rounded-2xl bg-[#0B1F4B] dark:bg-white text-white dark:text-[#0B1F4B] py-3 text-xs font-bold active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Garment Quick Inspector Modal ── */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade">
          <div className="w-full max-w-sm rounded-[32px] border border-white/20 bg-white dark:bg-[#0F172A] p-6 shadow-2xl animate-slide-up text-[#0B1F4B] dark:text-white">
            <div className="flex items-center justify-between pb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                {activeItem.slot} · {activeItem.category}
              </span>
              <button
                onClick={() => setActiveItem(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] p-2 border border-[#E2E8F0] dark:border-[#334155]">
                <GarmentImage
                  src={activeItem.imageUrl}
                  alt={activeItem.name}
                  slot={activeItem.slot}
                  colorHex={activeItem.colorHex}
                  transparent
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-base font-black leading-tight">{activeItem.name}</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  {activeItem.color} · {activeItem.category}
                </p>
                {activeItem.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {activeItem.tags.slice(0, 3).map((t, idx) => (
                      <span key={idx} className="rounded-md bg-[#E2E8F0] dark:bg-[#334155] px-1.5 py-0.5 text-[9px] font-bold">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setActiveItem(null);
                  navigate("/closet");
                }}
                className="flex-1 rounded-2xl bg-[#0B1F4B] dark:bg-white text-white dark:text-[#0B1F4B] py-3 text-xs font-bold active:scale-95"
              >
                Open in Closet 👗
              </button>
              <button
                onClick={() => setActiveItem(null)}
                className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] px-5 py-3 text-xs font-bold active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Occasion Selector Modal / Bottom Sheet ── */}
      {showOccasionModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade">
          <div className="w-full max-w-sm rounded-[32px] border border-white/20 bg-white dark:bg-[#0F172A] p-6 shadow-2xl animate-slide-up text-[#0B1F4B] dark:text-white">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-lg font-black tracking-tight">What's the occasion?</h3>
              <button
                onClick={() => setShowOccasionModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              FITLY curates the best color match, style, and footwear for this event.
            </p>

            {/* Options */}
            <div className="mt-4 space-y-2.5">
              {/* Option 1: Date */}
              <button
                onClick={() => handleSelectOccasion("date")}
                className="flex w-full items-center gap-3.5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B]/60 p-3.5 text-left transition-all hover:border-[#0B1F4B] dark:hover:border-white hover:scale-[1.01]"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FEF2F2] dark:bg-[#451A22] text-xl">
                  🍷
                </div>
                <div>
                  <h4 className="text-sm font-bold">Date Night / Romantic</h4>
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                    Refined, high-contrast, polished shoes & accessories
                  </p>
                </div>
              </button>

              {/* Option 2: Normal Day */}
              <button
                onClick={() => handleSelectOccasion("none")}
                className="flex w-full items-center gap-3.5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B]/60 p-3.5 text-left transition-all hover:border-[#0B1F4B] dark:hover:border-white hover:scale-[1.01]"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F0FDF4] dark:bg-[#064E3B] text-xl">
                  ☕
                </div>
                <div>
                  <h4 className="text-sm font-bold">Normal Day / Everyday</h4>
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                    Effortless casual comfort, versatile neutrals, all-day ease
                  </p>
                </div>
              </button>

              {/* Option 3: Party */}
              <button
                onClick={() => handleSelectOccasion("party")}
                className="flex w-full items-center gap-3.5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B]/60 p-3.5 text-left transition-all hover:border-[#0B1F4B] dark:hover:border-white hover:scale-[1.01]"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFFBEB] dark:bg-[#78350F] text-xl">
                  🎉
                </div>
                <div>
                  <h4 className="text-sm font-bold">Party / Celebration</h4>
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                    Bold statement styling, standout silhouettes & flair
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Month Outfit Calendar Modal (INDYX Visual Calendar) ── */}
      <OutfitCalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        onOpenCapsulePlanner={() => {
          setShowCalendarModal(false);
          setShowCapsuleModal(true);
        }}
      />

      {/* ── Trip Capsule Wardrobe Planner Modal ── */}
      <TripCapsuleModal
        isOpen={showCapsuleModal}
        onClose={() => setShowCapsuleModal(false)}
      />
    </div>
  );
}
