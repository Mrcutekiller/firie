/**
 * FITLY Date Spots — planning intelligence.
 *
 * Endpoint mapping (implemented here, wrapped by api.ts):
 *   POST /api/date-planner/calculate → calculateBudget()
 *   POST /api/date-planner/save      → handled by the store (saveDatePlan)
 *   GET  /api/date-planner           → handled by the store (datePlans)
 *   POST /api/places/recommend       → recommendPlaces()
 *
 * The outfit bridge (§4.1) only ever recommends pieces the user already owns
 * in their FITLY closet — never new purchases.
 */

import { generateOutfits, seasonForDate } from "./engine";
import {
  distanceKm,
  estimatedPerPerson,
  listPlaces,
  PLACE_CATEGORY_LABELS,
  PLACE_TAG_LABELS,
  type Currency,
  type MenuItem,
  type Place,
  type PlaceCategory,
  type PlaceTag,
  type Verification,
} from "./places";
import type { ClosetItem, Outfit, Plan, Style } from "./types";

/* -------------------------------------------------------------------------- */
/* Budget calculator — POST /api/date-planner/calculate                        */
/* -------------------------------------------------------------------------- */

export type BudgetLineKind = "food" | "drink" | "dessert" | "extra";

export interface BudgetLine {
  key: string;
  itemId?: string;
  name: string;
  unitPrice: number;
  qty: number;
  category: MenuItem["category"];
  verification: Verification;
  kind: BudgetLineKind;
}

export interface BudgetCalcInput {
  budget: number;
  people: number;
  lines: BudgetLine[];
  /** Optional extras — transport, tips, tickets (always estimates). */
  extras: number;
  currency: Currency;
}

export interface BudgetCalcResult {
  currency: Currency;
  foodTotal: number;
  drinkTotal: number;
  dessertTotal: number;
  extrasTotal: number;
  estimatedTotal: number;
  perPerson: number;
  remaining: number;
  overBudget: boolean;
  /** Portion of the total backed by verified menu prices. */
  confirmedTotal: number;
  /** Portion that is an estimate (badged as such in the UI). */
  estimatedPortion: number;
  lineCount: number;
  people: number;
  budget: number;
  valid: boolean;
}

export function lineKindFor(category: MenuItem["category"]): BudgetLineKind {
  if (category === "coffee" || category === "tea" || category === "soft-drinks" || category === "other-beverages")
    return "drink";
  if (category === "desserts") return "dessert";
  return "food";
}

export function lineFromMenuItem(item: MenuItem, qty = 1): BudgetLine | null {
  if (item.price === null) return null; // unavailable prices can't be budgeted
  return {
    key: `${item.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    itemId: item.id,
    name: item.name,
    unitPrice: item.price,
    qty,
    category: item.category,
    verification: item.verification,
    kind: lineKindFor(item.category),
  };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function calculateBudget(input: BudgetCalcInput): BudgetCalcResult {
  const budget = Number.isFinite(input.budget) ? Math.max(0, input.budget) : 0;
  const people = clamp(Math.round(input.people || 1), 1, 50);
  const extras = Number.isFinite(input.extras) ? Math.max(0, input.extras) : 0;
  const lines = input.lines.filter((l) => l.qty > 0 && l.unitPrice >= 0);

  const sumKind = (kind: BudgetLineKind) =>
    lines.filter((l) => l.kind === kind).reduce((s, l) => s + l.unitPrice * l.qty, 0);

  const foodTotal = sumKind("food");
  const drinkTotal = sumKind("drink");
  const dessertTotal = sumKind("dessert");
  const extrasTotal = extras;
  const estimatedTotal = foodTotal + drinkTotal + dessertTotal + extrasTotal;
  const confirmedTotal = lines
    .filter((l) => l.verification === "verified")
    .reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const estimatedPortion = Math.max(0, estimatedTotal - confirmedTotal - extrasTotal);
  const remaining = budget - estimatedTotal;

  return {
    currency: input.currency,
    foodTotal,
    drinkTotal,
    dessertTotal,
    extrasTotal,
    estimatedTotal,
    perPerson: Math.round((estimatedTotal / people) * 100) / 100,
    remaining,
    overBudget: budget > 0 && estimatedTotal > budget,
    confirmedTotal,
    estimatedPortion,
    lineCount: lines.length,
    people,
    budget,
    valid: budget >= 0 && people >= 1,
  };
}

/** Total for a whole party using per-person estimates (AI recommendations). */
export function estimatePartyTotal(place: Place, people: number): number | null {
  const perPerson = estimatedPerPerson(place);
  return perPerson === null ? null : perPerson * Math.max(1, people);
}

/* -------------------------------------------------------------------------- */
/* Date Spots → My Outfit (§4.1)                                               */
/* -------------------------------------------------------------------------- */

/** Vibe → which closet styles read right in that setting. */
const VIBE_STYLES: Record<string, Style[]> = {
  romantic: ["classy", "formal"],
  classy: ["classy", "formal"],
  luxury: ["formal", "classy"],
  traditional: ["traditional"],
  casual: ["casual", "streetwear"],
  outdoor: ["casual", "sporty", "streetwear"],
  lively: ["streetwear", "casual"],
  quiet: ["classy", "casual"],
};

const CATEGORY_STYLES: Partial<Record<PlaceCategory, Style[]>> = {
  "romantic-dinner": ["classy", "formal"],
  "coffee-date": ["casual", "streetwear"],
  "luxury-date": ["formal", "classy"],
  "traditional-food": ["traditional", "casual"],
  rooftop: ["classy", "casual"],
  "outdoor-date": ["casual", "sporty"],
};

export function stylesForPlace(place: Place): Style[] {
  const styles: Style[] = [];
  const push = (s?: Style) => {
    if (s && !styles.includes(s)) styles.push(s);
  };
  for (const vibe of place.vibes) for (const s of VIBE_STYLES[vibe] ?? []) push(s);
  for (const cat of place.categories) for (const s of CATEGORY_STYLES[cat] ?? []) push(s);
  if (styles.length === 0) (["casual", "classy"] as Style[]).forEach((s) => push(s));
  return styles;
}

export interface PlaceOutfitRecommendation {
  outfit: Outfit;
  /** Why this outfit fits THIS place — shown under the card. */
  reason: string;
  /** How many pieces from the closet it uses. */
  pieceCount: number;
}

/**
 * Recommends outfits from the user's own closet for a selected place.
 * Free users get one look; Pro gets several with fuller explanations.
 */
export function outfitsForPlace(
  closet: ClosetItem[],
  place: Place,
  opts: { plan: Plan; recentItemIds?: string[]; limit?: number }
): PlaceOutfitRecommendation[] {
  if (closet.length === 0) return [];
  const allowed = stylesForPlace(place);
  const limit = opts.limit ?? (opts.plan === "pro" ? 3 : 1);

  const filtered = closet.filter((item) => allowed.includes(item.style));
  const runOn = filtered.length >= 3 ? filtered : closet;

  const result = generateOutfits(runOn, {
    plan: opts.plan,
    event: "date",
    recentItemIds: opts.recentItemIds ?? [],
    season: seasonForDate(),
  });

  const vibeWord =
    place.vibes[0] ?? (place.categories.includes("traditional-food") ? "traditional" : "casual");
  const stylesWord = allowed.slice(0, 2).join(" and ");

  return result.outfits.slice(0, limit).map((outfit) => {
    const items = outfit.itemIds
      .map((id) => closet.find((i) => i.id === id))
      .filter((i): i is ClosetItem => Boolean(i));
    const top = items.find((i) => i.slot === "top");
    const bottom = items.find((i) => i.slot === "bottom");
    const shoes = items.find((i) => i.slot === "shoes");

    const reason =
      opts.plan === "pro"
        ? `${place.name} reads ${vibeWord} — ${stylesWord} pieces land right there. ` +
          (top && bottom
            ? `Your ${top.color.toLowerCase()} ${top.slot === "top" && top.category === "traditional" ? "look" : "top"} with ${bottom.color.toLowerCase()} bottoms and ${shoes ? shoes.color.toLowerCase() + " shoes" : "your shoes"} matches the room without trying too hard.`
            : "All pieces come from your closet.") +
          ` Only clothes you already own are shown.`
        : `${place.name} is ${vibeWord} — ${stylesWord} pieces fit the setting. From your closet.`;

    return { outfit, reason, pieceCount: items.length };
  });
}

/* -------------------------------------------------------------------------- */
/* AI place recommendations — POST /api/places/recommend                       */
/* -------------------------------------------------------------------------- */

export interface PlaceRecommendationInput {
  text?: string;
  budget?: number;
  people?: number;
  occasion?: PlaceCategory;
  /** Soft preferences — raise the score without filtering anything out. */
  boost?: PlaceCategory[];
  near?: { lat: number; lng: number };
  maxDistanceKm?: number;
  /** Pro-only inputs — free users get budget + distance + occasion matching. */
  atmosphere?: PlaceTag[];
  foodPrefs?: string[];
  city?: string;
  favorites?: string[];
  plan: Plan;
}

export interface PlaceRecommendation {
  place: Place;
  score: number;
  reason: string;
  /** Estimated total for the party, or null when pricing is unconfirmed. */
  estTotalForPeople: number | null;
  distanceKm: number | null;
}

export interface PlaceRecommendationResult {
  results: PlaceRecommendation[];
  /** Honest explanation when nothing suitable exists. */
  note?: string;
}

export function recommendPlaces(input: PlaceRecommendationInput): PlaceRecommendationResult {
  const isPro = input.plan === "pro";
  const people = Math.max(1, input.people ?? 2);
  const favorites = new Set(input.favorites ?? []);

  // Free plan: budget + distance + occasion. Pro adds atmosphere & food prefs.
  const atmosphere = isPro ? input.atmosphere ?? [] : [];
  const foodPrefs = isPro ? (input.foodPrefs ?? []).map((p) => p.toLowerCase()) : [];

  let candidates = listPlaces({
    city: input.city,
    categories: input.occasion ? [input.occasion] : undefined,
    maxBudgetPerPerson: input.budget ? Math.floor(input.budget / people) : undefined,
    maxDistanceKm: isPro || input.maxDistanceKm ? input.maxDistanceKm : undefined,
    near: input.near,
    text: input.text,
  });

  // When a budget is given, prefer places whose whole-party estimate fits.
  if (input.budget && input.budget > 0) {
    const withKnown = candidates.filter((p) => estimatePartyTotal(p, people) !== null);
    const knownFits = withKnown.filter((p) => (estimatePartyTotal(p, people) ?? Infinity) <= input.budget!);
    // Unknown pricing is kept but scored lower — never dropped silently.
    candidates = knownFits.length > 0 ? [...knownFits, ...candidates.filter((p) => !knownFits.includes(p))] : candidates;
  }

  const scored: PlaceRecommendation[] = candidates.map((place) => {
    let score = 30;
    const reasons: string[] = [];

    if (input.occasion && place.categories.includes(input.occasion)) {
      score += 22;
      reasons.push(`a ${PLACE_CATEGORY_LABELS[input.occasion].toLowerCase()} pick`);
    }

    for (const vibe of input.boost ?? []) {
      if (place.categories.includes(vibe)) {
        score += 12;
        reasons.push(PLACE_CATEGORY_LABELS[vibe].toLowerCase());
        break;
      }
    }

    const total = estimatePartyTotal(place, people);
    if (input.budget && input.budget > 0) {
      if (total === null) {
        score += 6;
        reasons.push("prices unconfirmed — check the menu");
      } else if (total <= input.budget) {
        score += 25;
        reasons.push(`≈ ${total.toLocaleString()} ${place.menu?.items[0]?.currency ?? "ETB"} for ${people} within budget`);
      } else {
        score -= 18;
      }
    }

    if (input.near && !input.maxDistanceKm) {
      const km = distanceKm(input.near, place);
      if (km <= 3) {
        score += 15;
        reasons.push(`${km.toFixed(1)} km away`);
      } else if (km <= 8) {
        score += 8;
      }
    }

    for (const tag of atmosphere) {
      if (place.tags.includes(tag)) {
        score += 10;
        reasons.push(PLACE_TAG_LABELS[tag].toLowerCase());
      }
    }

    for (const pref of foodPrefs) {
      if (place.cuisine.some((c) => c.toLowerCase().includes(pref)) || place.description.toLowerCase().includes(pref)) {
        score += 10;
        reasons.push(`serves ${pref}`);
        break;
      }
    }

    if (favorites.has(place.id)) {
      score += 4;
      reasons.push("you saved this one");
    }

    if (place.rating) score += Math.round(place.rating);

    return {
      place,
      score,
      reason: reasons.length
        ? reasons.slice(0, 3).join(" · ")
        : `A solid ${place.city} option for ${people}.`,
      estTotalForPeople: total,
      distanceKm: input.near ? distanceKm(input.near, place) : null,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, 6).filter((r) => r.score > 30);

  if (results.length === 0) {
    const bits: string[] = [];
    if (input.budget) bits.push(`under ${input.budget.toLocaleString()} for ${people}`);
    if (input.occasion) bits.push(`for a ${PLACE_CATEGORY_LABELS[input.occasion].toLowerCase()}`);
    if (input.city) bits.push(`in ${input.city}`);
    return {
      results: [],
      note:
        bits.length > 0
          ? `No listed place matches ${bits.join(" and ")} right now. Try raising the budget, widening the distance, or removing a filter — we only show real, listed venues.`
          : "No listed place matches those filters right now. We only show real, listed venues — nothing is invented.",
    };
  }

  return {
    results,
    note: !isPro
      ? "Free matching uses budget, distance and occasion. Pro adds atmosphere and food preferences."
      : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Favorites + plans                                                           */
/* -------------------------------------------------------------------------- */

export const DATE_COLLECTIONS = ["Romantic", "Coffee", "Dinner", "Weekend", "Future Plans"] as const;
export type DateCollection = (typeof DATE_COLLECTIONS)[number];
