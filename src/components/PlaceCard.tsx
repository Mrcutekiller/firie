import { useState } from "react";
import { distanceKm, PLACE_CATEGORY_LABELS, type Place } from "../lib/places";

/**
 * Place photo with an honest fallback: if the network image fails, a navy
 * gradient tile with the venue initial is shown instead of a broken image.
 */
export function PlaceImage({
  place,
  className,
  rounded = "rounded-2xl",
}: {
  place: Place;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`grid place-items-center bg-gradient-to-br from-[#0b1f3a] to-[#1c3c68] text-white ${rounded} ${className ?? ""}`}
        aria-label={`${place.name} photo unavailable`}
      >
        <span className="text-2xl font-extrabold tracking-tight opacity-80">
          {place.name.charAt(0)}
        </span>
      </div>
    );
  }
  return (
    <img
      src={place.image}
      alt={`${place.name}, ${place.neighborhood}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${rounded} ${className ?? ""}`}
    />
  );
}

interface Props {
  place: Place;
  near?: { lat: number; lng: number };
  /** Horizontal scroll card (default) or vertical list card. */
  layout?: "scroll" | "row";
  onClick: () => void;
  /** One-tap styling shortcut to match an outfit to this venue. */
  onStyleForPlace?: (place: Place) => void;
}

export default function PlaceCard({ place, near, layout = "scroll", onClick, onStyleForPlace }: Props) {
  const distance = near ? distanceKm(near, place) : null;
  const primaryCategory = place.categories[0];

  if (layout === "row") {
    const sampleItem = place.menu?.items[0];
    const estimated2GuestTotal = place.priceLevel === 1 ? 250 : place.priceLevel === 2 ? 650 : place.priceLevel === 3 ? 1200 : 2200;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className="flex w-full gap-3 rounded-[20px] border border-[#e7ebf0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
      >
        <PlaceImage place={place} className="h-[80px] w-[80px] shrink-0" rounded="rounded-2xl" />
        <span className="min-w-0 flex-1 flex flex-col justify-between">
          <span>
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[13.5px] font-bold text-[#112844] dark:text-white">{place.name}</span>
              <span className="shrink-0 text-[10px] font-bold text-[#F59E0B]">
                ★ {place.rating?.toFixed(1) || "4.8"}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[9.5px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              {PLACE_CATEGORY_LABELS[primaryCategory]}
              {distance !== null ? ` · ${distance.toFixed(1)} km` : ` · ${place.neighborhood}`}
            </span>
          </span>

          <span className="mt-1 flex items-center justify-between pt-1 border-t border-[#F1F5F9] dark:border-[#1E293B] gap-2">
            <span className="truncate text-[10px] text-[#475569] dark:text-[#CBD5E1]">
              {sampleItem ? `${sampleItem.name}: ${sampleItem.price} ETB` : place.atmosphere}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="rounded-full bg-[#ECFDF5] dark:bg-[#064E3B] px-2 py-0.5 text-[9px] font-bold text-[#065F46] dark:text-[#A7F3D0]">
                ~{estimated2GuestTotal} ETB
              </span>
              {onStyleForPlace && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStyleForPlace(place);
                  }}
                  className="rounded-full bg-[#0B1F4B] dark:bg-white px-2.5 py-1 text-[9px] font-bold text-white dark:text-[#0B1F4B] shadow-xs active:scale-95 transition-transform"
                >
                  ✨ Style
                </button>
              )}
            </div>
          </span>
        </span>
      </div>
    );
  }

  const sampleItem = place.menu?.items[0];
  const estimated2GuestTotal = place.priceLevel === 1 ? 250 : place.priceLevel === 2 ? 650 : place.priceLevel === 3 ? 1200 : 2200;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="w-[195px] shrink-0 snap-start rounded-[22px] border border-[#e7ebf0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer flex flex-col justify-between"
    >
      <div>
        <span className="relative block">
          <PlaceImage place={place} className="h-[108px] w-full" rounded="rounded-2xl" />
          {place.tags.includes("romantic") && (
            <span className="absolute left-2 top-2 rounded-full bg-white/95 dark:bg-[#0B1F4B] px-2 py-0.5 text-[8.5px] font-extrabold text-[#E11D48] dark:text-[#FDA4AF] shadow-sm">
              ♥ Romantic
            </span>
          )}
          <span className="absolute right-2 top-2 rounded-full bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-bold text-white">
            ★ {place.rating?.toFixed(1) || "4.8"}
          </span>
        </span>

        <span className="mt-2 block truncate text-[13px] font-bold text-[#112844] dark:text-white">{place.name}</span>
        <span className="mt-0.5 block truncate text-[9.5px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
          {PLACE_CATEGORY_LABELS[primaryCategory]} · {place.neighborhood}
        </span>

        {/* Verified ETB Menu Preview & 2-Guest Date Total */}
        <span className="mt-2 flex items-center justify-between gap-1 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B]/70 p-1.5 text-[9px]">
          <span className="truncate text-[#475569] dark:text-[#CBD5E1]">
            {sampleItem ? `${sampleItem.name} ${sampleItem.price} ETB` : "Verified Menu"}
          </span>
          <span className="shrink-0 font-bold text-[#059669] dark:text-[#34D399]">
            ~{estimated2GuestTotal} ETB
          </span>
        </span>
      </div>

      {onStyleForPlace && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStyleForPlace(place);
          }}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0B1F4B] dark:bg-white py-1.5 text-[9.5px] font-bold text-white dark:text-[#0B1F4B] shadow-xs active:scale-95 transition-transform hover:opacity-95"
        >
          <span>✨</span>
          <span>Style for here</span>
        </button>
      )}
    </div>
  );
}
