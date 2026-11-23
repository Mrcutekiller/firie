import { useEffect, useMemo, useState } from "react";
import GarmentImage from "./GarmentImage";
import { cn } from "./ui";
import type { ClosetItem, Outfit } from "../lib/types";

/* -------------------------------------------------------------------------- */
/* Pushpin Icon (Matches purple pins in reference image)                     */
/* -------------------------------------------------------------------------- */

function PushpinIcon({ pinned }: { pinned: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "h-4 w-4 transition-all duration-150",
        pinned
          ? "rotate-12 scale-110 text-[#7c3aed] drop-shadow-sm"
          : "text-navy-300 hover:text-navy-500"
      )}
      fill="currentColor"
    >
      <path d="M16 2a1 1 0 0 1 .707.293l5 5a1 1 0 0 1 0 1.414l-2.6 2.6 1.4 4.2a1 1 0 0 1-.264.982l-2.5 2.5a1 1 0 0 1-1.37.045l-3.873-3.486-4.5 4.5a1 1 0 0 1-1.414-1.414l4.5-4.5-3.486-3.873a1 1 0 0 1 .045-1.37l2.5-2.5a1 1 0 0 1 .982-.264l4.2 1.4 2.6-2.6A1 1 0 0 1 16 2z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Slider settings icon for the black circular button                        */
/* -------------------------------------------------------------------------- */

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="4" y1="8" x2="20" y2="8" />
      <circle cx="8" cy="8" r="2.2" fill="white" stroke="none" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="16" cy="16" r="2.2" fill="white" stroke="none" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab types                                                                  */
/* -------------------------------------------------------------------------- */

type DressMeTab = "dress-me" | "canvas" | "moodboards";

const TABS: { id: DressMeTab; label: string }[] = [
  { id: "dress-me", label: "Dress me" },
  { id: "canvas", label: "Canvas" },
  { id: "moodboards", label: "Moodboards" },
];

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

interface TodayOutfitCarouselProps {
  outfits: Outfit[];
  outfitIndex: number;
  setOutfitIndex: (i: number) => void;
  itemById: (id: string) => ClosetItem | undefined;
  currentOutfit: Outfit;
  isPro: boolean;
  score: number;
  isConfirmedToday: boolean;
  onConfirm: () => void;
  onOpenFilter?: () => void;
}

export default function TodayOutfitCarousel({
  outfits,
  outfitIndex,
  setOutfitIndex,
  itemById,
  currentOutfit,
  isPro,
  score,
  isConfirmedToday,
  onConfirm,
  onOpenFilter,
}: TodayOutfitCarouselProps) {
  const [tab, setTab] = useState<DressMeTab>("dress-me");
  const [viewMode, setViewMode] = useState<"stacked" | "split" | "columns">("stacked");
  const [showRationaleModal, setShowRationaleModal] = useState(false);

  // Pinned items state (Clueless style locking)
  const [pinnedSlots, setPinnedSlots] = useState<{
    top: boolean;
    bottom: boolean;
    shoes: boolean;
  }>({
    top: true,
    bottom: true,
    shoes: true,
  });

  // Local overrides for slots if user taps side items
  const [customSlotItems, setCustomSlotItems] = useState<{
    top?: ClosetItem;
    bottom?: ClosetItem;
    shoes?: ClosetItem;
  }>({});

  // Reset custom items when outfit index changes externally
  useEffect(() => {
    setCustomSlotItems({});
  }, [outfitIndex]);

  // Extract all current items
  const currentItems = useMemo(() => {
    return currentOutfit.itemIds
      .map(itemById)
      .filter((i): i is ClosetItem => Boolean(i));
  }, [currentOutfit.itemIds, itemById]);

  // Active top, bottom, shoes
  const activeTop = useMemo(() => {
    return (
      customSlotItems.top ||
      currentItems.find((i) => i.slot === "top") ||
      currentItems[0]
    );
  }, [customSlotItems.top, currentItems]);

  const activeBottom = useMemo(() => {
    return (
      customSlotItems.bottom ||
      currentItems.find((i) => i.slot === "bottom") ||
      currentItems[1]
    );
  }, [customSlotItems.bottom, currentItems]);

  const activeShoes = useMemo(() => {
    return (
      customSlotItems.shoes ||
      currentItems.find((i) => i.slot === "shoes") ||
      currentItems[2]
    );
  }, [customSlotItems.shoes, currentItems]);

  // Alternatives from neighboring outfits to display in Left & Right columns
  const prevOutfit = outfits[(outfitIndex - 1 + outfits.length) % outfits.length];
  const nextOutfit = outfits[(outfitIndex + 1) % outfits.length];

  const leftItems = useMemo(() => {
    if (!prevOutfit) return [];
    return prevOutfit.itemIds
      .map(itemById)
      .filter((i): i is ClosetItem => Boolean(i));
  }, [prevOutfit, itemById]);

  const rightItems = useMemo(() => {
    if (!nextOutfit) return [];
    return nextOutfit.itemIds
      .map(itemById)
      .filter((i): i is ClosetItem => Boolean(i));
  }, [nextOutfit, itemById]);

  const leftTop = leftItems.find((i) => i.slot === "top") || leftItems[0];
  const leftBottom = leftItems.find((i) => i.slot === "bottom") || leftItems[1];
  const leftShoes = leftItems.find((i) => i.slot === "shoes") || leftItems[2];

  const rightTop = rightItems.find((i) => i.slot === "top") || rightItems[0];
  const rightBottom = rightItems.find((i) => i.slot === "bottom") || rightItems[1];
  const rightShoes = rightItems.find((i) => i.slot === "shoes") || rightItems[2];

  // Shuffle Clueless action
  const handleShuffle = () => {
    // Navigate to next outfit while preserving pinned items
    const nextIdx = (outfitIndex + 1) % outfits.length;
    setOutfitIndex(nextIdx);
  };

  const togglePin = (slot: "top" | "bottom" | "shoes") => {
    setPinnedSlots((prev) => ({ ...prev, [slot]: !prev[slot] }));
  };

  const selectItem = (slot: "top" | "bottom" | "shoes", item?: ClosetItem) => {
    if (!item) return;
    setCustomSlotItems((prev) => ({ ...prev, [slot]: item }));
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white select-none">
      {/* ── Top Tabs Bar (Dress me / Canvas / Moodboards) ── */}
      <div className="flex shrink-0 items-center border-b border-navy-100/70 px-4">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "pb-2.5 pt-2 text-xs font-bold transition-all",
                tab === t.id
                  ? "border-b-2 border-black text-black"
                  : "text-navy-400 hover:text-navy-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sub-header: Filter Button (Left), Score Badge (Center), Lime 'Salvar' (Right) ── */}
      <div className="flex shrink-0 items-center justify-between px-4 py-2">
        {/* Left: Black Circular Filter Button */}
        <button
          onClick={onOpenFilter}
          aria-label="Filter style"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black shadow-sm transition-transform active:scale-90"
        >
          <SlidersIcon />
        </button>

        {/* Center: Score / Match Pill */}
        <div className="flex items-center gap-1.5">
          {isPro && score > 0 && (
            <button
              onClick={() => setShowRationaleModal(true)}
              className="flex items-center gap-1 rounded-full bg-navy-50 border border-navy-100 px-2.5 py-0.5 text-[11px] font-black text-navy-800 transition-colors hover:bg-navy-100"
            >
              <span>✨</span>
              <span>{score}% match</span>
              <span className="text-[9px] text-navy-400">ⓘ</span>
            </button>
          )}
          {outfits.length > 1 && (
            <span className="text-[10px] font-bold text-navy-400">
              {outfitIndex + 1}/{outfits.length}
            </span>
          )}
        </div>

        {/* Right: Vibrant Lime Green 'Salvar' (Save / Wear) Button */}
        <button
          onClick={onConfirm}
          className={cn(
            "rounded-xl px-4 py-1.5 text-xs font-black shadow-sm transition-transform active:scale-95",
            isConfirmedToday
              ? "bg-emerald-500 text-white"
              : "bg-[#d2f82c] text-black hover:brightness-105"
          )}
        >
          {isConfirmedToday ? "✓ Salvo" : "Salvar"}
        </button>
      </div>

      {/* ── Canvas Area: Exact 3-Column Clueless Style Board ── */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 py-1">
        <div className="grid h-full w-full max-w-sm grid-cols-3 items-center gap-2">
          {/* ──── LEFT COLUMN (Alternative Look 1) ──── */}
          <div className="flex h-full flex-col justify-between py-2 opacity-65 transition-opacity hover:opacity-100">
            {/* Top */}
            <button
              onClick={() => selectItem("top", leftTop)}
              className="group flex flex-1 flex-col items-center justify-center p-1 transition-transform active:scale-95"
              title="Click to wear this top"
            >
              {leftTop && (
                <div className="h-20 w-20 max-h-full max-w-full">
                  <GarmentImage
                    src={leftTop.imageUrl}
                    alt={leftTop.name}
                    slot={leftTop.slot}
                    colorHex={leftTop.colorHex}
                    className="h-full w-full object-contain filter drop-shadow-sm"
                  />
                </div>
              )}
            </button>

            {/* Bottom */}
            <button
              onClick={() => selectItem("bottom", leftBottom)}
              className="group flex flex-1 flex-col items-center justify-center p-1 transition-transform active:scale-95"
              title="Click to wear these bottoms"
            >
              {leftBottom && (
                <div className="h-24 w-20 max-h-full max-w-full">
                  <GarmentImage
                    src={leftBottom.imageUrl}
                    alt={leftBottom.name}
                    slot={leftBottom.slot}
                    colorHex={leftBottom.colorHex}
                    className="h-full w-full object-contain filter drop-shadow-sm"
                  />
                </div>
              )}
            </button>

            {/* Shoes */}
            <button
              onClick={() => selectItem("shoes", leftShoes)}
              className="group flex flex-1 flex-col items-center justify-center p-1 transition-transform active:scale-95"
              title="Click to wear these shoes"
            >
              {leftShoes && (
                <div className="h-16 w-20 max-h-full max-w-full">
                  <GarmentImage
                    src={leftShoes.imageUrl}
                    alt={leftShoes.name}
                    slot={leftShoes.slot}
                    colorHex={leftShoes.colorHex}
                    className="h-full w-full object-contain filter drop-shadow-sm"
                  />
                </div>
              )}
            </button>
          </div>

          {/* ──── CENTER COLUMN (The Active Primary Outfit) ──── */}
          <div className="flex h-full flex-col justify-between py-1">
            {/* Center Top with Pin */}
            <div className="relative flex flex-1 items-center justify-center">
              {activeTop && (
                <div className="h-24 w-24 max-h-full max-w-full transition-transform hover:scale-105">
                  <GarmentImage
                    src={activeTop.imageUrl}
                    alt={activeTop.name}
                    slot={activeTop.slot}
                    colorHex={activeTop.colorHex}
                    className="h-full w-full object-contain filter drop-shadow-md"
                  />
                </div>
              )}
              {/* Pushpin button */}
              <button
                onClick={() => togglePin("top")}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 transition-transform active:scale-90"
                title={pinnedSlots.top ? "Item locked in look" : "Click to pin item"}
              >
                <PushpinIcon pinned={pinnedSlots.top} />
              </button>
            </div>

            {/* Center Bottom with Pin */}
            <div className="relative flex flex-1 items-center justify-center">
              {activeBottom && (
                <div className="h-28 w-24 max-h-full max-w-full transition-transform hover:scale-105">
                  <GarmentImage
                    src={activeBottom.imageUrl}
                    alt={activeBottom.name}
                    slot={activeBottom.slot}
                    colorHex={activeBottom.colorHex}
                    className="h-full w-full object-contain filter drop-shadow-md"
                  />
                </div>
              )}
              {/* Pushpin button */}
              <button
                onClick={() => togglePin("bottom")}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 transition-transform active:scale-90"
                title={pinnedSlots.bottom ? "Item locked in look" : "Click to pin item"}
              >
                <PushpinIcon pinned={pinnedSlots.bottom} />
              </button>
            </div>

            {/* Center Shoes with Pin */}
            <div className="relative flex flex-1 items-center justify-center">
              {activeShoes && (
                <div className="h-18 w-24 max-h-full max-w-full transition-transform hover:scale-105">
                  <GarmentImage
                    src={activeShoes.imageUrl}
                    alt={activeShoes.name}
                    slot={activeShoes.slot}
                    colorHex={activeShoes.colorHex}
                    className="h-full w-full object-contain filter drop-shadow-md"
                  />
                </div>
              )}
              {/* Pushpin button */}
              <button
                onClick={() => togglePin("shoes")}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 transition-transform active:scale-90"
                title={pinnedSlots.shoes ? "Item locked in look" : "Click to pin item"}
              >
                <PushpinIcon pinned={pinnedSlots.shoes} />
              </button>
            </div>
          </div>

          {/* ──── RIGHT COLUMN (Alternative Look 2) ──── */}
          <div className="flex h-full flex-col justify-between py-2 opacity-65 transition-opacity hover:opacity-100">
            {/* Top */}
            <button
              onClick={() => selectItem("top", rightTop)}
              className="group flex flex-1 flex-col items-center justify-center p-1 transition-transform active:scale-95"
              title="Click to wear this top"
            >
              {rightTop && (
                <div className="h-20 w-20 max-h-full max-w-full">
                  <GarmentImage
                    src={rightTop.imageUrl}
                    alt={rightTop.name}
                    slot={rightTop.slot}
                    colorHex={rightTop.colorHex}
                    className="h-full w-full object-contain filter drop-shadow-sm"
                  />
                </div>
              )}
            </button>

            {/* Bottom */}
            <button
              onClick={() => selectItem("bottom", rightBottom)}
              className="group flex flex-1 flex-col items-center justify-center p-1 transition-transform active:scale-95"
              title="Click to wear these bottoms"
            >
              {rightBottom && (
                <div className="h-24 w-20 max-h-full max-w-full">
                  <GarmentImage
                    src={rightBottom.imageUrl}
                    alt={rightBottom.name}
                    slot={rightBottom.slot}
                    colorHex={rightBottom.colorHex}
                    className="h-full w-full object-contain filter drop-shadow-sm"
                  />
                </div>
              )}
            </button>

            {/* Shoes */}
            <button
              onClick={() => selectItem("shoes", rightShoes)}
              className="group flex flex-1 flex-col items-center justify-center p-1 transition-transform active:scale-95"
              title="Click to wear these shoes"
            >
              {rightShoes && (
                <div className="h-16 w-20 max-h-full max-w-full">
                  <GarmentImage
                    src={rightShoes.imageUrl}
                    alt={rightShoes.name}
                    slot={rightShoes.slot}
                    colorHex={rightShoes.colorHex}
                    className="h-full w-full object-contain filter drop-shadow-sm"
                  />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* ── Floating Island Dock at Bottom of Canvas (Matches Reference) ── */}
        <div className="absolute bottom-2 inset-x-0 mx-auto flex w-fit items-center gap-3 rounded-full bg-white/95 px-4 py-1.5 shadow-xl border border-navy-100/80 backdrop-blur-md">
          {/* Split icon */}
          <button
            onClick={() => setViewMode("split")}
            className={cn(
              "p-1 transition-colors",
              viewMode === "split" ? "text-purple-600 font-bold" : "text-navy-400 hover:text-navy-700"
            )}
            title="Split view"
          >
            <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="14" height="5" rx="1" />
              <rect x="3" y="11" width="14" height="5" rx="1" />
            </svg>
          </button>

          {/* Stacked rows icon (Active Purple like Reference) */}
          <button
            onClick={() => setViewMode("stacked")}
            className={cn(
              "p-1 transition-colors",
              viewMode === "stacked" ? "text-purple-600 font-bold" : "text-navy-400 hover:text-navy-700"
            )}
            title="Stacked dress-me view"
          >
            <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="currentColor">
              <rect x="2" y="3" width="16" height="3" rx="0.8" />
              <rect x="2" y="8.5" width="16" height="3" rx="0.8" opacity="0.4" />
              <rect x="2" y="14" width="16" height="3" rx="0.8" />
            </svg>
          </button>

          {/* Columns icon */}
          <button
            onClick={() => setViewMode("columns")}
            className={cn(
              "p-1 transition-colors",
              viewMode === "columns" ? "text-purple-600 font-bold" : "text-navy-400 hover:text-navy-700"
            )}
            title="Columns view"
          >
            <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="3.5" height="14" rx="1" />
              <rect x="8.25" y="3" width="3.5" height="14" rx="1" />
              <rect x="13.5" y="3" width="3.5" height="14" rx="1" />
            </svg>
          </button>

          {/* Black circle Shuffle / Cycle Button */}
          <button
            onClick={handleShuffle}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white shadow-md transition-transform hover:scale-105 active:scale-90"
            title="Shuffle look (Clueless style)"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6M3 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Why This Works / Pro Rationale Modal ── */}
      {showRationaleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-fade"
          onClick={() => setShowRationaleModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-navy-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <div>
                  <h3 className="text-sm font-black text-navy-900">Styling Rationale</h3>
                  <p className="text-[10px] text-navy-400">ፍሬ Pro Intelligence</p>
                </div>
              </div>
              <button
                onClick={() => setShowRationaleModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-50 text-navy-400 hover:text-navy-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-navy-50/70 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400">Match Analysis</p>
                <p className="mt-1 text-xs text-navy-800 leading-relaxed">
                  {currentOutfit.reason || "A harmonious silhouette balancing warm neutral tones with sharp contrast."}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-amber-50/70 p-3 border border-amber-200/60">
                <div className="flex items-center gap-2">
                  <span className="text-base">👑</span>
                  <span className="text-xs font-bold text-amber-950">Styling Compatibility</span>
                </div>
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-navy-950">
                  {score}%
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowRationaleModal(false)}
              className="mt-5 w-full rounded-2xl bg-navy-900 py-3 text-xs font-bold text-white shadow-md transition-transform active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
