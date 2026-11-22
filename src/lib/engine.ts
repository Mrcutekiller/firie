import {
  EVENT_AFFINITY,
  OPTIONAL_SLOTS,
  REQUIRED_SLOTS,
  SLOT_LABELS,
  type ClosetItem,
  type EventType,
  type Outfit,
  type Plan,
  type Season,
  type Slot,
  type Style,
  type WeatherSnapshot,
} from "./types";
import {
  buildEditorialOutfitExplanation,
  evaluateColorHarmony,
} from "./fashionKnowledge";

/* -------------------------------------------------------------------------- */
/* Style compatibility                                                        */
/* -------------------------------------------------------------------------- */

type StyleFamily = "refined" | "relaxed" | "traditional";

/**
 * Primary rule: only items of the *same* style are paired.
 * If a user's closet cannot form a complete outfit in a single style, we relax
 * to the item's family so the app never dead-ends (classy↔formal, and
 * casual↔sporty↔streetwear). Traditional pieces pair with the refined family so
 * a habesha kemis can be styled with tailored, formal pieces.
 */
const STYLE_FAMILY: Record<Style, StyleFamily> = {
  formal: "refined",
  classy: "refined",
  casual: "relaxed",
  sporty: "relaxed",
  streetwear: "relaxed",
  traditional: "refined",
};

export function stylesCompatible(a: Style, b: Style): boolean {
  return a === b || STYLE_FAMILY[a] === STYLE_FAMILY[b];
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export function seasonForDate(d: Date = new Date()): Season {
  const m = d.getMonth(); // 0-11
  if (m <= 1 || m === 11) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "autumn";
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 24 * 60 * 60 * 1000;

function daysSince(ts: number | null, now: number): number {
  if (ts == null) return 999; // never worn -> very fresh
  return Math.max(0, (now - ts) / DAY);
}

function seasonFit(item: ClosetItem, season: Season, weather?: WeatherSnapshot): number {
  let score = 0;
  if (item.season === "all") score += 4;
  else if (item.season === season) score += 8;
  else score -= 5;

  if (weather) {
    const t = weather.temperatureC;
    const warm = t >= 26;
    const cold = t <= 12;
    if (warm) {
      if (item.season === "summer" || item.season === "spring") score += 8;
      if (item.season === "winter") score -= 10;
    } else if (cold) {
      if (item.season === "winter" || item.season === "autumn") score += 8;
      if (item.season === "summer") score -= 10;
    }
    if (/rain|storm|shower/i.test(weather.condition)) {
      // White/light footwear is a poor rain choice.
      if (item.slot === "shoes" && /white|ivory|cream|beige/i.test(item.color)) score -= 8;
    }
  }
  return score;
}

/* -------------------------------------------------------------------------- */
/* Core generation                                                            */
/* -------------------------------------------------------------------------- */

export interface GenerateOptions {
  now?: number;
  plan: Plan;
  event?: EventType;
  weather?: WeatherSnapshot | null;
  /** Items worn in the last few days, most recent first. */
  recentItemIds?: string[];
  season?: Season;
  /** Stable per-day seed so the top suggestion is consistent within a day. */
  seed?: number;
}

export interface GenerateResult {
  outfits: Outfit[];
  missingSlots: Slot[];
}

function requiredPresent(closet: ClosetItem[]) {
  const hasTraditionalOnePiece = closet.some((item) =>
    item.style === "traditional" && item.slot === "top" &&
    /kemis|dress|habesha/i.test(`${item.name} ${item.tags.join(" ")}`)
  );
  if (hasTraditionalOnePiece && closet.some((item) => item.slot === "shoes")) return [];
  return REQUIRED_SLOTS.filter((slot) => !closet.some((i) => i.slot === slot));
}

export function canGenerate(closet: ClosetItem[]): { ok: boolean; missing: Slot[] } {
  const missing = requiredPresent(closet);
  return { ok: missing.length === 0, missing };
}

/** Score a full candidate outfit. Higher is better. */
function scoreOutfit(
  items: ClosetItem[],
  opts: {
    plan: Plan;
    event: EventType;
    weather?: WeatherSnapshot | null;
    season: Season;
    recentSet: Set<string>;
    recentIndex: Map<string, number>;
    rand: () => number;
  }
): { score: number; notes: string[] } {
  const { event, weather, season, recentSet, recentIndex, rand } = opts;
  const notes: string[] = [];
  let score = 65;

  const top = items.find((i) => i.slot === "top");
  const bottom = items.find((i) => i.slot === "bottom");
  const shoes = items.find((i) => i.slot === "shoes");

  // ---- 1. Color Theory & Contrast Harmony Matrix ----
  if (top && bottom) {
    const harmony = evaluateColorHarmony(top.color, bottom.color);
    score += (harmony.score - 80) * 1.6;
    notes.push(harmony.rationale);
  }

  const bold = items.filter((i) => !i.isNeutral);
  if (bold.length === 0) {
    score += 8;
  } else if (bold.length === 1) {
    score += 12;
    notes.push(`${bold[0].color.toLowerCase()} as a tasteful focal point`);
  } else {
    // Two or more bold colours — heavily penalize clashing saturated pieces
    score -= 35 * (bold.length - 1);
  }

  // Top vs Bottom Contrast (High-fashion editorial balance)
  if (top && bottom) {
    const isTopLight = /white|ivory|cream|beige|light|linen/i.test(`${top.color} ${top.name}`);
    const isBottomDark = /charcoal|navy|black|dark/i.test(`${bottom.color} ${bottom.name}`);
    const isTopDark = /charcoal|navy|black|dark/i.test(`${top.color} ${top.name}`);
    const isBottomLight = /white|ivory|cream|beige|khaki|sand/i.test(`${bottom.color} ${bottom.name}`);

    if ((isTopLight && isBottomDark) || (isTopDark && isBottomLight)) {
      score += 16;
    } else if (top.color.toLowerCase() === bottom.color.toLowerCase()) {
      score += 10;
    }
  }

  // ---- 2. Style Consistency ----
  const styles = new Set(items.map((i) => i.style));
  const strict = styles.size === 1;
  score += strict ? 14 : 5;
  const anchorStyle = items[0].style;
  if (strict) notes.push(`a cohesive ${anchorStyle} aesthetic`);

  // ---- 3. Occasion Affinity (Intelligent Event Matching for ALL users) ----
  if (event === "date") {
    // Boost classy, smart casual, romantic, refined traditional
    const dateFriendlyStyles = ["classy", "formal", "traditional", "casual"];
    const matches = items.filter((i) => dateFriendlyStyles.includes(i.style)).length;
    score += (matches / items.length) * 22;

    // Reward refined footwear (loafers, leather shoes, clean minimal shoes)
    if (shoes && /loafer|leather|oxford|chelsea|clean/i.test(`${shoes.name} ${shoes.tags.join(" ")}`)) {
      score += 12;
    }
    notes.push("refined proportions ideal for a memorable date");
  } else if (event === "party") {
    // Boost bold styling, statement pieces, streetwear, formal
    const partyFriendlyStyles = ["streetwear", "formal", "classy"];
    const matches = items.filter((i) => partyFriendlyStyles.includes(i.style)).length;
    score += (matches / items.length) * 24;
    notes.push("standout energy with elevated evening contrast");
  } else if (event === "none" || event === "casual-outing" || event === "work") {
    // Normal day: effortless versatile comfort, balanced neutrals
    const casualStyles = ["casual", "classy", "sporty"];
    const matches = items.filter((i) => casualStyles.includes(i.style)).length;
    score += (matches / items.length) * 16;
    notes.push("versatile comfort tailored for an everyday look");
  } else {
    const affinity = EVENT_AFFINITY[event];
    if (affinity) {
      const matches = items.filter((i) => affinity.includes(i.style)).length;
      score += (matches / items.length) * 16;
    }
  }

  // ---- 4. Real-Time Weather & Temperature Compliance ----
  if (weather) {
    const temp = weather.temperatureC;
    const isRain = /rain|shower|drizzle|storm/i.test(weather.condition);
    const hasOuterwear = items.some(
      (i) => i.slot === "top" && /jacket|coat|hoodie|sweater|overshirt|knit|cardigan/i.test(`${i.name} ${i.tags.join(" ")}`)
    );

    if (temp < 15) {
      if (hasOuterwear) {
        score += 20;
        notes.push(`warm layering suited for ${Math.round(temp)}°C weather`);
      } else {
        score -= 18; // penalize wearing only a t-shirt in 13°C weather
      }
    } else if (temp >= 15 && temp < 22) {
      score += 10;
    } else if (temp >= 22) {
      if (hasOuterwear) score -= 15; // too warm for heavy coats
    }

    if (isRain && shoes) {
      if (/white|canvas|suede/i.test(`${shoes.color} ${shoes.name}`)) score -= 18;
    }
  }

  let seasonBonus = 0;
  for (const i of items) seasonBonus += seasonFit(i, season, weather ?? undefined);
  score += seasonBonus / items.length;

  // ---- 5. Freshness & Variety ----
  let freshBonus = 0;
  let mostRecent = Infinity;
  for (const i of items) {
    const d = daysSince(i.lastWornAt, Date.now());
    freshBonus += Math.min(d, 30) / 30;
    mostRecent = Math.min(mostRecent, d);
    if (recentSet.has(i.id)) {
      const pos = recentIndex.get(i.id) ?? 0;
      score -= 24 - Math.min(pos, 6) * 3;
    }
  }
  score += (freshBonus / items.length) * 8;
  if (mostRecent >= 21) notes.push("pieces you haven't worn in a while");

  // Reward under-rotated items
  const avgWears = items.reduce((s, i) => s + i.timesWorn, 0) / items.length;
  score += Math.max(0, 6 - avgWears) * 1.2;

  // Dynamic freshness jitter from seed so combinations vary and feel brand-new
  score += rand() * 12;

  return { score, notes };
}

export function generateOutfits(
  closet: ClosetItem[],
  options: GenerateOptions
): GenerateResult {
  const {
    plan,
    event = "none",
    weather = null,
    recentItemIds = [],
    now = Date.now(),
    seed = Math.floor(now / DAY),
  } = options;
  const season = options.season ?? seasonForDate(new Date(now));

  const missingSlots = requiredPresent(closet);
  if (missingSlots.length > 0) return { outfits: [], missingSlots };

  const bySlot = new Map<Slot, ClosetItem[]>();
  for (const item of closet) {
    if (!bySlot.has(item.slot)) bySlot.set(item.slot, []);
    bySlot.get(item.slot)!.push(item);
  }

  const recentSet = new Set(recentItemIds);
  const recentIndex = new Map<string, number>();
  recentItemIds.forEach((id, idx) => recentIndex.set(id, idx));

  const tops = bySlot.get("top") ?? [];
  const bottoms = bySlot.get("bottom") ?? [];
  const shoes = bySlot.get("shoes") ?? [];

  // ---- Build candidates per style group. Strict same-style first; a style
  //      that can't be completed on its own relaxes to its family so nothing
  //      is orphaned (e.g. a habesha kemis with tailored trousers). ----
  const anchorStyles = Array.from(new Set(tops.map((t) => t.style)));
  const seenKeys = new Set<string>();
  const candidates: ClosetItem[][] = [];
  const pushCombo = (combo: ClosetItem[]) => {
    const key = combo.map((i) => i.id).join("|");
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    candidates.push(combo);
  };

  for (const style of anchorStyles) {
    const sTops = tops.filter((t) => t.style === style);
    const sBottoms = bottoms.filter((b) => b.style === style);
    const sShoes = shoes.filter((s) => s.style === style);

    if (sTops.length && sBottoms.length && sShoes.length) {
      for (const top of sTops)
        for (const bottom of sBottoms)
          for (const shoe of sShoes) pushCombo([top, bottom, shoe]);
      continue;
    }

    // Family fallback for this style only.
    const family = STYLE_FAMILY[style];
    const fTops = tops.filter((t) => STYLE_FAMILY[t.style] === family);
    const fBottoms = bottoms.filter((b) => STYLE_FAMILY[b.style] === family);
    const fShoes = shoes.filter((s) => STYLE_FAMILY[s.style] === family);
    for (const top of fTops)
      for (const bottom of fBottoms)
        for (const shoe of fShoes) pushCombo([top, bottom, shoe]);
  }

  // A Habesha kemis is a complete garment, so it should not be paired with
  // trousers just to satisfy the standard top + bottom outfit shape.
  const traditionalDresses = tops.filter((item) =>
    item.style === "traditional" && /kemis|dress|habesha/i.test(`${item.name} ${item.tags.join(" ")}`)
  );
  const traditionalShoes = shoes.filter((shoe) =>
    shoe.style === "traditional" || shoe.style === "classy" || shoe.style === "formal"
  );
  for (const dress of traditionalDresses) {
    for (const shoe of traditionalShoes) pushCombo([dress, shoe]);
  }

  if (candidates.length === 0) return { outfits: [], missingSlots };

  // ---- Attach optional cap / ring / accessory when compatible. ----
  const extras: Record<string, ClosetItem[]> = {};
  for (const slot of OPTIONAL_SLOTS) extras[slot] = bySlot.get(slot) ?? [];

  const rand = mulberry32(seed);
  const scored: Outfit[] = [];

  for (const base of candidates) {
    const chosen = [...base];
    const anchor = base[0];

    for (const slot of OPTIONAL_SLOTS) {
      const pool = (extras[slot] ?? []).filter((i) => {
        // Rings are universal jewellery — never a style clash.
        if (slot !== "ring" && !stylesCompatible(i.style, anchor.style)) return false;
        // Caps don't suit refined/formal occasions.
        if (slot === "cap" && plan === "pro" && /wedding|work|church|date/.test(event))
          return false;
        // Never introduce a second bold colour.
        if (!i.isNeutral && chosen.some((c) => !c.isNeutral)) return false;
        return true;
      });
      if (pool.length === 0) continue;
      // Prefer the freshest compatible optional piece.
      const picked = [...pool].sort(
        (a, b) => daysSince(b.lastWornAt, now) - daysSince(a.lastWornAt, now)
      )[0];
      if (picked) chosen.push(picked);
    }

    // Hard rule: at most one bold colour per outfit.
    if (chosen.filter((i) => !i.isNeutral).length > 1) continue;

    const { score, notes } = scoreOutfit(chosen, {
      plan,
      event,
      weather,
      season,
      recentSet,
      recentIndex,
      rand,
    });

    scored.push({
      id: "outfit-" + chosen.map((i) => i.id).join("~"),
      itemIds: chosen.map((i) => i.id),
      score: Math.round(score * 10) / 10,
      reason: buildReason(chosen, notes, weather, event, plan),
      event,
      weather: weather ?? undefined,
      createdAt: now,
    });
  }

  // De-duplicate identical item sets, then rank.
  const seen = new Set<string>();
  const topRanked = scored
    .sort((a, b) => b.score - a.score)
    .filter((o) => {
      const key = [...o.itemIds].sort().join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  // Stagger outfits to maximize diversity: ensure sequential outfits feature different tops/bottoms
  const diversified: Outfit[] = [];
  const remaining = [...topRanked];
  while (remaining.length > 0 && diversified.length < 40) {
    if (diversified.length === 0) {
      diversified.push(remaining.shift()!);
      continue;
    }
    const last = diversified[diversified.length - 1];
    // Find next candidate that changes at least the top or bottom
    const nextIdx = remaining.findIndex(
      (c) => c.itemIds[0] !== last.itemIds[0] && (c.itemIds[1] !== last.itemIds[1] || remaining.length < 3)
    );
    if (nextIdx !== -1) {
      diversified.push(remaining.splice(nextIdx, 1)[0]);
    } else {
      diversified.push(remaining.shift()!);
    }
  }

  return { outfits: diversified, missingSlots: [] };
}

/** Human-readable styling rationale explaining color design, contrast & occasion */
export function buildReason(
  items: ClosetItem[],
  _notes: string[],
  weather: WeatherSnapshot | null,
  event: EventType,
  _plan?: Plan
): string {
  return buildEditorialOutfitExplanation(items, weather, event);
}

/** Human readable summary of missing slots for empty states. */
export function missingSlotsMessage(missing: Slot[]): string {
  const names = missing.map((s) => SLOT_LABELS[s].toLowerCase());
  if (names.length === 1) return `Add a ${names[0]} to your closet to generate outfits.`;
  return `Add ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} to your closet to generate outfits.`;
}
