import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  COLOR_PALETTE,
  SEASON_LABELS,
  SLOT_LABELS,
  STYLE_LABELS,
  hexForColor,
  isNeutralColor,
  type Category,
  type Season,
  type Slot,
  type Style,
} from "../lib/types";
import { slotForCategory } from "../lib/ai";
import { Chip } from "./ui";

export interface ItemFieldValues {
  name: string;
  category: Category;
  slot: Slot;
  color: string;
  colorHex: string;
  isNeutral: boolean;
  style: Style;
  season: Season;
  tags: string[];
}

const STYLES: Style[] = ["casual", "classy", "sporty", "streetwear", "formal", "traditional"];
const SEASONS: Season[] = ["all", "spring", "summer", "autumn", "winter"];
const SLOTS: Slot[] = ["top", "bottom", "shoes", "cap", "ring", "accessory"];

const labelCls = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-500";
const inputCls =
  "w-full rounded-xl border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500";

export default function ItemFields({
  values,
  onChange,
}: {
  values: ItemFieldValues;
  onChange: (patch: Partial<ItemFieldValues>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Item name</label>
        <input
          className={inputCls}
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Navy merino sweater"
        />
      </div>

      <div>
        <label className={labelCls}>Category</label>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {CATEGORY_ORDER.map((c) => (
            <Chip
              key={c}
              active={values.category === c}
              onClick={() =>
                onChange({
                  category: c,
                  slot: slotForCategory(c),
                })
              }
            >
              {CATEGORY_LABELS[c]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Colour</label>
          <div className="flex items-center gap-2">
            <span
              className="h-9 w-9 shrink-0 rounded-lg border border-navy-200"
              style={{ backgroundColor: values.colorHex }}
            />
            <select
              className={inputCls}
              value={values.color}
              onChange={(e) => {
                const color = e.target.value;
                onChange({
                  color,
                  colorHex: hexForColor(color),
                  isNeutral: isNeutralColor(color),
                });
              }}
            >
              {COLOR_PALETTE.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-[10px] text-navy-400">
            {values.isNeutral ? "Neutral — pairs with anything" : "Bold — max one per outfit"}
          </p>
        </div>

        <div>
          <label className={labelCls}>Slot</label>
          <select
            className={inputCls}
            value={values.slot}
            onChange={(e) => onChange({ slot: e.target.value as Slot })}
          >
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {SLOT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Style</label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <Chip key={s} active={values.style === s} onClick={() => onChange({ style: s })}>
              {STYLE_LABELS[s]}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Season</label>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <Chip key={s} active={values.season === s} onClick={() => onChange({ season: s })}>
              {SEASON_LABELS[s]}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Tags</label>
        <input
          className={inputCls}
          value={values.tags.join(", ")}
          onChange={(e) =>
            onChange({
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          placeholder="cotton, knit, ethiopian"
        />
      </div>
    </div>
  );
}
