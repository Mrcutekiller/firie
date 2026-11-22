import GarmentImage from "./GarmentImage";
import { cn } from "./ui";
import { SLOT_LABELS, type ClosetItem, type Outfit } from "../lib/types";

const SLOT_ORDER: Record<string, number> = {
  cap: 0,
  accessory: 1,
  top: 2,
  bottom: 3,
  shoes: 4,
  ring: 5,
};

/**
 * Renders an outfit as a head-to-toe vertical flat-lay. Pieces overlap slightly
 * to mimic a mannequin / dress-me board, giving the user an instant read of the
 * whole look before they scroll to the details.
 */
export default function OutfitView({
  outfit,
  itemById,
  className,
  showLabels = false,
  compact = false,
}: {
  outfit: Outfit;
  itemById: (id: string) => ClosetItem | undefined;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}) {
  const items = outfit.itemIds
    .map(itemById)
    .filter((i): i is ClosetItem => Boolean(i))
    .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);

  if (items.length === 0) return null;

  return (
    <div className={className}>
      <div className={cn("fit-stack", compact && "fit-stack--compact")}>
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="fit-piece animate-pop"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <GarmentImage
              src={item.imageUrl}
              alt={item.name}
              slot={item.slot}
              colorHex={item.colorHex}
              className={idx === 1 ? "fit-hero-glow rounded-2xl" : ""}
            />
          </div>
        ))}
      </div>

      {showLabels && (
        <div className="mt-6 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white px-3 py-2 shadow-sm"
            >
              <span className="h-3 w-3 shrink-0 rounded-full border border-white shadow" style={{ backgroundColor: item.colorHex }} />
              <span className="flex-1 truncate text-sm font-medium text-navy-800">{item.name}</span>
              <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold text-navy-500">
                {SLOT_LABELS[item.slot]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
