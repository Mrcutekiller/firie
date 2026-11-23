import { useMemo, useState } from "react";
import GarmentImage from "./GarmentImage";
import { cn } from "./ui";
import { useApp } from "../lib/store";
import type { ClosetItem, Outfit } from "../lib/types";
import { useNavigate } from "react-router-dom";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DESTINATIONS = [
  { id: "paris", name: "Paris 🇫🇷", weather: "14°C · Cool & Elegant", vibe: "chic" },
  { id: "new-york", name: "New York 🗽", weather: "16°C · City Walking", vibe: "casual" },
  { id: "addis", name: "Addis Ababa 🇪🇹", weather: "22°C · Sunny & Crisp", vibe: "classy" },
  { id: "beach", name: "Coastal Getaway 🏖️", weather: "26°C · Warm & Breeze", vibe: "relaxed" },
  { id: "tokyo", name: "Tokyo 🇯🇵", weather: "15°C · Metropolitan", vibe: "streetwear" },
];

export default function TripCapsuleModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const { closet, lockOutfit } = useApp();

  const [destination, setDestination] = useState(DESTINATIONS[0]);
  const [durationDays, setDurationDays] = useState<3 | 5 | 7>(3);
  const [packedIds, setPackedIds] = useState<Set<string>>(new Set());
  const [selectedOutfitDay, setSelectedOutfitDay] = useState<number>(1);

  // Pick optimal pieces from user's closet
  const capsulePieces = useMemo(() => {
    const tops = closet.filter((i) => i.slot === "top").slice(0, durationDays === 3 ? 2 : 3);
    const bottoms = closet.filter((i) => i.slot === "bottom").slice(0, 2);
    const outerwear = closet
      .filter(
        (i) =>
          i.slot === "top" &&
          (i.tags.some((t) => t.includes("jacket") || t.includes("coat") || t.includes("overshirt") || t.includes("blazer")) ||
            i.name.toLowerCase().includes("coat") ||
            i.name.toLowerCase().includes("jacket"))
      )
      .slice(0, 1);
    const shoes = closet.filter((i) => i.slot === "shoes").slice(0, 2);
    const accessories = closet.filter((i) => i.slot === "accessory" || i.slot === "cap").slice(0, 1);

    const all = [...tops, ...bottoms, ...outerwear, ...shoes, ...accessories];
    return all.filter((item, index, self) => self.findIndex((t) => t.id === item.id) === index);
  }, [closet, durationDays]);

  // Generate day-by-day outfits from the capsule
  const dailyLooks = useMemo(() => {
    const tops = capsulePieces.filter((i) => i.slot === "top");
    const bottoms = capsulePieces.filter((i) => i.slot === "bottom");
    const outerwear = capsulePieces.find(
      (i) =>
        i.tags.some((t) => t.includes("jacket") || t.includes("coat") || t.includes("overshirt") || t.includes("blazer")) ||
        i.name.toLowerCase().includes("coat") ||
        i.name.toLowerCase().includes("jacket")
    );
    const shoes = capsulePieces.filter((i) => i.slot === "shoes");

    const looks: { day: number; title: string; pieces: ClosetItem[]; event: string }[] = [];

    for (let day = 1; day <= durationDays; day++) {
      const top = tops[(day - 1) % tops.length];
      const bottom = bottoms[(day - 1) % bottoms.length];
      const shoe = shoes[(day - 1) % shoes.length];
      const pieces: ClosetItem[] = [];
      if (top) pieces.push(top);
      if (outerwear && day % 2 === 1) pieces.push(outerwear);
      if (bottom) pieces.push(bottom);
      if (shoe) pieces.push(shoe);

      looks.push({
        day,
        title: `Day ${day} · ${destination.name.split(" ")[0]} ${day === 1 ? "Arrival & Dinner" : day === durationDays ? "Departure" : "Exploration"}`,
        pieces,
        event: day % 2 === 0 ? "Casual Chic" : "Dinner & Evening",
      });
    }

    return looks;
  }, [capsulePieces, durationDays, destination]);

  const togglePacked = (id: string) => {
    setPackedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  const currentLook = dailyLooks.find((l) => l.day === selectedOutfitDay) || dailyLooks[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 animate-fade"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-y-auto rounded-3xl bg-white p-5 text-[#18181B] shadow-2xl dark:bg-[#0B1528] dark:text-white animate-pop no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 dark:border-[#1E293B]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧳</span>
            <div>
              <h2 className="text-base font-black tracking-tight">TRIP CAPSULE PLANNER</h2>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Minimal wardrobe packing with maximum outfit versatility
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] text-xs font-bold text-[#64748B] hover:bg-[#E2E8F0] dark:bg-[#1E293B] dark:text-[#94A3B8]"
          >
            ✕
          </button>
        </div>

        {/* Destination Chips */}
        <div className="mt-4 space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            Select Destination
          </label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {DESTINATIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDestination(d)}
                className={cn(
                  "shrink-0 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all shadow-sm active:scale-95",
                  destination.id === d.id
                    ? "bg-[#FF7F02] text-white dark:bg-white dark:text-[#18181B] shadow-md"
                    : "bg-[#F1F5F9] text-[#64748B] dark:bg-[#152238] dark:text-[#94A3B8] hover:bg-[#E2E8F0]"
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#3B82F6] font-semibold">
            Forecast: {destination.weather}
          </p>
        </div>

        {/* Trip Duration Pill Switcher */}
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#F1F5F9] dark:bg-[#152238] p-1 shadow-inner">
          {[
            { days: 3 as const, label: "3-Day Weekend" },
            { days: 5 as const, label: "5-Day Getaway" },
            { days: 7 as const, label: "7-Day Week" },
          ].map((d) => (
            <button
              key={d.days}
              onClick={() => {
                setDurationDays(d.days);
                if (selectedOutfitDay > d.days) setSelectedOutfitDay(1);
              }}
              className={cn(
                "flex-1 rounded-xl py-1.5 text-xs font-bold transition-all text-center",
                durationDays === d.days
                  ? "bg-white text-[#18181B] shadow-sm dark:bg-[#FF7F02] dark:text-white"
                  : "text-[#64748B] dark:text-[#94A3B8]"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Capsule Efficiency Stat Banner */}
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#DCE5F2]/50 to-[#E8EEF5] dark:from-[#15243E] dark:to-[#1A2F5D] p-3 border border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <div>
              <p className="text-xs font-black text-[#18181B] dark:text-white">
                Capsule Formula: {capsulePieces.length} Pieces = {dailyLooks.length} Distinct Looks
              </p>
              <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                Zero wardrobe clutter. Guaranteed matching harmony.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500 text-white font-black text-[10px] px-2 py-0.5 shadow-sm">
            100% Fit
          </span>
        </div>

        {/* Day-by-Day Look Browser */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              Daily Trip Outfits
            </h3>
            <div className="flex gap-1.5">
              {dailyLooks.map((l) => (
                <button
                  key={l.day}
                  onClick={() => setSelectedOutfitDay(l.day)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition-all",
                    selectedOutfitDay === l.day
                      ? "bg-[#FF7F02] text-white dark:bg-white dark:text-[#18181B] shadow-sm scale-105"
                      : "bg-[#F1F5F9] text-[#64748B] dark:bg-[#152238] dark:text-[#94A3B8]"
                  )}
                >
                  D{l.day}
                </button>
              ))}
            </div>
          </div>

          {currentLook && (
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#FAFBFD] dark:border-[#1E293B] dark:bg-[#101D33] p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-[#18181B] dark:text-white">{currentLook.title}</h4>
                  <span className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                    {currentLook.event} · {currentLook.pieces.length} pieces
                  </span>
                </div>
                <button
                  onClick={() => {
                    const pseudo: Outfit = {
                      id: `capsule-${currentLook.day}`,
                      itemIds: currentLook.pieces.map((p) => p.id),
                      event: "casual-outing",
                      reason: `Curated for ${currentLook.title}`,
                      score: 95,
                      createdAt: Date.now(),
                    };
                    lockOutfit(pseudo);
                    localStorage.setItem("fitly_has_requested_outfit", "true");
                    onClose();
                    navigate("/");
                  }}
                  className="rounded-full bg-[#FF7F02] px-3 py-1 text-[10px] font-bold text-white shadow-sm dark:bg-white dark:text-[#18181B] active:scale-95"
                >
                  🔒 Wear This Look
                </button>
              </div>

              {/* Garments in this day's look */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {currentLook.pieces.map((piece) => (
                  <div
                    key={piece.id}
                    className="flex flex-col items-center rounded-xl bg-white dark:bg-[#0B1528] p-2 shadow-sm border border-[#E2E8F0] dark:border-[#1E293B]"
                  >
                    <div className="h-11 w-11 flex items-center justify-center">
                      <GarmentImage
                        src={piece.imageUrl}
                        alt={piece.name}
                        slot={piece.slot}
                        colorHex={piece.colorHex}
                        transparent={true}
                        className="max-h-full max-w-full object-contain drop-shadow-sm"
                      />
                    </div>
                    <span className="mt-1 text-[9px] font-bold text-center text-[#18181B] dark:text-white truncate w-full">
                      {piece.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Packing Checklist */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              Packing Checklist ({packedIds.size} / {capsulePieces.length} packed)
            </h3>
            {packedIds.size === capsulePieces.length && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                ✓ Ready to Fly!
              </span>
            )}
          </div>

          <div className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B] rounded-2xl border border-[#E2E8F0] bg-white dark:border-[#1E293B] dark:bg-[#0B1528] overflow-hidden">
            {capsulePieces.map((piece) => {
              const isPacked = packedIds.has(piece.id);
              return (
                <button
                  key={piece.id}
                  onClick={() => togglePacked(piece.id)}
                  className="flex w-full items-center justify-between p-2.5 text-left hover:bg-[#F8FAFC] dark:hover:bg-[#101D33] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-md border text-xs font-black transition-all",
                        isPacked
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-[#CBD5E1] dark:border-[#334155]"
                      )}
                    >
                      {isPacked && "✓"}
                    </div>
                    <div className="h-8 w-8 flex items-center justify-center">
                      <GarmentImage
                        src={piece.imageUrl}
                        alt={piece.name}
                        slot={piece.slot}
                        colorHex={piece.colorHex}
                        transparent={true}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-xs font-bold text-[#18181B] dark:text-white",
                          isPacked && "line-through opacity-60"
                        )}
                      >
                        {piece.name}
                      </p>
                      <p className="text-[9.5px] text-[#64748B] dark:text-[#94A3B8]">
                        {piece.color} · {piece.category}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                    {isPacked ? "Packed" : "Pack"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
