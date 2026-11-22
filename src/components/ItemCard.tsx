import GarmentImage from "./GarmentImage";
import type { ClosetItem } from "../lib/types";

export function estimatePrice(slot: string, category: string): number {
  if (category === "traditional") return 180;
  switch (slot) {
    case "shoes":
      return 120;
    case "top":
      return category === "outerwear" ? 150 : 55;
    case "bottom":
      return 75;
    case "cap":
      return 35;
    case "accessory":
    case "ring":
      return 45;
    default:
      return 60;
  }
}

export function getCostPerWear(item: ClosetItem): { label: string; sub: string; highlight: boolean } {
  const price = estimatePrice(item.slot, item.category);
  if (item.timesWorn <= 0) {
    return { label: "New", sub: "Unworn", highlight: false };
  }
  const cpw = Math.max(1, Math.round(price / item.timesWorn));
  return { label: `$${cpw}/wear`, sub: `${item.timesWorn}× worn`, highlight: item.timesWorn >= 3 };
}

export default function ItemCard({
  item,
  onClick,
}: {
  item: ClosetItem;
  onClick?: () => void;
}) {
  const cpw = getCostPerWear(item);

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center text-center transition-transform active:scale-95 py-1 focus:outline-none"
    >
      {/* Circular Garment Pedestal matching Reference Image 4 */}
      <div className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-[#F3F6FA] dark:bg-[#152238] p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] transition-all group-hover:bg-[#E8EEF5] dark:group-hover:bg-[#1E2E4B] group-hover:shadow-md">
        <GarmentImage
          src={item.imageUrl}
          alt={item.name}
          slot={item.slot}
          colorHex={item.colorHex}
          transparent={true}
          className="max-h-[72px] max-w-[72px] object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.14)] dark:drop-shadow-[0_8px_14px_rgba(0,0,0,0.45)] transition-transform group-hover:scale-105"
        />

        {/* Cost-Per-Wear badge */}
        <span
          className={`absolute -top-1 right-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold shadow-sm ${
            cpw.highlight
              ? "bg-emerald-500 text-white ring-1 ring-emerald-300"
              : item.timesWorn === 0
              ? "bg-[#0B1F4B] text-white dark:bg-white dark:text-[#0B1F4B]"
              : "bg-[#E2E8F0] text-[#475569] dark:bg-[#1E293B] dark:text-[#94A3B8]"
          }`}
        >
          {cpw.label}
        </span>

        {item.category === "traditional" && (
          <span className="absolute bottom-1 rounded-full bg-[#0B1F4B] px-1.5 py-0.5 text-[6.5px] font-black tracking-wide text-white shadow-sm">
            HABESHA
          </span>
        )}
      </div>

      {/* Item info */}
      <div className="mt-2 w-full px-1">
        <p className="truncate text-[11px] font-bold text-[#0B1F4B] dark:text-white leading-tight">
          {item.name}
        </p>
        <p className="truncate text-[9.5px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
          {item.color} · {item.slot}
        </p>
      </div>
    </button>
  );
}
