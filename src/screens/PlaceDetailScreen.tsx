import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DatePlanSheet from "../components/DatePlanSheet";
import GarmentImage from "../components/GarmentImage";
import PlaceMap from "../components/PlaceMap";
import { Button, Chip, EmptyState, ProLock } from "../components/ui";
import { calculateBudget, lineFromMenuItem, outfitsForPlace } from "../lib/dateSpots";
import {
  getPlace,
  PLACE_CATEGORY_LABELS,
  REPORT_REASON_LABELS,
  VERIFICATION_LABELS,
  type MenuItem,
  type Place,
  type ReportReason,
} from "../lib/places";
import { useApp } from "../lib/store";

/**
 * Venue detail: honest facts, real menu data with verification states,
 * an OSM map, a budget calculator, closet-only outfit suggestions, the
 * date planner and a report flow. Everything price-related is labelled
 * verified / estimate / unavailable — nothing is ever invented.
 */
export default function PlaceDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const place = id ? getPlace(id) : undefined;

  const {
    closet,
    isPro,
    favoritesFull,
    isPlaceFavorite,
    togglePlaceFavorite,
    setPlaceCollection,
    isMenuItemFavorite,
    toggleMenuItemFavorite,
    favoritePlaces,
    reportPlace,
    lockOutfit,
  } = useApp();

  const [galleryIdx, setGalleryIdx] = useState(0);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const [shareNote, setShareNote] = useState("");

  // Budget calculator state
  const [people, setPeople] = useState(2);
  const [extras, setExtras] = useState("0");
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});

  // Report flow state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("wrong-price");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSent, setReportSent] = useState(false);

  const favorite = place ? isPlaceFavorite(place.id) : false;
  const collection = place
    ? favoritePlaces.find((f) => f.placeId === place.id)?.collection ?? "Wishlist"
    : "Wishlist";

  const outfits = useMemo(() => {
    if (!place || closet.length === 0) return [];
    return outfitsForPlace(closet, place, { plan: isPro ? "pro" : "free" });
  }, [place, closet, isPro]);

  const budgetLines = useMemo(() => {
    if (!place?.menu) return [];
    return Object.entries(qtyByItem)
      .map(([itemId, qty]) => {
        const item = place.menu?.items.find((i) => i.id === itemId);
        if (!item || qty <= 0) return null;
        const line = lineFromMenuItem(item, qty);
        return line;
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
  }, [place, qtyByItem]);

  const budget = useMemo(() => {
    const extrasNum = Math.max(0, Number(extras.replace(/[^\d.]/g, "")) || 0);
    if (!place) return null;
    return calculateBudget({
      budget: 0,
      people,
      lines: budgetLines,
      extras: extrasNum,
      currency: place.menu?.items[0]?.currency ?? "ETB",
    });
  }, [place, people, budgetLines, extras]);

  if (!place) {
    return (
      <div className="pt-6">
        <EmptyState
          icon="📍"
          title="Place not found"
          body="This venue isn't in FITLY's list — it may have been removed. We only keep real, listed places."
          action={<Button onClick={() => navigate("/datespots")}>Back to Date Spots</Button>}
        />
      </div>
    );
  }

  const gallery = [place.image, ...place.gallery];
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      const nav = typeof window !== "undefined" ? window.navigator : undefined;
      if (nav && "share" in nav && typeof nav.share === "function") {
        await nav.share({ title: place.name, text: `${place.name} — ${place.neighborhood}, ${place.city}`, url });
        return;
      }
      if (nav && nav.clipboard) {
        await nav.clipboard.writeText(url);
        setShareNote("Link copied.");
      }
    } catch {
      setShareNote("Sharing isn't available on this device.");
    }
    setTimeout(() => setShareNote(""), 2500);
  };

  const toggleDish = (item: MenuItem) => {
    const added = toggleMenuItemFavorite(place.id, item.id);
    if (!added && !isMenuItemFavorite(place.id, item.id) && favoritesFull) {
      setShareNote("Free plan keeps 10 favourites — Pro saves unlimited.");
      setTimeout(() => setShareNote(""), 3000);
    }
  };

  const setQty = (itemId: string, qty: number) => {
    setQtyByItem((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
  };

  const submitReport = () => {
    reportPlace({ placeId: place.id, reason: reportReason, details: reportDetails.trim() || undefined });
    setReportSent(true);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/datespots")}
          aria-label="Back to Date Spots"
          className="grid h-9 w-9 place-items-center rounded-full border border-[#e2e8ef] bg-white text-sm text-[#526b89]"
        >
          ←
        </button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8392a7]">Date Spots</span>
        <button
          onClick={() => void share()}
          aria-label="Share this place"
          className="grid h-9 w-9 place-items-center rounded-full border border-[#e2e8ef] bg-white text-sm text-[#526b89]"
        >
          ↗
        </button>
      </div>
      {shareNote && <p className="text-[10px] font-semibold text-[#526b89]">{shareNote}</p>}

      {/* Gallery */}
      <div className="space-y-1.5">
        <PlaceHero place={place} src={gallery[galleryIdx]} />
        {gallery.length > 1 && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {gallery.map((src, i) => (
              <button
                key={`${src}-${i}`}
                onClick={() => setGalleryIdx(i)}
                aria-label={`Photo ${i + 1}`}
                className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 ${
                  galleryIdx === i ? "border-[#102f53]" : "border-transparent"
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title + actions */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold leading-tight text-[#112844]">{place.name}</h1>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#8292a8]">
              {place.categories.map((c) => PLACE_CATEGORY_LABELS[c]).join(" · ")}
            </p>
          </div>
          <button
            onClick={() => {
              if (!favorite && favoritesFull && !isPro) {
                setShareNote("Free plan keeps 10 favourites — Pro saves unlimited.");
                setTimeout(() => setShareNote(""), 3000);
                return;
              }
              togglePlaceFavorite(place.id, collection);
              setShowCollection(!favorite);
            }}
            aria-label={favorite ? "Remove from favourites" : "Save to favourites"}
            aria-pressed={favorite}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border text-lg ${
              favorite ? "border-[#102f53] bg-[#102f53] text-white" : "border-[#e2e8ef] bg-white text-[#8292a8]"
            }`}
          >
            {favorite ? "♥" : "♡"}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[#eef2f7] px-2.5 py-1 text-[10px] font-bold text-[#526b89]">
            {place.rating !== null ? `★ ${place.rating.toFixed(1)}` : "No public rating yet"}
          </span>
          {place.reviewCount !== null && (
            <span className="rounded-full bg-[#f4f6f8] px-2.5 py-1 text-[10px] font-semibold text-[#7186a0]">
              {place.reviewCount} reviews
            </span>
          )}
          <span className="rounded-full bg-[#f4f6f8] px-2.5 py-1 text-[10px] font-semibold text-[#7186a0]">
            {place.priceLevel !== null ? "$".repeat(place.priceLevel) : "Price level unlisted"}
          </span>
          <span className="rounded-full bg-[#f4f6f8] px-2.5 py-1 text-[10px] font-semibold text-[#7186a0]">
            {place.city}
          </span>
        </div>

        {favorite && showCollection && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[#7186a0]">File under:</span>
            {["Romantic", "Coffee", "Dinner", "Weekend", "Future Plans"].map((c) => (
              <Chip key={c} active={collection === c} onClick={() => setPlaceCollection(place.id, c)}>
                {c}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setPlannerOpen(true)} className="text-xs">
          🗓 Plan a date
        </Button>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8dfe8] bg-white px-4 py-3 text-xs font-semibold text-[#30435c] transition-all active:scale-[0.98]"
        >
          🧭 Directions
        </a>
      </div>

      {/* Honest details */}
      <section className="space-y-2 rounded-[15px] border border-[#e7ebf0] bg-white p-3.5">
        <h2 className="text-[12px] font-bold text-[#112844]">The details</h2>
        <p className="text-[11.5px] leading-relaxed text-[#596575]">{place.description}</p>
        <div className="space-y-1.5 border-t border-[#f0f3f7] pt-2 text-[11px] text-[#596575]">
          <p>
            <span className="font-semibold text-[#30435c]">Address:</span> {place.address}, {place.neighborhood}
          </p>
          <p>
            <span className="font-semibold text-[#30435c]">Hours:</span>{" "}
            {place.hours ?? "Contact for hours — not published"}
          </p>
          {place.phone && (
            <p>
              <span className="font-semibold text-[#30435c]">Phone:</span>{" "}
              <a href={`tel:${place.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-[#17375d] underline">
                {place.phone}
              </a>
            </p>
          )}
          {place.website && (
            <p className="truncate">
              <span className="font-semibold text-[#30435c]">Website:</span>{" "}
              <a href={place.website} target="_blank" rel="noreferrer" className="font-semibold text-[#17375d] underline">
                {place.website.replace(/^https?:\/\//, "")}
              </a>
            </p>
          )}
          <p>
            <span className="font-semibold text-[#30435c]">Vibe:</span> {place.atmosphere}
          </p>
          {place.seating.length > 0 && (
            <p>
              <span className="font-semibold text-[#30435c]">Seating:</span> {place.seating.join(", ")}
            </p>
          )}
          {place.facilities.length > 0 ? (
            <p>
              <span className="font-semibold text-[#30435c]">Facilities:</span> {place.facilities.join(" · ")}
            </p>
          ) : (
            <p className="text-[#8a98a9]">Facilities unconfirmed — call before you go.</p>
          )}
        </div>
      </section>

      {/* Map */}
      <section className="overflow-hidden rounded-[15px] border border-[#e7ebf0] bg-white">
        <div className="flex items-center justify-between px-3.5 pt-3">
          <h2 className="text-[12px] font-bold text-[#112844]">On the map</h2>
          <a href={directionsUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#17375d]">
            Open in Maps →
          </a>
        </div>
        <div className="p-2">
          <PlaceMap
            places={[place]}
            selectedId={place.id}
            center={{ lat: place.lat, lng: place.lng }}
            height={200}
            autoFit={false}
          />
        </div>
        <p className="px-3.5 pb-3 text-[9.5px] text-[#98a4b4]">
          {place.lat.toFixed(4)}, {place.lng.toFixed(4)} · © OpenStreetMap contributors
        </p>
      </section>

      {/* Menu */}
      <section className="space-y-2.5 rounded-[15px] border border-[#e7ebf0] bg-white p-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] font-bold text-[#112844]">Menu</h2>
          <span className="text-[9.5px] font-semibold text-[#8a98a9]">
            {place.menu ? `checked ${place.menu.lastChecked}` : "no menu published"}
          </span>
        </div>

        {!place.menu || place.menu.items.length === 0 ? (
          <p className="rounded-xl bg-[#f4f6f8] px-3 py-2.5 text-[11px] leading-relaxed text-[#596575]">
            This venue doesn't publish a menu online. Price unavailable — contact restaurant.
          </p>
        ) : (
          <>
            <p className="text-[10px] leading-relaxed text-[#7186a0]">
              Source: {place.menu.source}
              {place.menu.sourceUrl && (
                <>
                  {" · "}
                  <a href={place.menu.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#17375d] underline">
                    open
                  </a>
                </>
              )}
            </p>
            {place.menu.note && (
              <p className="rounded-xl bg-[#fdf8ec] px-3 py-2 text-[10px] leading-relaxed text-[#8a6d2f]">
                {place.menu.note}
              </p>
            )}
            <div className="space-y-1.5">
              {place.menu.items.map((item) => {
                const saved = isMenuItemFavorite(place.id, item.id);
                return (
                  <div key={item.id} className="flex items-start gap-2 rounded-xl border border-[#edf0f4] px-2.5 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11.5px] font-semibold text-[#30435c]">{item.name}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[8.5px] font-bold ${
                            item.verification === "verified"
                              ? "bg-[#e7f4ec] text-[#2f7a52]"
                              : item.verification === "estimated"
                                ? "bg-[#fdf3e2] text-[#96702a]"
                                : "bg-[#f1f3f6] text-[#8a98a9]"
                          }`}
                        >
                          {VERIFICATION_LABELS[item.verification]}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-0.5 text-[10px] text-[#8a98a9]">{item.description}</p>
                      )}
                      <p className="mt-0.5 text-[11px] font-bold text-[#112844]">
                        {item.price !== null ? (
                          `${item.price.toLocaleString()} ${item.currency}`
                        ) : (
                          <span className="font-semibold text-[#8a98a9]">Price unavailable — contact restaurant</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleDish(item)}
                      aria-label={saved ? `Unsave ${item.name}` : `Save ${item.name}`}
                      aria-pressed={saved}
                      className={`shrink-0 text-lg ${saved ? "text-[#b45252]" : "text-[#c3ccd8]"}`}
                    >
                      {saved ? "♥" : "♡"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Budget calculator */}
      <section className="space-y-2.5 rounded-[15px] border border-[#e7ebf0] bg-white p-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] font-bold text-[#112844]">Budget calculator</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPeople((p) => Math.max(1, p - 1))}
              aria-label="Fewer people"
              className="h-6 w-6 rounded-full border border-[#d8dfe8] text-xs font-bold text-[#526b89]"
            >
              −
            </button>
            <span className="w-10 text-center text-[10.5px] font-bold text-[#30435c]">{people} ppl</span>
            <button
              onClick={() => setPeople((p) => Math.min(20, p + 1))}
              aria-label="More people"
              className="h-6 w-6 rounded-full border border-[#d8dfe8] text-xs font-bold text-[#526b89]"
            >
              +
            </button>
          </div>
        </div>

        {!place.menu || place.menu.items.length === 0 ? (
          <p className="text-[11px] text-[#7186a0]">No published menu — estimate your own budget before you go.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {place.menu.items.map((item) => (
                <Chip
                  key={item.id}
                  active={(qtyByItem[item.id] ?? 0) > 0}
                  onClick={() => setQty(item.id, (qtyByItem[item.id] ?? 0) > 0 ? 0 : 1)}
                >
                  {item.name}
                  {(qtyByItem[item.id] ?? 0) > 0 ? ` ×${qtyByItem[item.id]}` : ""}
                </Chip>
              ))}
            </div>
            <label className="block text-[10px] font-semibold text-[#7186a0]">
              Extra (transport, tips) — estimate
              <input
                inputMode="numeric"
                value={extras}
                onChange={(e) => setExtras(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e2e8ef] px-3 py-2 text-xs text-[#112844] outline-none focus:border-[#7892b4]"
              />
            </label>
            {budget && budget.lineCount > 0 ? (
              <div className="space-y-1 rounded-xl bg-[#f4f6f8] px-3 py-2.5 text-[11px] text-[#596575]">
                <div className="flex justify-between">
                  <span className="font-semibold">Estimated total</span>
                  <span className="font-bold text-[#112844]">
                    {budget.estimatedTotal.toLocaleString()} {budget.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Per person</span>
                  <span className="font-bold text-[#112844]">
                    {Math.round(budget.perPerson).toLocaleString()} {budget.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Backed by verified prices</span>
                  <span className="font-bold text-[#2f7a52]">
                    {budget.confirmedTotal.toLocaleString()} {budget.currency}
                  </span>
                </div>
                {budget.estimatedPortion > 0 && (
                  <p className="text-[9.5px] italic text-[#96702a]">
                    {budget.estimatedPortion.toLocaleString()} {budget.currency} of this is an estimate, not a
                    confirmed menu price.
                  </p>
                )}
                {budgetLineWarnings(budgetLines)}
              </div>
            ) : (
              <p className="text-[10.5px] text-[#8a98a9]">
                Tap dishes above to build a plan. Estimates only — confirmed at the restaurant.
              </p>
            )}
          </>
        )}
      </section>

      {/* Outfits — closet only */}
      <section className="space-y-2.5 rounded-[15px] border border-[#e7ebf0] bg-white p-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] font-bold text-[#112844]">What to wear</h2>
          <span className="text-[9.5px] font-semibold text-[#8a98a9]">from your closet</span>
        </div>
        {closet.length === 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] leading-relaxed text-[#7186a0]">
              Your closet is empty. FITLY only styles clothes you own — add a few pieces first.
            </p>
            <Button variant="secondary" onClick={() => navigate("/add")} className="text-xs">
              Add closet items
            </Button>
          </div>
        ) : outfits.length === 0 ? (
          <p className="text-[11px] text-[#7186a0]">No outfit generated yet — open the camera to get a look.</p>
        ) : (
          <div className="space-y-2.5">
            {outfits.map(({ outfit, reason }) => (
              <div key={outfit.id} className="rounded-xl border border-[#edf0f4] p-2.5">
                <div className="flex gap-2">
                  {outfit.itemIds.slice(0, 4).map((itemId) => {
                    const item = closet.find((i) => i.id === itemId);
                    if (!item) return null;
                    return (
                      <div key={itemId} className="h-14 w-14 shrink-0 rounded-lg bg-[#f1f5fb] p-1">
                        <GarmentImage
                          src={item.imageUrl}
                          alt={item.name}
                          slot={item.slot}
                          colorHex={item.colorHex}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#596575]">{reason}</p>
                <button
                  onClick={() => {
                    lockOutfit(outfit);
                    localStorage.setItem("fitly_selected_occasion", "date");
                    localStorage.setItem("fitly_has_requested_outfit", "true");
                    navigate("/");
                  }}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0B1F4B] dark:bg-white py-2 text-xs font-bold text-white dark:text-[#0B1F4B] shadow-xs active:scale-95 transition-transform"
                >
                  <span>🔒 Wear this look today</span>
                </button>
              </div>
            ))}
            <Button
              onClick={() =>
                navigate("/photo-style", {
                  state: { placeId: place.id, itemIds: outfits[0]?.outfit.itemIds ?? [] },
                })
              }
              className="w-full text-xs"
            >
              📸 Open Photo Style Camera with this place
            </Button>
          </div>
        )}
      </section>

      {/* Sources / honesty footer */}
      <section className="space-y-1 rounded-[15px] border border-[#e7ebf0] bg-white p-3.5">
        <h2 className="text-[11px] font-bold text-[#112844]">Where this data comes from</h2>
        <ul className="space-y-0.5 text-[10px] text-[#7186a0]">
          {place.sources.map((s) => (
            <li key={s}>· {s}</li>
          ))}
        </ul>
        <p className="text-[9.5px] text-[#98a4b4]">Recorded {place.addedAt} · prices never guessed.</p>
        <button
          onClick={() => { setReportSent(false); setReportOpen(true); }}
          className="mt-1 text-[10px] font-bold text-[#b45252]"
        >
          ✎ Report wrong info
        </button>
      </section>

      {/* Planner sheet */}
      {plannerOpen && (
        <DatePlanSheet placeId={place.id} onClose={() => setPlannerOpen(false)} />
      )}

      {/* Report sheet */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-navy-950/50 backdrop-blur-sm animate-fade"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="bottom-sheet max-h-[80vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-white p-5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Report incorrect information"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-navy-200" />
            {reportSent ? (
              <div className="pb-2 text-center">
                <p className="text-2xl">✓</p>
                <p className="mt-1 text-sm font-bold text-navy-900">Report filed</p>
                <p className="mx-auto mt-1.5 max-w-[300px] text-[11px] leading-relaxed text-[#7186a0]">
                  Thank you — FITLY re-checks reports against the listed sources before changing anything. Nothing
                  on this page is edited automatically.
                </p>
                <Button className="mt-4" onClick={() => setReportOpen(false)}>
                  Done
                </Button>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-bold text-navy-900">Report incorrect info</h3>
                <p className="mt-1 text-[11px] text-[#7186a0]">
                  Tell us what's wrong about {place.name}. Reports are checked by hand.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((r) => (
                    <Chip key={r} active={reportReason === r} onClick={() => setReportReason(r)}>
                      {REPORT_REASON_LABELS[r]}
                    </Chip>
                  ))}
                </div>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  placeholder="What did you see? (optional)"
                  className="mt-3 w-full resize-none rounded-xl border border-[#e2e8ef] px-3 py-2 text-xs outline-none focus:border-[#7892b4]"
                />
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => setReportOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={submitReport} className="flex-1">
                    Send report
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Free favourite cap note */}
      {favoritesFull && !isPro && !favorite && (
        <ProLock
          onUpgrade={() => navigate("/upgrade")}
          note="Free keeps 10 favourites (places + dishes). Pro saves unlimited."
        />
      )}
    </div>
  );
}

/** Hero photo with the same honest fallback as PlaceImage. */
function PlaceHero({ place, src }: { place: Place; src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="grid h-52 w-full place-items-center rounded-[18px] bg-gradient-to-br from-[#0b1f3a] to-[#1c3c68] text-white"
        aria-label={`${place.name} photo unavailable`}
      >
        <span className="text-4xl font-extrabold tracking-tight opacity-80">{place.name.charAt(0)}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${place.name}, ${place.neighborhood}`}
      onError={() => setFailed(true)}
      className="h-52 w-full rounded-[18px] object-cover"
    />
  );
}

/** Honest warnings for order lines whose prices aren't verified. */
function budgetLineWarnings(lines: { verification: string; name: string }[]) {
  const unavailable = lines.filter((l) => l.verification === "unavailable");
  if (unavailable.length === 0) return null;
  return (
    <p className="text-[9.5px] italic text-[#8a9099]">
      {unavailable.length} selected item{unavailable.length === 1 ? "" : "s"} without a listed price — contact the
      restaurant before you go.
    </p>
  );
}
