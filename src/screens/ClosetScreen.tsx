import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GarmentImage from "../components/GarmentImage";
import ItemCard, { getCostPerWear } from "../components/ItemCard";
import ItemFields, { type ItemFieldValues } from "../components/ItemFields";
import { Button, ProBadge, cn } from "../components/ui";
import { useApp } from "../lib/store";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  EVENT_LABELS,
  FREE_ITEM_LIMIT,
  type Category,
  type ClosetItem,
  type Outfit,
  type OutfitLog,
} from "../lib/types";

type MainSegment = "pieces" | "looks";
type LooksSubTab = "favorites" | "history";
type CategoryTab = "all" | Category;

function toFields(item: ClosetItem): ItemFieldValues {
  return {
    name: item.name,
    category: item.category,
    slot: item.slot,
    color: item.color,
    colorHex: item.colorHex,
    isNeutral: item.isNeutral,
    style: item.style,
    season: item.season,
    tags: item.tags,
  };
}

function describePieces(itemIds: string[], itemById: (id: string) => ClosetItem | undefined) {
  const pieces = itemIds.map(itemById).filter((item): item is ClosetItem => Boolean(item));
  const top = pieces.find((item) => item.slot === "top");
  const bottom = pieces.find((item) => item.slot === "bottom");
  const title =
    top && bottom
      ? `${top.color} top, ${bottom.color.toLowerCase()} bottom`
      : top?.category === "traditional"
        ? "A traditional Habesha look"
        : pieces[0]?.name ?? "A look from your closet";
  return { pieces, title };
}

/** Compact 2×2 garment preview used by the outfit cards. */
function OutfitPreview({ pieces, className }: { pieces: ClosetItem[]; className?: string }) {
  if (pieces.length === 0) {
    return <div className={cn("grid place-items-center rounded-xl bg-[#F1F5F9] text-[10px] text-[#94A3B8] dark:bg-[#1E293B]", className)}>—</div>;
  }
  return (
    <div className={cn("grid grid-cols-2 gap-1.5", className)}>
      {pieces.slice(0, 4).map((item) => (
        <div key={item.id} className="flex items-center justify-center rounded-xl bg-[#F1F5F9] p-1.5 dark:bg-[#1E293B]">
          <GarmentImage
            src={item.imageUrl}
            alt={item.name}
            slot={item.slot}
            colorHex={item.colorHex}
            transparent={true}
            className="max-h-full max-w-full object-contain drop-shadow-sm"
          />
        </div>
      ))}
    </div>
  );
}

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClosetScreen() {
  const navigate = useNavigate();
  const {
    closet,
    isPro,
    freeLimitReached,
    updateItem,
    deleteItem,
    favoriteOutfits,
    toggleOutfitFavorite,
    history,
    itemById,
    lockOutfit,
    loadDemoCloset,
  } = useApp();

  const [segment, setSegment] = useState<MainSegment>("pieces");
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("all");
  const [looksTab, setLooksTab] = useState<LooksSubTab>("favorites");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const favoriteGarments = useMemo(() => {
    const ids = Array.from(new Set(favoriteOutfits.flatMap((o) => o.itemIds)));
    return ids.map(itemById).filter((item): item is ClosetItem => Boolean(item));
  }, [favoriteOutfits, itemById]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: closet.length };
    for (const item of closet) c[item.category] = (c[item.category] ?? 0) + 1;
    return c;
  }, [closet]);

  const visible = useMemo(
    () => (categoryTab === "all" ? closet : closet.filter((i) => i.category === categoryTab)),
    [closet, categoryTab]
  );

  const selected = closet.find((i) => i.id === selectedId) ?? null;
  const pct = Math.min(100, (closet.length / FREE_ITEM_LIMIT) * 100);

  const totalLooksCount = favoriteOutfits.length + history.length;

  return (
    <div className="space-y-4 pb-24 relative">
      {/* ── Closet Header (Matching Reference Screen 2) ── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-[26px] font-black tracking-tight text-[#18181B] dark:text-white">
            My Closet
          </h1>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Your digital wardrobe
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPro && <ProBadge />}
          <button
            onClick={() => navigate("/add")}
            className="flex items-center gap-1 rounded-full bg-[#FF7F02] hover:bg-[#E57200] px-3 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 transition-all"
          >
            <span>+</span>
            <span>Add Piece</span>
          </button>
        </div>
      </div>

      {/* ── Top Stat Cards (Matching Screen 2 Reference) ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-3.5 shadow-sm">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F1F5F9] dark:bg-[#1E293B] text-lg text-[#18181B] dark:text-white">
            👔
          </div>
          <div>
            <div className="text-lg font-black text-[#18181B] dark:text-white leading-tight">
              {closet.length}
            </div>
            <div className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
              Wardrobe Pieces
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-3.5 shadow-sm">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F1F5F9] dark:bg-[#1E293B] text-lg text-[#18181B] dark:text-white">
            🔖
          </div>
          <div>
            <div className="text-lg font-black text-[#18181B] dark:text-white leading-tight">
              {totalLooksCount}
            </div>
            <div className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
              Saved Looks
            </div>
          </div>
        </div>
      </div>

      {/* ── High-End 2-Segment Control (Pieces vs Saved Looks, matching INDYX reference) ── */}
      <div className="grid grid-cols-2 rounded-2xl bg-[#EBEFF5] dark:bg-[#152238] p-1 shadow-inner">
        <button
          onClick={() => setSegment("pieces")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-black transition-all",
            segment === "pieces"
              ? "bg-white text-[#18181B] shadow-md dark:bg-[#FF7F02] dark:text-white"
              : "text-[#64748B] hover:text-[#18181B] dark:text-[#94A3B8] dark:hover:text-white"
          )}
        >
          <span>Wardrobe Pieces</span>
        </button>

        <button
          onClick={() => setSegment("looks")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-black transition-all",
            segment === "looks"
              ? "bg-white text-[#18181B] shadow-md dark:bg-[#FF7F02] dark:text-white"
              : "text-[#64748B] hover:text-[#18181B] dark:text-[#94A3B8] dark:hover:text-white"
          )}
        >
          <span>Saved Looks</span>
        </button>
      </div>

      {/* ── CONTENT FOR SEGMENT 1: WARDROBE PIECES ── */}
      {segment === "pieces" && (
        <div className="space-y-4">
          {!isPro && (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e5eaf0] dark:bg-[#1E293B]">
                <div className="h-full rounded-full bg-[#FF7F02] dark:bg-white transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-[#78899f] dark:text-[#94A3B8]">
                <span>Free closet limit</span>
                <span>{closet.length} of {FREE_ITEM_LIMIT} items</span>
              </div>
            </div>
          )}

          {freeLimitReached && !isPro && (
            <button
              onClick={() => navigate("/upgrade")}
              className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-left transition-all active:scale-[0.98]"
            >
              <span className="text-xl">📦</span>
              <span className="flex-1 text-xs font-semibold text-[#18181B] dark:text-amber-200">
                Free plan is full ({FREE_ITEM_LIMIT} items). Upgrade for unlimited.
              </span>
              <ProBadge />
            </button>
          )}

          {/* ── Category Navigation Tabs (Matching Reference Image 4) ── */}
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto border-b border-[#E2E8F0] dark:border-[#1E293B] px-1 pb-2">
            {[
              { id: "all" as CategoryTab, label: "ALL", count: closet.length },
              ...CATEGORY_ORDER.map((c) => ({
                id: c as CategoryTab,
                label: CATEGORY_LABELS[c].toUpperCase(),
                count: counts[c] ?? 0,
              })),
            ].map((t) => {
              const isActive = categoryTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setCategoryTab(t.id)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-[11px] font-black transition-all active:scale-95",
                    isActive
                      ? "text-[#18181B] dark:text-white"
                      : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#18181B]"
                  )}
                >
                  <span>{t.label}</span>
                  <span className="text-[9.5px] opacity-70">({t.count})</span>
                  {isActive && (
                    <div className="absolute inset-x-2 -bottom-2 h-0.5 rounded-full bg-[#FF7F02] dark:bg-white" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Garment Grid */}
          {visible.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#CBD5E1] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-8 text-center shadow-sm animate-fade">
              <span className="text-4xl">👔</span>
              <h3 className="mt-3 text-base font-black text-[#18181B] dark:text-white">
                {categoryTab === "all" ? "Your closet is empty" : `No ${CATEGORY_LABELS[categoryTab as Category]} yet`}
              </h3>
              <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] max-w-xs mx-auto leading-relaxed">
                Add a photo of your clothes and ፍሬ (Firie) will automatically remove the background and categorize each piece.
              </p>
              <div className="mt-5 flex flex-col gap-2 max-w-[220px] mx-auto">
                <button
                  onClick={() => navigate("/add")}
                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-[#FF7F02] dark:bg-white text-xs font-bold text-white dark:text-[#18181B] shadow-md active:scale-95 transition-transform"
                >
                  <span>📸 Add Your First Piece</span>
                </button>
                {categoryTab === "all" && (
                  <button
                    onClick={loadDemoCloset}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] hover:text-[#18181B] active:scale-95 transition-transform"
                  >
                    <span>✨ Load Sample Pieces (Test)</span>
                  </button>
                )}
              </div>
            </div>
          ) : categoryTab === "all" ? (
            CATEGORY_ORDER.filter((category) => closet.some((item) => item.category === category)).map((category) => {
              const group = closet.filter((item) => item.category === category);
              return (
                <section key={category} className="space-y-3 pt-1">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#1E293B] pb-1">
                    <h2 className="text-xs font-black uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                      {category === "traditional" ? "Traditional Habesha" : CATEGORY_LABELS[category]}
                    </h2>
                    <span className="text-[10px] font-semibold text-[#94A3B8]">{group.length} items</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {group.map((item) => (
                      <ItemCard key={item.id} item={item} onClick={() => setSelectedId(item.id)} />
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="grid grid-cols-3 gap-3 pt-2">
              {visible.map((item) => (
                <ItemCard key={item.id} item={item} onClick={() => setSelectedId(item.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CONTENT FOR SEGMENT 2: SAVED LOOKS (Favorites & History) ── */}
      {segment === "looks" && (
        <div className="space-y-4">
          {/* Sub-tab Pill Switcher */}
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">
            <button
              onClick={() => setLooksTab("favorites")}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-black transition-all",
                looksTab === "favorites"
                  ? "bg-[#FF7F02] text-white dark:bg-white dark:text-[#18181B] shadow-sm"
                  : "bg-[#F1F5F9] text-[#64748B] dark:bg-[#1E293B] dark:text-[#94A3B8]"
              )}
            >
              ♥ Curated Favorites ({favoriteOutfits.length})
            </button>
            <button
              onClick={() => setLooksTab("history")}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-black transition-all",
                looksTab === "history"
                  ? "bg-[#FF7F02] text-white dark:bg-white dark:text-[#18181B] shadow-sm"
                  : "bg-[#F1F5F9] text-[#64748B] dark:bg-[#1E293B] dark:text-[#94A3B8]"
              )}
            >
              ◷ Wear History ({history.length})
            </button>
          </div>

          {looksTab === "favorites" ? (
            <div className="space-y-6 pt-1">
              {/* Favourite Curated Outfits */}
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-1 dark:border-[#1E293B]">
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                    ♥ Saved Favorite Outfits
                  </h2>
                  <span className="text-[10px] font-semibold text-[#94A3B8]">{favoriteOutfits.length} saved</span>
                </div>

                {favoriteOutfits.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[#E2E8F0] px-4 py-7 text-center text-[11px] leading-relaxed text-[#94A3B8] dark:border-[#1E293B]">
                    Tap ♡ on any recommended outfit in the Outfits tab to save it here for instant wearing.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {favoriteOutfits.map((outfit: Outfit) => {
                      const { pieces, title } = describePieces(outfit.itemIds, itemById);
                      return (
                        <div
                          key={outfit.id}
                          className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm dark:border-[#1E293B] dark:bg-[#0F172A]"
                        >
                          <div>
                            <OutfitPreview pieces={pieces} className="h-[120px]" />
                            <p className="mt-2.5 truncate text-xs font-bold text-[#18181B] dark:text-white">{title}</p>
                            <p className="truncate text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                              {pieces.length} pieces{outfit.event ? ` · ${EVENT_LABELS[outfit.event]}` : ""}
                            </p>
                          </div>

                          <div className="mt-3 flex flex-col gap-1.5">
                            <button
                              onClick={() => {
                                lockOutfit(outfit);
                                localStorage.setItem("fitly_has_requested_outfit", "true");
                                navigate("/");
                              }}
                              className="w-full rounded-full bg-[#FF7F02] dark:bg-white py-1.5 text-[10.5px] font-bold text-white dark:text-[#18181B] shadow-sm active:scale-95 transition-transform"
                            >
                              🔒 Wear This Look
                            </button>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => navigate("/camera", { state: { itemIds: outfit.itemIds } })}
                                className="flex-1 rounded-full border border-[#E2E8F0] dark:border-[#1E293B] py-1 text-[9.5px] font-bold text-[#18181B] dark:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]"
                              >
                                📷 Camera
                              </button>
                              <button
                                onClick={() => toggleOutfitFavorite(outfit)}
                                className="rounded-full bg-[#FEF2F2] dark:bg-[#451A22] px-2.5 py-1 text-[9.5px] font-bold text-[#E11D48] dark:text-[#FDA4AF]"
                                title="Remove from favorites"
                              >
                                ♥ Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Clothes in Favorite Outfits */}
              <section className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-1 dark:border-[#1E293B]">
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                    ✨ Garments in Your Favorite Looks
                  </h2>
                  <span className="text-[10px] font-semibold text-[#94A3B8]">{favoriteGarments.length} pieces</span>
                </div>

                {favoriteGarments.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[#E2E8F0] px-4 py-6 text-center text-[11px] leading-relaxed text-[#94A3B8] dark:border-[#1E293B]">
                    Garments that make up your favorite looks will be grouped here.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {favoriteGarments.map((item) => (
                      <ItemCard key={item.id} item={item} onClick={() => setSelectedId(item.id)} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : (
            /* History Sub-tab */
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-1 dark:border-[#1E293B]">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  ◷ Outfits You Wore
                </h2>
                <span className="text-[10px] font-semibold text-[#94A3B8]">{history.length} look{history.length === 1 ? "" : "s"}</span>
              </div>

              {history.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#E2E8F0] px-4 py-7 text-center text-[11px] leading-relaxed text-[#94A3B8] dark:border-[#1E293B]">
                  Choose any outfit and tap “I wore this today” — each worn look will be logged here by date.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {[...history]
                    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
                    .map((log: OutfitLog) => {
                      const { pieces, title } = describePieces(log.itemIds, itemById);
                      return (
                        <div
                          key={log.id}
                          className="flex flex-col gap-2 rounded-2xl border border-[#E2E8F0] bg-white p-3 dark:border-[#1E293B] dark:bg-[#0F172A] shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-[#18181B] dark:text-white">
                              {shortDate(log.date)}
                            </span>
                            <span className="rounded-full bg-[#F1F5F9] dark:bg-[#1E293B] px-2 py-0.5 text-[9.5px] font-bold text-[#64748B] dark:text-[#94A3B8]">
                              {EVENT_LABELS[log.event]} {log.weatherSummary ? `· ${log.weatherSummary}` : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <OutfitPreview pieces={pieces} className="h-[64px] w-[64px] shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-[#18181B] dark:text-white">{title}</p>
                              <p className="mt-0.5 truncate text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                                {pieces.map((item) => item.name).join(" · ")}
                              </p>
                              {log.reason && (
                                <p className="mt-0.5 line-clamp-1 text-[9.5px] text-[#94A3B8]">
                                  {log.reason}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F1F5F9] dark:border-[#1E293B]">
                            <button
                              onClick={() => {
                                const pseudoOutfit: Outfit = {
                                  id: log.id,
                                  itemIds: log.itemIds,
                                  event: log.event,
                                  reason: log.reason || "Re-worn from your outfit history.",
                                  score: 90,
                                  createdAt: log.createdAt,
                                };
                                lockOutfit(pseudoOutfit);
                                localStorage.setItem("fitly_has_requested_outfit", "true");
                                navigate("/");
                              }}
                              className="rounded-full bg-[#FF7F02] dark:bg-white px-3.5 py-1 text-[10px] font-bold text-white dark:text-[#18181B] shadow-sm transition-transform active:scale-95"
                            >
                              ↻ Wear Again
                            </button>
                            <button
                              onClick={() => navigate("/camera", { state: { itemIds: log.itemIds } })}
                              className="rounded-full border border-[#E2E8F0] dark:border-[#1E293B] px-3.5 py-1 text-[10px] font-bold text-[#18181B] dark:text-white"
                            >
                              📷 Camera
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating buttons removed per user request for a clean view */}

      {/* ── Item Detail & Utilization Analytics Bottom Sheet ── */}
      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-navy-950/50 backdrop-blur-sm animate-fade"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bottom-sheet max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-white p-5 animate-slide-up dark:bg-[#0B1528] dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-navy-200 dark:bg-navy-800" />

            {/* Item image — studio pedestal with floating drop shadow */}
            <div className="mx-auto mb-4 flex h-36 w-36 items-center justify-center rounded-full bg-[#f1f5fb] dark:bg-[#152238] shadow-inner p-4">
              <GarmentImage
                src={selected.imageUrl}
                alt={selected.name}
                slot={selected.slot}
                colorHex={selected.colorHex}
                transparent={true}
                className="max-h-full max-w-full object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_12px_20px_rgba(0,0,0,0.5)]"
              />
            </div>

            {/* Name */}
            <div className="mb-4 text-center">
              <p className="text-lg font-black text-[#18181B] dark:text-white">{selected.name}</p>
              <p className="text-xs text-[#64748B] mt-0.5 dark:text-[#94A3B8]">
                {selected.color} · {selected.category} · {selected.style}
              </p>
            </div>

            {/* Cost-Per-Wear & Wardrobe Utilization Metric Card */}
            {(() => {
              const cpw = getCostPerWear(selected);
              return (
                <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-[#F8FAFC] dark:bg-[#101D33] p-3 text-center border border-[#E2E8F0] dark:border-[#1E293B]">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">WORN</span>
                    <span className="text-sm font-black text-[#18181B] dark:text-white mt-0.5">
                      {selected.timesWorn}×
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center border-x border-[#E2E8F0] dark:border-[#1E293B]">
                    <span className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">COST / WEAR</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {cpw.label}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">STATUS</span>
                    <span className="text-[10.5px] font-bold text-[#18181B] dark:text-white mt-0.5">
                      {selected.timesWorn >= 4 ? "Staple ⭐" : selected.timesWorn > 0 ? "Active 🔄" : "Unworn 🏷️"}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Quick Action: Style an outfit around this garment */}
            <button
              onClick={() => {
                setSelectedId(null);
                navigate("/camera", { state: { itemIds: [selected.id] } });
              }}
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF7F02] dark:bg-white py-3 text-xs font-bold text-white dark:text-[#18181B] shadow-md active:scale-98 transition-transform"
            >
              <span>📷 Capture Look With This in Camera</span>
            </button>

            <ItemFields
              values={toFields(selected)}
              onChange={(patch) => updateItem(selected.id, patch)}
            />

            <div className="mt-5 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setSelectedId(null)}>
                Done
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  deleteItem(selected.id);
                  setSelectedId(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
