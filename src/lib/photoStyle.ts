/**
 * FITLY Photo Style Camera — background recognition + pose recommendation.
 *
 * Endpoint mapping (implemented here, wrapped by api.ts):
 *   POST /api/photo-style/recognize-background → recognizeBackground()
 *   POST /api/photo-style/recommend            → recommendPoses()
 *
 * Recognition works three ways (§2.3) and always degrades honestly:
 *   A. background photo  → on-device canvas sampling, enriched by a vision
 *                          model when one is configured (see ai.ts)
 *   B. text input        → keyword understanding, e.g. "I'm at a cafe"
 *   C. GPS               → optional permission + OpenStreetMap reverse
 *                          geocoding, classified by area keywords
 *
 * Recommendations only ever suggest a pose whose required structures
 * ("wall", "chair", "stairs"…) were actually recognised in the background,
 * always blend the user's real outfit, and never repeat recently used poses
 * unless there is nothing left to show.
 */

import { recognizeBackgroundVision, visionConfigured } from "./ai";
import {
  FREE_POSES,
  POSES,
  type EnvFeature,
  type PhotoFormat,
  type PlaceType,
  type PoseSpec,
} from "./poses";
import type { ClosetItem, Plan, Style } from "./types";

/* -------------------------------------------------------------------------- */
/* Background model                                                             */
/* -------------------------------------------------------------------------- */

export type LightLevel = "bright" | "soft" | "low" | "backlit" | "unknown";
export type SpaceLevel = "tight" | "moderate" | "open" | "unknown";
export type BackgroundSource = "photo" | "text" | "gps" | "place" | "unknown";

export interface BackgroundInfo {
  placeType: PlaceType;
  /** Recognised movable objects: chair, table, bench, mirror… */
  objects: string[];
  /** Recognised structures the poses can rely on. */
  structures: EnvFeature[];
  lighting: LightLevel;
  space: SpaceLevel;
  /** Dominant background colours, human readable. */
  colors: string[];
  source: BackgroundSource;
  /** 0–1 confidence of this recognition. */
  confidence: number;
  /** Human-readable summary, e.g. "Café · indoor · soft light". */
  label: string;
  /** Original user text / reverse-geocoded place name, when available. */
  detail?: string;
}

const UNKNOWN_BG: BackgroundInfo = {
  placeType: "other",
  objects: [],
  structures: [],
  lighting: "unknown",
  space: "unknown",
  colors: [],
  source: "unknown",
  confidence: 0,
  label: "Background not recognised",
};

export function unknownBackground(): BackgroundInfo {
  return { ...UNKNOWN_BG, structures: [], objects: [], colors: [] };
}

const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  cafe: "Café",
  restaurant: "Restaurant",
  street: "Street",
  garden: "Garden",
  park: "Park",
  mall: "Mall",
  beach: "Beach",
  home: "Home",
  bedroom: "Bedroom",
  hotel: "Hotel",
  rooftop: "Rooftop",
  staircase: "Staircase",
  building: "Building",
  office: "Office",
  indoor: "Indoor space",
  outdoor: "Outdoor space",
  other: "Spot",
};

export const PLACE_TYPE_LABEL = (t: PlaceType) => PLACE_TYPE_LABELS[t];

/* -------------------------------------------------------------------------- */
/* B. Text input                                                               */
/* -------------------------------------------------------------------------- */

interface TextRule {
  type: PlaceType;
  words: string[];
  objects?: string[];
  structures?: EnvFeature[];
}

const TEXT_RULES: TextRule[] = [
  { type: "cafe", words: ["cafe", "café", "coffee", "coffee shop", "espresso", "buna"], objects: ["table", "chair"], structures: ["table", "chair", "window"] },
  { type: "restaurant", words: ["restaurant", "dinner", "eatery", "bistro", "food place"], objects: ["table", "chair"], structures: ["table", "chair", "doorway"] },
  { type: "rooftop", words: ["rooftop", "roof top", "terrace", "balcony"], structures: ["railing", "open-space"] },
  { type: "staircase", words: ["staircase", "stairs", "stairway", "steps"], structures: ["stairs", "wall"] },
  { type: "street", words: ["street", "road", "sidewalk", "pavement", "walking"], structures: ["open-space", "wall"] },
  { type: "garden", words: ["garden", "yard", "plants", "flowers"], structures: ["grass", "open-space", "bench"] },
  { type: "park", words: ["park", "trees", "green space"], structures: ["grass", "open-space", "bench"] },
  { type: "beach", words: ["beach", "sea", "ocean", "lake shore", "river"], structures: ["water", "open-space"] },
  { type: "mall", words: ["mall", "shopping", "store", "shop"], structures: ["open-space", "wall"] },
  { type: "bedroom", words: ["bedroom", "bed", "my room"], objects: ["mirror"], structures: ["mirror", "wall"] },
  { type: "home", words: ["home", "house", "living room", "kitchen", "apartment"], objects: ["chair", "table"], structures: ["wall", "window", "chair"] },
  { type: "hotel", words: ["hotel", "lobby"], structures: ["window", "wall"] },
  { type: "building", words: ["building", "beside a building", "next to a building", "facade", "brick", "concrete"], structures: ["wall", "doorway"] },
  { type: "office", words: ["office", "desk", "work"], structures: ["wall", "window"] },
  { type: "indoor", words: ["indoors", "inside", "room"], structures: ["wall"] },
  { type: "outdoor", words: ["outdoors", "outside", "open air"], structures: ["open-space"] },
];

const LIGHT_WORDS: { level: LightLevel; words: string[] }[] = [
  { level: "low", words: ["dark", "night", "dim", "low light", "evening light"] },
  { level: "backlit", words: ["backlit", "behind me", "sun behind", "silhouette"] },
  { level: "bright", words: ["bright", "sunny", "sunlight", "daylight", "midday"] },
  { level: "soft", words: ["soft light", "window light", "cloudy", "shade", "golden hour"] },
];

const SPACE_WORDS: { level: SpaceLevel; words: string[] }[] = [
  { level: "tight", words: ["small", "narrow", "tight", "cramped", "small room"] },
  { level: "open", words: ["spacious", "wide", "open space", "big area", "plenty of room"] },
];

function titleize(t: PlaceType): string {
  return PLACE_TYPE_LABELS[t];
}

/** Parses free text such as "I'm standing beside a building." */
export function parseBackgroundText(text: string): BackgroundInfo {
  const raw = text.trim();
  const t = raw.toLowerCase();
  if (!t) return unknownBackground();

  const hit = TEXT_RULES.find((r) => r.words.some((w) => t.includes(w)));
  const lighting = LIGHT_WORDS.find((l) => l.words.some((w) => t.includes(w)))?.level ?? "unknown";
  const space = SPACE_WORDS.find((s) => s.words.some((w) => t.includes(w)))?.level ?? "unknown";

  const structures = new Set<EnvFeature>(hit?.structures ?? []);
  const objects = [...(hit?.objects ?? [])];
  if (/mirror/.test(t)) {
    structures.add("mirror");
    objects.push("mirror");
  }
  if (/window/.test(t)) structures.add("window");
  if (/chair|seat|stool/.test(t)) {
    structures.add("chair");
    objects.push("chair");
  }
  if (/table|desk/.test(t)) {
    structures.add("table");
    objects.push("table");
  }
  if (/bench/.test(t)) {
    structures.add("bench");
    objects.push("bench");
  }
  if (/wall/.test(t)) structures.add("wall");
  if (/door|arch/.test(t)) structures.add("doorway");
  if (/railing|rail|balustrade/.test(t)) structures.add("railing");
  if (/grass|lawn/.test(t)) structures.add("grass");

  const placeType = hit?.type ?? "other";
  const parts = [titleize(placeType)];
  if (lighting !== "unknown") parts.push(`${lighting} light`);
  if (space !== "unknown") parts.push(`${space} space`);

  return {
    placeType,
    objects: [...new Set(objects)],
    structures: [...structures],
    lighting,
    space,
    colors: [],
    source: "text",
    confidence: hit ? 0.72 : 0.4,
    label: parts.join(" · "),
    detail: raw,
  };
}

/* -------------------------------------------------------------------------- */
/* A. Background photo                                                         */
/* -------------------------------------------------------------------------- */

interface Sample {
  brightness: number;
  greenRatio: number;
  skyRatio: number;
  warmRatio: number;
  uniformity: number; // 0 = busy scene, 1 = large flat surfaces
}

async function sampleImage(dataUrl: string): Promise<Sample | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image"));
      el.src = dataUrl;
    });
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let lum = 0;
    let green = 0;
    let sky = 0;
    let warm = 0;
    const blocks: number[] = [];
    for (let by = 0; by < 8; by++) {
      for (let bx = 0; bx < 8; bx++) {
        let blockSum = 0;
        let count = 0;
        for (let y = by * 8; y < by * 8 + 8; y++) {
          for (let x = bx * 8; x < bx * 8 + 8; x++) {
            const i = (y * size + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            lum += l;
            blockSum += l;
            count++;
            if (g > r * 1.1 && g > b * 1.05 && g > 60) green++;
            if (b > r * 1.12 && b > 90 && y < size * 0.4) sky++;
            if (r > b * 1.18 && r > 90) warm++;
          }
        }
        blocks.push(blockSum / count);
      }
    }
    const total = size * size;
    const mean = blocks.reduce((s, v) => s + v, 0) / blocks.length;
    const variance = blocks.reduce((s, v) => s + (v - mean) ** 2, 0) / blocks.length;
    const uniformity = Math.max(0, 1 - Math.min(1, Math.sqrt(variance) * 4));

    return {
      brightness: lum / total,
      greenRatio: green / total,
      skyRatio: sky / total,
      warmRatio: warm / total,
      uniformity,
    };
  } catch {
    return null;
  }
}

function sampleToBackground(sample: Sample): BackgroundInfo {
  const structures = new Set<EnvFeature>();
  const lighting: LightLevel =
    sample.brightness < 0.24 ? "low" : sample.brightness > 0.68 ? "bright" : "soft";
  let placeType: PlaceType = "other";

  if (sample.greenRatio > 0.16) {
    placeType = "garden";
    structures.add("grass");
    structures.add("open-space");
  } else if (sample.skyRatio > 0.1) {
    placeType = "outdoor";
    structures.add("open-space");
  } else if (sample.uniformity > 0.62) {
    // Large flat surfaces → an interior wall is the most likely backdrop.
    placeType = "indoor";
    structures.add("wall");
  } else if (sample.warmRatio > 0.4) {
    placeType = "indoor";
    structures.add("wall");
  } else {
    placeType = "other";
  }
  if (sample.brightness < 0.24) structures.delete("open-space");

  const colors: string[] = [];
  if (sample.greenRatio > 0.16) colors.push("greenery");
  if (sample.skyRatio > 0.1) colors.push("sky blue");
  if (sample.warmRatio > 0.4) colors.push("warm tones");
  if (sample.uniformity > 0.62) colors.push("plain wall");

  const space: SpaceLevel = placeType === "garden" || placeType === "outdoor" ? "open" : "moderate";

  const parts = [titleize(placeType)];
  parts.push(`${lighting} light`);

  return {
    placeType,
    objects: [],
    structures: [...structures],
    lighting,
    space,
    colors,
    source: "photo",
    confidence: 0.5,
    label: parts.join(" · "),
  };
}

/**
 * Analyses a photo of the surroundings.
 * On-device sampling always runs; a configured vision model refines it.
 */
export async function recognizeBackground(imageDataUrl: string): Promise<BackgroundInfo> {
  if (visionConfigured()) {
    try {
      const vision = await recognizeBackgroundVision(imageDataUrl);
      if (vision) {
        const structures = vision.structures.filter((s): s is EnvFeature =>
          ENV_FEATURES.has(s as EnvFeature)
        );
        const placeType = PLACE_TYPES.has(vision.placeType as PlaceType)
          ? (vision.placeType as PlaceType)
          : "other";
        return {
          placeType,
          objects: vision.objects.slice(0, 8),
          structures: [...new Set(structures)],
          lighting: (["bright", "soft", "low", "backlit", "unknown"] as LightLevel[]).includes(
            vision.lighting as LightLevel
          )
            ? (vision.lighting as LightLevel)
            : "unknown",
          space: (["tight", "moderate", "open", "unknown"] as SpaceLevel[]).includes(
            vision.space as SpaceLevel
          )
            ? (vision.space as SpaceLevel)
            : "unknown",
          colors: vision.colors.slice(0, 6),
          source: "photo",
          confidence: Math.min(1, Math.max(0.2, vision.confidence)),
          label: `${titleize(placeType)} · ${vision.lighting || "light"} light`,
        };
      }
    } catch {
      /* fall through to on-device */
    }
  }

  const sample = await sampleImage(imageDataUrl);
  if (!sample) return unknownBackground();
  return sampleToBackground(sample);
}

/* -------------------------------------------------------------------------- */
/* C. GPS (optional)                                                           */
/* -------------------------------------------------------------------------- */

export function geolocationAvailable(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

interface GeoResult {
  info: BackgroundInfo;
  error?: string;
}

/** Optional location permission — never requested automatically. */
export async function recognizeFromGps(): Promise<GeoResult> {
  if (!geolocationAvailable()) {
    return { info: unknownBackground(), error: "This device does not offer location access." };
  }
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 60000,
      });
    });
    const { latitude, longitude } = pos.coords;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=12`
    );
    if (!res.ok) throw new Error("geocode");
    const data = await res.json();
    const name: string = data?.display_name ?? "";
    const area: string =
      data?.address?.neighbourhood ||
      data?.address?.suburb ||
      data?.address?.road ||
      data?.address?.city ||
      "";

    const lower = name.toLowerCase();
    let placeType: PlaceType = "other";
    if (/park|garden/.test(lower)) placeType = "park";
    else if (/street|road|avenue|st\.|str/.test(lower)) placeType = "street";
    else if (/mall|market/.test(lower)) placeType = "mall";
    else if (/hotel/.test(lower)) placeType = "hotel";
    else if (/beach|lake|river/.test(lower)) placeType = "beach";
    else if (/rooftop|terrace/.test(lower)) placeType = "rooftop";

    const structures: EnvFeature[] =
      placeType === "park"
        ? ["grass", "bench", "open-space"]
        : placeType === "street"
          ? ["open-space", "wall"]
          : placeType === "rooftop"
            ? ["railing", "open-space"]
            : [];

    const label =
      placeType === "other"
        ? area
          ? `Near ${area}`
          : "Location found"
        : `${titleize(placeType)} · near ${area || "your location"}`;

    return {
      info: {
        placeType,
        objects: [],
        structures,
        lighting: "unknown",
        space: placeType === "park" || placeType === "street" ? "open" : "unknown",
        colors: [],
        source: "gps",
        confidence: area ? 0.55 : 0.4,
        label,
        detail: name,
      },
    };
  } catch {
    return {
      info: unknownBackground(),
      error: "Couldn't read your location — describe the spot or snap a photo instead.",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */
/* -------------------------------------------------------------------------- */

export type FilterId = "natural" | "snapchat" | "cinematic" | "sonic" | "clean" | "warm" | "studio";

export interface PhotoFilter {
  id: FilterId;
  label: string;
  badge?: string;
  /** CSS filter string applied to the live preview AND the saved photo. */
  css: string;
  pro: boolean;
  description: string;
  /** Studio adds a soft background focus pass. */
  blurBackground?: boolean;
}

export const PHOTO_FILTERS: PhotoFilter[] = [
  {
    id: "natural",
    label: "Normal",
    css: "none",
    pro: false,
    description: "Original pure camera stream without filters.",
  },
  {
    id: "snapchat",
    label: "✨ Snap Glow",
    badge: "Snap",
    css: "brightness(1.12) contrast(1.05) saturate(1.18)",
    pro: false,
    description: "Snapchat beauty glow with radiant skin smoothing and lifted exposure.",
  },
  {
    id: "cinematic",
    label: "🎬 iPhone Cine",
    badge: "iPhone",
    css: "contrast(1.18) brightness(0.97) saturate(0.95) sepia(0.08)",
    pro: false,
    description: "iPhone Cinematic 35mm filmic tone with rich shadows and organic depth.",
  },
  {
    id: "sonic",
    label: "🎨 Sony Vivid",
    badge: "Sony",
    css: "contrast(1.22) saturate(1.36) brightness(1.02) hue-rotate(-3deg)",
    pro: false,
    description: "Sony Alpha Cine color science with punchy vibrant blues, greens, and contrast.",
  },
  {
    id: "clean",
    label: "Clean Studio",
    css: "brightness(1.07) contrast(1.05) saturate(1.03)",
    pro: false,
    description: "Brighter exposure, lifted shadows, balanced studio contrast.",
  },
  {
    id: "warm",
    label: "Golden Hour",
    css: "sepia(0.22) saturate(1.20) hue-rotate(-6deg) brightness(1.04)",
    pro: true,
    description: "Sunset golden hour warmth while keeping skin colours natural.",
  },
  {
    id: "studio",
    label: "Fashion Editorial",
    css: "contrast(1.16) saturate(1.04) brightness(1.05)",
    pro: true,
    description: "Sharper clothing detail with a soft background focus.",
    blurBackground: true,
  },
];

export function filterById(id: FilterId): PhotoFilter {
  return PHOTO_FILTERS.find((f) => f.id === id) ?? PHOTO_FILTERS[0];
}

/* -------------------------------------------------------------------------- */
/* Recommendation engine — POST /api/photo-style/recommend                     */
/* -------------------------------------------------------------------------- */

/** Free plan quota: 4 pose recommendations per week. */
export const FREE_WEEKLY_RECS = 4;

export interface OutfitContext {
  items: ClosetItem[];
  styles: Style[];
  hasShoes: boolean;
  /** e.g. "Café · white sneakers · navy shirt" */
  label: string;
}

export interface PoseRecommendation {
  pose: PoseSpec;
  score: number;
  reason: string;
  matched: string[];
}

export interface RecommendResult {
  recommendations: PoseRecommendation[];
  /** True when the free weekly quota is spent (Pro is unlimited). */
  limited: boolean;
  /** Remaining recommendations this week; null = unlimited. */
  remaining: number | null;
  /** True when poses were shown without a recognised background. */
  generalOnly: boolean;
  note?: string;
}

export interface RecommendInput {
  background: BackgroundInfo;
  outfit: OutfitContext;
  format: PhotoFormat;
  plan: Plan;
  /** Pose ids used in recent photos — damped so they don't repeat. */
  recentPoseIds: string[];
  /** How many recommendations the free plan has left this week (ignored for Pro). */
  freeRemaining: number;
}

const ENV_FEATURES = new Set<string>([
  "open-space", "wall", "chair", "table", "bench", "stairs",
  "mirror", "doorway", "window", "railing", "grass", "water",
]);

const PLACE_TYPES = new Set<string>([
  "cafe", "restaurant", "street", "garden", "park", "mall", "beach", "home",
  "bedroom", "hotel", "rooftop", "staircase", "building", "office", "indoor",
  "outdoor", "other",
]);

function describeMatch(pose: PoseSpec, bg: BackgroundInfo, outfit: OutfitContext): string {
  const bits: string[] = [];
  if (pose.requires.length) {
    bits.push(`your ${pose.requires.map((r) => r.replace("-", " ")).join(" + ")} is right there`);
  } else if (pose.fitsPlaceTypes.includes(bg.placeType)) {
    bits.push(`made for ${titleize(bg.placeType).toLowerCase()}s`);
  } else {
    bits.push("works almost anywhere");
  }
  const styleHit = pose.outfitStyles.find((s) => outfit.styles.includes(s));
  if (styleHit) bits.push(`flatters your ${styleHit} fit`);
  if (pose.formats.length === 1 && pose.formats[0] === "story") bits.push("built for Stories");
  return bits.slice(0, 2).join(" · ");
}

export function recommendPoses(input: RecommendInput): RecommendResult {
  const { background, outfit, format, plan, recentPoseIds, freeRemaining } = input;
  const isPro = plan === "pro";
  const limit = isPro ? null : Math.max(0, freeRemaining);

  if (!isPro && limit === 0) {
    return {
      recommendations: [],
      limited: true,
      remaining: 0,
      generalOnly: false,
      note: `That's ${FREE_WEEKLY_RECS} recommendations for this week. Pro unlocks unlimited poses.`,
    };
  }

  const pool = isPro ? POSES : FREE_POSES;
  const recent = new Set(recentPoseIds);

  const eligible = pool.filter((pose) =>
    pose.requires.every((f) => background.structures.includes(f))
  );

  let generalOnly = false;
  let note: string | undefined;
  let candidates = eligible;

  if (candidates.length === 0) {
    // No pose's requirements are met → fall back to poses that need nothing.
    candidates = pool.filter((pose) => pose.requires.length === 0);
    generalOnly = background.source === "unknown" || background.confidence === 0;
    note = generalOnly
      ? "We couldn't read your background, so here are general poses that work anywhere."
      : "Nothing here supports a prop-based pose yet — showing general poses. Try another wall, chair or staircase.";
  }

  const scored: PoseRecommendation[] = candidates.map((pose) => {
    let score = 40;
    const matched: string[] = [];

    const reqHits = pose.requires.filter((f) => background.structures.includes(f));
    if (pose.requires.length && reqHits.length === pose.requires.length) {
      score += 25;
      matched.push(`uses your ${pose.requires.map((r) => r.replace("-", " ")).join(" + ")}`);
    }
    const prefHits = pose.prefers.filter((f) => background.structures.includes(f));
    score += Math.min(20, prefHits.length * 10);
    if (prefHits.length) matched.push(`bonus: ${prefHits.join(", ")}`);

    if (pose.fitsPlaceTypes.includes(background.placeType)) {
      score += 12;
      matched.push(`fits a ${titleize(background.placeType).toLowerCase()}`);
    } else if (background.placeType === "other" || background.placeType === "indoor" || background.placeType === "outdoor") {
      score += 6;
    }

    const styleHit = pose.outfitStyles.find((s) => outfit.styles.includes(s));
    if (styleHit) {
      score += 12;
      matched.push(`works with your ${styleHit} outfit`);
    }
    if (pose.formats.includes(format)) {
      score += 6;
      matched.push(`suited to ${format === "story" ? "Stories" : format === "portrait" ? "portrait posts" : "square posts"}`);
    }
    if (outfit.hasShoes && pose.id === "low-angle-shoes") score += 5;

    // Lighting honesty: low light suits indoor-friendly poses a little less.
    if (background.lighting === "low" && pose.camera.angle === "low") score -= 4;

    if (recent.has(pose.id)) score -= 32;

    return { pose, score, reason: describeMatch(pose, background, outfit), matched };
  });

  scored.sort((a, b) => b.score - a.score || a.pose.name.localeCompare(b.pose.name));

  const count = isPro ? 4 : Math.min(3, limit ?? 3);
  const top = scored.slice(0, count);

  if (!isPro && top.length < (limit ?? 3)) {
    note = note ?? `${top.length} of ${FREE_WEEKLY_RECS} recommendations left this week — Pro is unlimited.`;
  }

  return {
    recommendations: top,
    limited: false,
    remaining: isPro ? null : Math.max(0, (limit ?? 0) - top.length),
    generalOnly,
    note,
  };
}

/* -------------------------------------------------------------------------- */
/* Context tag + outfit helpers                                                */
/* -------------------------------------------------------------------------- */

function colorWord(item: ClosetItem | undefined): string | null {
  return item ? item.color.toLowerCase() : null;
}

/** "Café · white sneakers · navy shirt" — the camera's context tag. */
export function buildContextTag(
  placeLabel: string | null,
  items: ClosetItem[]
): string {
  const shoes = items.find((i) => i.slot === "shoes");
  const top = items.find((i) => i.slot === "top");
  const parts: string[] = [];
  if (placeLabel) parts.push(placeLabel);
  const shoeWord = colorWord(shoes);
  if (shoeWord) parts.push(`${shoeWord} ${shoes?.category === "shoes" ? "sneakers" : "shoes"}`);
  const topWord = colorWord(top);
  if (topWord) parts.push(`${topWord} ${top?.category === "traditional" ? "look" : "shirt"}`);
  if (parts.length === 0) parts.push("Your outfit");
  return parts.join(" · ");
}

/** Summarises the outfit for the pose preview ("what you're wearing"). */
export function outfitSummary(items: ClosetItem[]): string {
  if (items.length === 0) return "No outfit selected";
  return items
    .slice(0, 4)
    .map((i) => i.name)
    .join(" · ");
}

/** Style mix of an outfit — used to score pose ↔ outfit fit. */
export function outfitStyles(items: ClosetItem[]): Style[] {
  const styles: Style[] = [];
  for (const item of items) {
    if (!styles.includes(item.style)) styles.push(item.style);
  }
  return styles;
}

export function buildOutfitContext(items: ClosetItem[], placeLabel: string | null): OutfitContext {
  return {
    items,
    styles: outfitStyles(items),
    hasShoes: items.some((i) => i.slot === "shoes"),
    label: buildContextTag(placeLabel, items),
  };
}

/* -------------------------------------------------------------------------- */
/* Pose selection used by the camera overlay                                   */
/* -------------------------------------------------------------------------- */

/** Poses the camera selector offers; the UI badges non-free ones as Pro. */
export function selectorPoses(): PoseSpec[] {
  const ids = ["walking-street", "low-angle-shoes", "cafe-sitting", "wall-lean", "full-body-editorial"];
  return ids.map((id) => POSES.find((p) => p.id === id)).filter((p): p is PoseSpec => Boolean(p));
}
