/**
 * FITLY domain model.
 *
 * All identifiers are strings so the same shapes can round-trip to Postgres
 * (uuid columns) once the cloud backend is connected.
 */

/** Functional role an item plays when assembling an outfit. */
export type Slot = "top" | "bottom" | "shoes" | "cap" | "ring" | "accessory";

/** How the item is grouped inside "My Closet". */
export type Category =
  | "tops"
  | "bottoms"
  | "shoes"
  | "caps"
  | "rings"
  | "accessories"
  | "traditional";

export type Style =
  | "casual"
  | "classy"
  | "sporty"
  | "streetwear"
  | "formal"
  | "traditional";

export type Season = "spring" | "summer" | "autumn" | "winter" | "all";

export type EventType =
  | "none"
  | "date"
  | "work"
  | "wedding"
  | "party"
  | "church"
  | "casual-outing";

export type Plan = "free" | "pro";

export interface ClosetItem {
  id: string;
  name: string;
  category: Category;
  slot: Slot;
  /** Canonical colour name, e.g. "Navy". */
  color: string;
  /** Dominant colour sampled from the photo. */
  colorHex: string;
  isNeutral: boolean;
  style: Style;
  season: Season;
  /** Compressed, background-removed image as a data URL. */
  imageUrl: string;
  tags: string[];
  createdAt: number;
  /** Epoch ms of the last time this item appeared in a confirmed outfit. */
  lastWornAt: number | null;
  timesWorn: number;
}

export interface WeatherSnapshot {
  city: string;
  temperatureC: number;
  condition: string;
  /** Short emoji used in the UI. */
  icon: string;
  capturedAt: number;
}

export interface Outfit {
  id: string;
  itemIds: string[];
  score: number;
  /** Why the pieces were paired; Pro may add weather and event context. */
  reason?: string;
  event?: EventType;
  weather?: WeatherSnapshot;
  createdAt: number;
}

export interface OutfitLog {
  id: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  itemIds: string[];
  event: EventType;
  reason?: string;
  weatherSummary?: string;
  createdAt: number;
}

export interface UserProfile {
  name: string;
  email?: string;
  city: string;
  /** Chosen at sign-up — drives the gender-aware pose figure. */
  gender: "men" | "women";
  plan: Plan;
  units: "metric" | "imperial";
  avoidRecentlyWorn: boolean;
  /** Pro subscription start (epoch ms) — null for free users. */
  proSince: number | null;
  /** Pro subscription expiry date / next renewal (epoch ms). */
  proExpiresAt?: number | null;
  billingCycle?: "monthly" | "yearly";
  /** Body and fit styling metadata */
  height?: string;
  bodyFit?: string;
  ageGroup?: string;
  preferredStyle?: string;
  traditionalWear?: string;
}

export interface NewItemDraft {
  imageUrl: string;
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

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

export const FREE_ITEM_LIMIT = 30;

/* -------------------------------------------------------------------------- */
/* Feature data — Date Spots + Photo Style Camera (persisted per account)       */
/* -------------------------------------------------------------------------- */

/** Daily (1/day) and Weekly (4/week) Photo Style recommendation usage for Free plan. */
export interface PhotoUsage {
  today?: string;
  dailyCount?: number;
  date: string;
  count: number;
}

/** Daily (1/day) and Weekly (3/week) outfit look usage for the Free plan. */
export interface OutfitUsage {
  /** ISO date of the last granted look, YYYY-MM-DD. */
  today: string;
  /** Looks granted today (0 or 1 on the Free plan). */
  dailyCount: number;
  /** ISO week key of the last granted look. */
  week: string;
  /** Looks granted this week. */
  weeklyCount: number;
}

/** A pose the user actually shot with — damped so poses don't repeat. */
export interface PoseUse {
  poseId: string;
  /** Epoch ms. */
  at: number;
}

export type DatePlanStatus = "upcoming" | "completed";

/** A saved date plan (§3.8). */
export interface DatePlan {
  id: string;
  name: string;
  placeId: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** 24h time, HH:MM. */
  time: string;
  people: number;
  /** Outfit item ids chosen from the user's closet. */
  itemIds: string[];
  /** Planned budget in the place's currency. */
  budget: number;
  /** Planned menu order — prices keep their honest verification state. */
  order: DatePlanOrderLine[];
  /** Sum of priced order lines, or null when nothing is priced yet. */
  estimatedTotal: number | null;
  notes: string;
  status: DatePlanStatus;
  createdAt: number;
}

/** One planned menu line inside a date plan. */
export interface DatePlanOrderLine {
  /** Menu item id from the place's menu (or a local custom line id). */
  itemId: string;
  name: string;
  qty: number;
  /** Unit price in ETB, or null when the venue doesn't publish it. */
  unitPrice: number | null;
  currency: string;
  /** Same honesty states as the venue menu — never invented. */
  verification: "verified" | "estimated" | "unavailable";
}

/** Saved place favourite, optionally filed under a collection. */
export interface FavoritePlace {
  placeId: string;
  collection: string;
  createdAt: number;
}

/** Saved menu item favourite. */
export interface FavoriteMenuItem {
  placeId: string;
  itemId: string;
  createdAt: number;
}

/** Free plan limits */
export const FREE_DAILY_OUTFIT_LIMIT = 1;
export const FREE_WEEKLY_OUTFIT_LIMIT = 3;
export const FREE_DAILY_PHOTO_STYLE_LIMIT = 1;
export const FREE_WEEKLY_PHOTO_STYLE_LIMIT = 4;
export const FREE_FAVORITE_LIMIT = 10;
export const FREE_DATE_PLAN_LIMIT = 3;

export const CATEGORY_LABELS: Record<Category, string> = {
  tops: "Tops",
  bottoms: "Bottoms",
  shoes: "Shoes",
  caps: "Caps",
  rings: "Rings",
  accessories: "Accessories",
  traditional: "Traditional",
};

export const CATEGORY_ORDER: Category[] = [
  "tops",
  "bottoms",
  "shoes",
  "traditional",
  "caps",
  "rings",
  "accessories",
];

export const SLOT_LABELS: Record<Slot, string> = {
  top: "Top",
  bottom: "Bottom",
  shoes: "Shoes",
  cap: "Cap",
  ring: "Ring",
  accessory: "Accessory",
};

/** Slots that every valid outfit must contain. */
export const REQUIRED_SLOTS: Slot[] = ["top", "bottom", "shoes"];
/** Slots that are included when the closet has them. */
export const OPTIONAL_SLOTS: Slot[] = ["cap", "ring", "accessory"];

export const STYLE_LABELS: Record<Style, string> = {
  casual: "Casual",
  classy: "Classy",
  sporty: "Sporty",
  streetwear: "Streetwear",
  formal: "Formal",
  traditional: "Traditional",
};

export const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
  all: "All seasons",
};

export const EVENT_LABELS: Record<EventType, string> = {
  none: "Everyday",
  date: "Date",
  work: "Work",
  wedding: "Wedding",
  party: "Party",
  church: "Church",
  "casual-outing": "Casual outing",
};

/** Which styles suit which occasions — used by the Pro event scorer. */
export const EVENT_AFFINITY: Record<EventType, Style[]> = {
  none: ["casual", "classy", "sporty", "streetwear", "formal", "traditional"],
  date: ["classy", "formal", "streetwear"],
  work: ["classy", "formal", "casual"],
  wedding: ["classy", "formal", "traditional"],
  party: ["classy", "streetwear", "formal"],
  church: ["classy", "formal", "traditional"],
  "casual-outing": ["casual", "sporty", "streetwear"],
};

/** Canonical palette with neutrals flagged and a representative hex swatch. */
export const COLOR_PALETTE: { name: string; hex: string; neutral: boolean }[] = [
  { name: "White", hex: "#FFFFFF", neutral: true },
  { name: "Ivory", hex: "#F4F1E9", neutral: true },
  { name: "Cream", hex: "#EFE3C6", neutral: true },
  { name: "Beige", hex: "#D9C7A7", neutral: true },
  { name: "Tan", hex: "#C19A6B", neutral: true },
  { name: "Brown", hex: "#6B4A2B", neutral: true },
  { name: "Grey", hex: "#9AA0A6", neutral: true },
  { name: "Charcoal", hex: "#3B3F44", neutral: true },
  { name: "Black", hex: "#1A1A1A", neutral: true },
  { name: "Navy", hex: "#1C3C68", neutral: true },
  { name: "Denim", hex: "#4A6785", neutral: true },
  { name: "Olive", hex: "#6B7A3B", neutral: false },
  { name: "Green", hex: "#2E7D32", neutral: false },
  { name: "Teal", hex: "#177E89", neutral: false },
  { name: "Blue", hex: "#2563EB", neutral: false },
  { name: "Sky", hex: "#7FB2E5", neutral: false },
  { name: "Purple", hex: "#6D28D9", neutral: false },
  { name: "Pink", hex: "#E86AA6", neutral: false },
  { name: "Red", hex: "#C62828", neutral: false },
  { name: "Maroon", hex: "#7B1E3A", neutral: false },
  { name: "Orange", hex: "#E07B39", neutral: false },
  { name: "Mustard", hex: "#D4A72C", neutral: false },
  { name: "Yellow", hex: "#F2C200", neutral: false },
  { name: "Gold", hex: "#C9A227", neutral: false },
  { name: "Silver", hex: "#C0C4CC", neutral: true },
];

export const NEUTRAL_COLOR_NAMES = new Set(
  COLOR_PALETTE.filter((c) => c.neutral).map((c) => c.name.toLowerCase())
);

export function isNeutralColor(name: string): boolean {
  return NEUTRAL_COLOR_NAMES.has(name.trim().toLowerCase());
}

export function hexForColor(name: string): string {
  const found = COLOR_PALETTE.find(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase()
  );
  return found?.hex ?? "#9AA0A6";
}
