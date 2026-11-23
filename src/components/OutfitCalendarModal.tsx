import { useMemo, useState } from "react";
import GarmentImage from "./GarmentImage";
import { cn } from "./ui";
import { useApp } from "../lib/store";
import { EVENT_LABELS, type ClosetItem, type Outfit } from "../lib/types";
import { useNavigate } from "react-router-dom";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenCapsulePlanner: () => void;
}

export default function OutfitCalendarModal({ isOpen, onClose, onOpenCapsulePlanner }: Props) {
  const navigate = useNavigate();
  const { history, currentOutfit, itemById, lockOutfit } = useApp();

  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-based

  const monthName = viewDate.toLocaleDateString("en-US", { month: "long" }).toUpperCase();

  // Navigation handlers
  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDayKey(null);
  };
  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedDayKey(null);
  };

  // Build calendar days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon, etc.

  // Map of YYYY-MM-DD -> OutfitLog | Outfit (for today)
  const dateOutfits = useMemo(() => {
    const map = new Map<string, { itemIds: string[]; event?: string; weather?: string; reason?: string }>();

    for (const h of history) {
      map.set(h.date, {
        itemIds: h.itemIds,
        event: h.event ? EVENT_LABELS[h.event] : "Look",
        weather: h.weatherSummary,
        reason: h.reason,
      });
    }

    // Today's locked outfit
    if (currentOutfit) {
      const today = new Date();
      const todayK = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate()
      ).padStart(2, "0")}`;
      if (!map.has(todayK)) {
        map.set(todayK, {
          itemIds: currentOutfit.itemIds,
          event: currentOutfit.event ? EVENT_LABELS[currentOutfit.event] : "Curated Look",
          reason: currentOutfit.reason,
        });
      }
    }

    return map;
  }, [history, currentOutfit]);

  const todayKeyStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
  }, []);

  // Compute month stats
  const loggedDaysThisMonth = useMemo(() => {
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const k = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (dateOutfits.has(k)) count++;
    }
    return count;
  }, [daysInMonth, year, month, dateOutfits]);

  const activeDayData = selectedDayKey ? dateOutfits.get(selectedDayKey) : null;
  const activeDayPieces = useMemo(() => {
    if (!activeDayData) return [];
    return activeDayData.itemIds.map(itemById).filter((i): i is ClosetItem => Boolean(i));
  }, [activeDayData, itemById]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 animate-fade"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-y-auto rounded-3xl bg-white p-5 text-[#18181B] shadow-2xl dark:bg-[#0B1528] dark:text-white animate-pop no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header Bar matching Reference Image 3 (INDYX) ── */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 dark:border-[#1E293B]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <h2 className="text-base font-black tracking-tight">OUTFIT CALENDAR</h2>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              {loggedDaysThisMonth} looks recorded in {viewDate.toLocaleDateString("en-US", { month: "short" })}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenCapsulePlanner}
              className="flex items-center gap-1 rounded-full bg-[#FF7F02] px-3 py-1.5 text-[10.5px] font-bold text-white shadow-sm dark:bg-white dark:text-[#18181B] transition-transform active:scale-95"
            >
              <span>🧳 Trip Capsule</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-xs font-bold text-[#64748B] hover:bg-[#E2E8F0] dark:bg-[#1E293B] dark:text-[#94A3B8]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Month Selector with < Month Year > (Image 3 Style) ── */}
        <div className="mt-3 flex items-center justify-between px-2">
          <button
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-sm font-bold text-[#18181B] hover:bg-[#E2E8F0] dark:bg-[#152238] dark:text-white active:scale-90"
            aria-label="Previous month"
          >
            ‹
          </button>
          <div className="text-center">
            <span className="text-sm font-black tracking-wider text-[#18181B] dark:text-white">
              {monthName} {year}
            </span>
          </div>
          <button
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-sm font-bold text-[#18181B] hover:bg-[#E2E8F0] dark:bg-[#152238] dark:text-white active:scale-90"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {/* ── Day of Week Header Row ── */}
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] border-b border-[#F1F5F9] dark:border-[#1E293B] pb-1.5">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="uppercase tracking-tight">
              {day}
            </div>
          ))}
        </div>

        {/* ── Month Days Grid (INDYX Visual Calendar) ── */}
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {/* Empty cells before month day 1 */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-[68px] rounded-xl bg-transparent" />
          ))}

          {/* Month Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const outfit = dateOutfits.get(key);
            const isToday = key === todayKeyStr;
            const isSelected = selectedDayKey === key;

            const pieces = outfit ? outfit.itemIds.map(itemById).filter((p): p is ClosetItem => Boolean(p)) : [];

            return (
              <button
                key={key}
                onClick={() => setSelectedDayKey(key)}
                className={cn(
                  "relative flex h-[72px] flex-col justify-between rounded-xl border p-1 text-left transition-all active:scale-95 overflow-hidden",
                  isSelected
                    ? "border-[#FF7F02] ring-2 ring-[#0B1F4B] bg-[#F1F5FB] dark:border-white dark:ring-white dark:bg-[#1E2E4B]"
                    : outfit
                    ? "border-[#E2E8F0] bg-white shadow-sm hover:border-[#CBD5E1] dark:border-[#1E293B] dark:bg-[#101D33]"
                    : "border-dashed border-[#E2E8F0] bg-[#FAFBFD] dark:border-[#1E293B]/60 dark:bg-[#0B1322]/50 hover:bg-white"
                )}
              >
                {/* Day Number and Today indicator */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[9.5px] font-black",
                      isToday
                        ? "rounded-full bg-[#FF7F02] px-1 text-white dark:bg-white dark:text-[#18181B]"
                        : "text-[#64748B] dark:text-[#94A3B8]"
                    )}
                  >
                    {dayNum}
                  </span>
                  {outfit && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm" />
                  )}
                </div>

                {/* Garment Preview Silhouette stack inside day cell */}
                {outfit && pieces.length > 0 ? (
                  <div className="relative mt-0.5 flex h-[48px] w-full items-center justify-center">
                    <div className="flex items-center -space-x-2">
                      {pieces.slice(0, 3).map((piece, pIdx) => (
                        <div
                          key={piece.id}
                          className="h-8 w-8 rounded-lg bg-white/90 dark:bg-[#0B1528] shadow-sm p-0.5 border border-[#E2E8F0]/80 dark:border-white/10 flex items-center justify-center"
                          style={{ zIndex: 3 - pIdx }}
                        >
                          <GarmentImage
                            src={piece.imageUrl}
                            alt={piece.name}
                            slot={piece.slot}
                            colorHex={piece.colorHex}
                            transparent={true}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-[10px] text-[#CBD5E1] dark:text-[#334155]">
                    +
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Selected Day Outfit Drawer / Inspector ── */}
        {selectedDayKey && (
          <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E293B] dark:bg-[#101D33] shadow-sm animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">
                  {new Date(`${selectedDayKey}T00:00:00`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <h4 className="text-xs font-black text-[#18181B] dark:text-white">
                  {activeDayData ? `${activeDayData.event}` : "No Outfit Logged"}
                </h4>
              </div>

              {activeDayData && (
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[9px] font-bold">
                  ✓ Recorded
                </span>
              )}
            </div>

            {activeDayData && activeDayPieces.length > 0 ? (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {activeDayPieces.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col items-center rounded-xl bg-white dark:bg-[#0B1528] p-1.5 shadow-sm border border-[#E2E8F0] dark:border-[#1E293B]"
                    >
                      <div className="h-10 w-10 flex items-center justify-center">
                        <GarmentImage
                          src={p.imageUrl}
                          alt={p.name}
                          slot={p.slot}
                          colorHex={p.colorHex}
                          transparent={true}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <span className="mt-1 truncate text-[9px] font-bold text-center text-[#18181B] dark:text-white w-full">
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>

                {activeDayData.reason && (
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] italic">
                    "{activeDayData.reason}"
                  </p>
                )}

                <div className="mt-2 flex gap-2 pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                  <button
                    onClick={() => {
                      const pseudo: Outfit = {
                        id: `cal-${selectedDayKey}`,
                        itemIds: activeDayData.itemIds,
                        event: "casual-outing",
                        reason: "Re-worn from calendar history.",
                        score: 95,
                        createdAt: Date.now(),
                      };
                      lockOutfit(pseudo);
                      localStorage.setItem("fitly_has_requested_outfit", "true");
                      onClose();
                      navigate("/");
                    }}
                    className="flex-1 rounded-full bg-[#FF7F02] dark:bg-white py-1.5 text-[10px] font-bold text-white dark:text-[#18181B] shadow-sm active:scale-95 transition-transform"
                  >
                    🔒 Wear This Look Today
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      navigate("/camera", { state: { itemIds: activeDayData.itemIds } });
                    }}
                    className="rounded-full border border-[#E2E8F0] dark:border-[#1E293B] px-3.5 py-1.5 text-[10px] font-bold text-[#18181B] dark:text-white"
                  >
                    📷 Camera
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-col items-center justify-center py-2 text-center">
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Plan your outfit ahead for this date.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    navigate("/");
                  }}
                  className="mt-2 rounded-full bg-[#FF7F02] dark:bg-white px-4 py-1.5 text-[10px] font-bold text-white dark:text-[#18181B] shadow-sm"
                >
                  ✨ Curate Outfit for This Day
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
