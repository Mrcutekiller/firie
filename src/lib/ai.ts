import { detectDominantColor, guessSeasonFromName, guessStyleFromName } from "./image";
import type { Category, Season, Slot, Style } from "./types";

/**
 * AI service layer.
 *
 * Two capabilities are needed:
 *   1. Vision — reading the garment from a photo (type / colour / style / season).
 *   2. Text reasoning — turning hints into clean tags and explanations.
 *
 * FreeLLMAPI (https://github.com/tashfeenahmed/freellmapi) provides an
 * OpenAI-compatible `/v1/chat/completions` endpoint but is **text-only**, so it
 * is used for the text-reasoning half and for tag cleanup. Colour, background
 * removal and a first-pass garment guess always run on-device (see image.ts).
 * If a multimodal provider is configured it is used to enrich the analysis.
 *
 * Configure via env (see .env.example). Everything degrades gracefully to the
 * on-device heuristics when nothing is configured or the device is offline.
 */

const ENV = import.meta.env as Record<string, string | undefined>;

const FREELLM_BASE = (ENV.VITE_FREELLMAPI_URL || "http://localhost:3001/v1").replace(/\/$/, "");
const FREELLM_KEY = ENV.VITE_FREELLMAPI_KEY || "";
const FREELLM_MODEL = ENV.VITE_FREELLMAPI_MODEL || "auto";

const VISION_BASE = (ENV.VITE_VISION_API_URL || "").replace(/\/$/, "");
const VISION_KEY = ENV.VITE_VISION_API_KEY || "";
const VISION_MODEL = ENV.VITE_VISION_MODEL || "gpt-4o-mini";

export function llmConfigured(): boolean {
  return Boolean(FREELLM_KEY);
}
export function visionConfigured(): boolean {
  return Boolean(VISION_BASE && VISION_KEY);
}

/* -------------------------------------------------------------------------- */
/* Chat helper                                                                */
/* -------------------------------------------------------------------------- */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

async function chat(
  base: string,
  key: string,
  model: string,
  messages: ChatMessage[],
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
    signal,
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

function extractJson<T>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Item analysis                                                              */
/* -------------------------------------------------------------------------- */

export interface AiItemAnalysis {
  name: string;
  category: Category;
  slot: Slot;
  color: string;
  colorHex: string;
  isNeutral: boolean;
  style: Style;
  season: Season;
  tags: string[];
  /** Where the metadata came from, shown as a small hint in the UI. */
  source: "on-device" | "llm" | "vision";
}

const VALID_STYLES: Style[] = ["casual", "classy", "sporty", "streetwear", "formal", "traditional"];
const VALID_SEASONS: Season[] = ["spring", "summer", "autumn", "winter", "all"];

const CATEGORY_TO_SLOT: Record<Category, Slot> = {
  tops: "top",
  bottoms: "bottom",
  shoes: "shoes",
  caps: "cap",
  rings: "ring",
  accessories: "accessory",
  traditional: "top",
};

const SYSTEM_PROMPT =
  "You are FITLY's wardrobe assistant. Given a photo of a single clothing item " +
  "(and possibly a user hint) return STRICT JSON only, no prose, with keys: " +
  '{"name":string,"category":"tops"|"bottoms"|"shoes"|"caps"|"rings"|"accessories"|"traditional",' +
  '"color":string,"style":"casual"|"classy"|"sporty"|"streetwear"|"formal"|"traditional",' +
  '"season":"spring"|"summer"|"autumn"|"winter"|"all","tags":string[]}. ' +
  "Use simple, common colour names (e.g. White, Navy, Beige, Olive). " +
  "Recognise traditional Ethiopian garments (habesha kemis, netela, kaba, gabi) and use the " +
  'category "traditional" with style "traditional".';

export interface AnalyzeOptions {
  /** Optional user-supplied name used to steer the heuristics. */
  hintName?: string;
  /** Optional category chosen by the user before analysis. */
  hintCategory?: Category;
  signal?: AbortSignal;
}

/**
 * Analyses a garment photo and returns editable metadata.
 * Always returns a usable result — never throws.
 */
export async function analyzeItemImage(
  imageDataUrl: string,
  opts: AnalyzeOptions = {}
): Promise<AiItemAnalysis> {
  const colorInfo = await detectDominantColor(imageDataUrl);

  const heuristicName = opts.hintName?.trim() || "New item";
  let base: AiItemAnalysis = {
    name: heuristicName,
    category: opts.hintCategory ?? "tops",
    slot: CATEGORY_TO_SLOT[opts.hintCategory ?? "tops"],
    color: colorInfo.color,
    colorHex: colorInfo.colorHex,
    isNeutral: colorInfo.isNeutral,
    style: guessStyleFromName(heuristicName, colorInfo.isNeutral),
    season: guessSeasonFromName(heuristicName),
    tags: [],
    source: "on-device",
  };

  const prompt =
    "Item hint: " +
    (opts.hintName || "(none)") +
    ". On-device dominant colour detected: " +
    colorInfo.color +
    ".";

  // Prefer a real multimodal provider when configured.
  if (visionConfigured()) {
    try {
      const content = [
        { type: "text", text: `${SYSTEM_PROMPT}\n\n${prompt}` },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ];
      const out = await chat(VISION_BASE, VISION_KEY, VISION_MODEL, [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ], opts.signal);
      const parsed = mergeParsed(base, extractJson<Partial<AiItemAnalysis>>(out));
      if (parsed) return { ...parsed, source: "vision" };
    } catch {
      /* fall through to text / on-device */
    }
  }

  // FreeLLMAPI: text-only refinement of tags / style / season.
  if (llmConfigured()) {
    try {
      const out = await chat(FREELLM_BASE, FREELLM_KEY, FREELLM_MODEL, [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ], opts.signal);
      const parsed = mergeParsed(base, extractJson<Partial<AiItemAnalysis>>(out));
      if (parsed) return { ...parsed, source: "llm" };
    } catch {
      /* keep on-device result */
    }
  }

  base = { ...base, tags: base.tags.length ? base.tags : [base.category] };
  return base;
}

function mergeParsed(
  base: AiItemAnalysis,
  parsed: Partial<AiItemAnalysis> | null
): AiItemAnalysis | null {
  if (!parsed) return null;
  const category = parsed.category && CATEGORY_TO_SLOT[parsed.category] ? parsed.category : base.category;
  const style = parsed.style && VALID_STYLES.includes(parsed.style) ? parsed.style : base.style;
  const season = parsed.season && VALID_SEASONS.includes(parsed.season) ? parsed.season : base.season;
  return {
    ...base,
    name: parsed.name?.trim() || base.name,
    category,
    slot: parsed.slot ?? CATEGORY_TO_SLOT[category],
    color: parsed.color?.trim() || base.color,
    colorHex: parsed.colorHex || base.colorHex,
    isNeutral: typeof parsed.isNeutral === "boolean" ? parsed.isNeutral : base.isNeutral,
    style,
    season,
    tags: Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags.slice(0, 8) : base.tags,
  };
}

/** Text-only helper used to polish a Pro "wear this because" sentence. */
export async function polishReason(draft: string, signal?: AbortSignal): Promise<string> {
  if (!llmConfigured()) return draft;
  try {
    const out = await chat(
      FREELLM_BASE,
      FREELLM_KEY,
      FREELLM_MODEL,
      [
        {
          role: "system",
          content:
            "Rewrite the wardrobe suggestion into one friendly sentence under 28 words. " +
            "Return only the sentence, no quotes.",
        },
        { role: "user", content: draft },
      ],
      signal
    );
    const cleaned = out.trim();
    return cleaned || draft;
  } catch {
    return draft;
  }
}

/** Small helper for the Add Item screen's manual slot selection. */
export function slotForCategory(category: Category): Slot {
  return CATEGORY_TO_SLOT[category];
}

/* -------------------------------------------------------------------------- */
/* Background (scene) recognition — Photo Style Camera                         */
/* -------------------------------------------------------------------------- */

export interface BackgroundVision {
  placeType: string;
  objects: string[];
  structures: string[];
  lighting: string;
  space: string;
  colors: string[];
  confidence: number;
}

const BACKGROUND_PROMPT =
  "You are FITLY's photography scene analyst. Look at the photo of a person's " +
  "SURROUNDINGS (not their clothes) and return STRICT JSON only, no prose, with keys: " +
  '{"placeType":"cafe"|"restaurant"|"street"|"garden"|"park"|"mall"|"beach"|"home"|"bedroom"|"hotel"|"rooftop"|"staircase"|"building"|"office"|"indoor"|"outdoor"|"other",' +
  '"objects":string[],"structures":string[],"lighting":"bright"|"soft"|"low"|"backlit"|"unknown",' +
  '"space":"tight"|"moderate"|"open"|"unknown","colors":string[],"confidence":number}. ' +
  '"objects" lists movable things you can see (chair, table, bench, mirror, plant). ' +
  '"structures" lists only clearly visible photo-worthy structures chosen from: ' +
  'wall, chair, table, bench, stairs, mirror, doorway, window, railing, grass, water, open-space. ' +
  '"confidence" is 0 to 1. Never guess a structure that is not visible.';

/**
 * Vision-model background recognition. Returns null when no vision provider
 * is configured or the call fails — callers fall back to on-device sampling.
 */
export async function recognizeBackgroundVision(
  imageDataUrl: string,
  signal?: AbortSignal
): Promise<BackgroundVision | null> {
  if (!visionConfigured()) return null;
  try {
    const out = await chat(
      VISION_BASE,
      VISION_KEY,
      VISION_MODEL,
      [
        { role: "system", content: BACKGROUND_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyse this background photo." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      signal
    );
    const parsed = extractJson<Partial<BackgroundVision>>(out);
    if (!parsed || typeof parsed.placeType !== "string") return null;
    return {
      placeType: parsed.placeType,
      objects: Array.isArray(parsed.objects) ? parsed.objects : [],
      structures: Array.isArray(parsed.structures) ? parsed.structures : [],
      lighting: parsed.lighting ?? "unknown",
      space: parsed.space ?? "unknown",
      colors: Array.isArray(parsed.colors) ? parsed.colors : [],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.6,
    };
  } catch {
    return null;
  }
}
