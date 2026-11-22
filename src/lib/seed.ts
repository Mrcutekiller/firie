import type { Category, ClosetItem, Season, Slot, Style } from "./types";
import { hexForColor, isNeutralColor } from "./types";

/**
 * Builds a product-photo URL from the platform image service. Prompt is
 * URL-encoded and tuned for a clean e-commerce style garment shot.
 */
function demoImage(prompt: string): string {
  const full = `${prompt}, single item product photo, centered, plain white background, studio lighting, e-commerce catalogue style`;
  return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
    full
  )}&image_size=square`;
}

interface SeedSpec {
  name: string;
  category: Category;
  slot: Slot;
  color: string;
  style: Style;
  season: Season;
  tags: string[];
  prompt: string;
  /** days since last worn; null = never worn */
  wornDaysAgo: number | null;
  timesWorn: number;
}

const SEED: SeedSpec[] = [
  {
    name: "Classic White Oxford Shirt",
    category: "tops",
    slot: "top",
    color: "White",
    style: "classy",
    season: "all",
    tags: ["shirt", "cotton", "button-up"],
    prompt: "crisp white oxford button-up shirt",
    wornDaysAgo: 3,
    timesWorn: 9,
  },
  {
    name: "Navy Merino Sweater",
    category: "tops",
    slot: "top",
    color: "Navy",
    style: "casual",
    season: "autumn",
    tags: ["sweater", "knit", "wool"],
    prompt: "navy blue merino wool crew neck sweater",
    wornDaysAgo: 12,
    timesWorn: 4,
  },
  {
    name: "Sky Linen Shirt",
    category: "tops",
    slot: "top",
    color: "Sky",
    style: "casual",
    season: "summer",
    tags: ["shirt", "linen", "breezy"],
    prompt: "light sky blue linen short sleeve shirt",
    wornDaysAgo: 30,
    timesWorn: 2,
  },
  {
    name: "Olive Utility Jacket",
    category: "tops",
    slot: "top",
    color: "Olive",
    style: "casual",
    season: "autumn",
    tags: ["jacket", "outerwear", "utility"],
    prompt: "olive green utility field jacket",
    wornDaysAgo: null,
    timesWorn: 0,
  },
  {
    name: "Grey Performance Tee",
    category: "tops",
    slot: "top",
    color: "Grey",
    style: "sporty",
    season: "summer",
    tags: ["tee", "athletic", "moisture-wicking"],
    prompt: "grey athletic performance t-shirt",
    wornDaysAgo: 7,
    timesWorn: 6,
  },
  {
    name: "Charcoal Tailored Trousers",
    category: "bottoms",
    slot: "bottom",
    color: "Charcoal",
    style: "classy",
    season: "all",
    tags: ["trousers", "tailored", "formal"],
    prompt: "charcoal grey tailored dress trousers",
    wornDaysAgo: 5,
    timesWorn: 7,
  },
  {
    name: "Indigo Slim Jeans",
    category: "bottoms",
    slot: "bottom",
    color: "Denim",
    style: "casual",
    season: "all",
    tags: ["jeans", "denim", "slim"],
    prompt: "indigo blue slim fit denim jeans",
    wornDaysAgo: 2,
    timesWorn: 14,
  },
  {
    name: "Beige Chinos",
    category: "bottoms",
    slot: "bottom",
    color: "Beige",
    style: "casual",
    season: "all",
    tags: ["chinos", "cotton"],
    prompt: "beige cotton chino trousers",
    wornDaysAgo: 8,
    timesWorn: 6,
  },
  {
    name: "Black Track Joggers",
    category: "bottoms",
    slot: "bottom",
    color: "Black",
    style: "sporty",
    season: "all",
    tags: ["joggers", "athletic"],
    prompt: "black athletic track jogger pants",
    wornDaysAgo: 1,
    timesWorn: 11,
  },
  {
    name: "White Leather Sneakers",
    category: "shoes",
    slot: "shoes",
    color: "White",
    style: "casual",
    season: "all",
    tags: ["sneakers", "leather", "minimal"],
    prompt: "minimal white leather low top sneakers",
    wornDaysAgo: 2,
    timesWorn: 16,
  },
  {
    name: "Brown Leather Loafers",
    category: "shoes",
    slot: "shoes",
    color: "Brown",
    style: "classy",
    season: "all",
    tags: ["loafers", "leather", "dress"],
    prompt: "brown leather penny loafers dress shoes",
    wornDaysAgo: 6,
    timesWorn: 5,
  },
  {
    name: "Black Running Shoes",
    category: "shoes",
    slot: "shoes",
    color: "Black",
    style: "sporty",
    season: "all",
    tags: ["running", "athletic"],
    prompt: "black running athletic sneakers",
    wornDaysAgo: 1,
    timesWorn: 8,
  },
  {
    name: "Traditional Habesha Kemis",
    category: "traditional",
    slot: "top",
    color: "Ivory",
    style: "traditional",
    season: "all",
    tags: ["habesha", "kemis", "tilet", "ethiopian"],
    prompt: "traditional Ethiopian white habesha kemis dress with colorful tilet embroidered border",
    wornDaysAgo: null,
    timesWorn: 1,
  },
  {
    name: "Netela White Shawl",
    category: "traditional",
    slot: "accessory",
    color: "White",
    style: "traditional",
    season: "all",
    tags: ["netela", "shawl", "ethiopian"],
    prompt: "traditional Ethiopian white netela shawl with woven tilet border folded neatly",
    wornDaysAgo: 40,
    timesWorn: 1,
  },
  {
    name: "Habesha Leather Sandals",
    category: "traditional",
    slot: "shoes",
    color: "Brown",
    style: "traditional",
    season: "all",
    tags: ["habesha", "leather", "sandals", "ethiopian"],
    prompt: "handcrafted traditional Ethiopian brown leather sandals",
    wornDaysAgo: 24,
    timesWorn: 1,
  },
  {
    name: "Navy Baseball Cap",
    category: "caps",
    slot: "cap",
    color: "Navy",
    style: "casual",
    season: "summer",
    tags: ["cap", "hat"],
    prompt: "navy blue cotton baseball cap",
    wornDaysAgo: 4,
    timesWorn: 5,
  },
  {
    name: "Gold Signet Ring",
    category: "rings",
    slot: "ring",
    color: "Gold",
    style: "classy",
    season: "all",
    tags: ["ring", "gold", "jewellery"],
    prompt: "gold signet ring jewellery close up",
    wornDaysAgo: 9,
    timesWorn: 3,
  },
  {
    name: "Brown Leather Belt",
    category: "accessories",
    slot: "accessory",
    color: "Brown",
    style: "classy",
    season: "all",
    tags: ["belt", "leather"],
    prompt: "brown leather belt with metal buckle",
    wornDaysAgo: 6,
    timesWorn: 6,
  },
];

function idFor(name: string): string {
  return (
    "seed-" +
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  );
}

const DAY = 24 * 60 * 60 * 1000;

export function buildSeedCloset(now = Date.now()): ClosetItem[] {
  return SEED.map((s) => ({
    id: idFor(s.name),
    name: s.name,
    category: s.category,
    slot: s.slot,
    color: s.color,
    colorHex: hexForColor(s.color),
    isNeutral: isNeutralColor(s.color),
    style: s.style,
    season: s.season,
    imageUrl: demoImage(s.prompt),
    tags: s.tags,
    createdAt: now - 90 * DAY,
    lastWornAt: s.wornDaysAgo == null ? null : now - s.wornDaysAgo * DAY,
    timesWorn: s.timesWorn,
  }));
}

export function buildSeedHistory(now = Date.now()): import("./types").OutfitLog[] {
  const d = (daysAgo: number) => {
    const dt = new Date(now - daysAgo * DAY);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return [
    {
      id: "seed-log-1",
      date: d(1),
      itemIds: [
        "seed-classic-white-oxford-shirt",
        "seed-navy-merino-sweater",
        "seed-charcoal-wool-trousers",
        "seed-white-minimalist-leather-sneakers",
      ],
      event: "casual-outing",
      weatherSummary: "15°C · Mild",
      reason: "Crisp white shirt layered under navy merino knit for office and coffee.",
      createdAt: now - 1 * DAY,
    },
    {
      id: "seed-log-2",
      date: d(2),
      itemIds: [
        "seed-heavyweight-grey-t-shirt",
        "seed-olive-utility-overshirt",
        "seed-slim-dark-indigo-jeans",
        "seed-white-minimalist-leather-sneakers",
      ],
      event: "casual-outing",
      weatherSummary: "18°C · Sunny",
      reason: "Relaxed olive overshirt with grey tee for afternoon downtown walk.",
      createdAt: now - 2 * DAY,
    },
    {
      id: "seed-log-3",
      date: d(4),
      itemIds: [
        "seed-classic-white-oxford-shirt",
        "seed-camel-wool-overcoat",
        "seed-slim-dark-indigo-jeans",
        "seed-black-leather-chelsea-boots",
      ],
      event: "date",
      weatherSummary: "12°C · Clear Evening",
      reason: "Refined camel overcoat and Chelsea boots for evening dinner date.",
      createdAt: now - 4 * DAY,
    },
    {
      id: "seed-log-4",
      date: d(6),
      itemIds: [
        "seed-silk-blend-charcoal-blazer",
        "seed-classic-white-oxford-shirt",
        "seed-charcoal-wool-trousers",
        "seed-brown-leather-loafers",
      ],
      event: "party",
      weatherSummary: "16°C · Evening",
      reason: "Tailored charcoal blazer and polished loafers for cocktail lounge.",
      createdAt: now - 6 * DAY,
    },
    {
      id: "seed-log-5",
      date: d(8),
      itemIds: [
        "seed-navy-merino-sweater",
        "seed-charcoal-wool-trousers",
        "seed-white-minimalist-leather-sneakers",
      ],
      event: "casual-outing",
      weatherSummary: "14°C · Light Breeze",
      reason: "Minimalist navy sweater with wool trousers.",
      createdAt: now - 8 * DAY,
    },
    {
      id: "seed-log-6",
      date: d(11),
      itemIds: [
        "seed-camel-wool-overcoat",
        "seed-classic-white-oxford-shirt",
        "seed-slim-dark-indigo-jeans",
        "seed-black-leather-chelsea-boots",
      ],
      event: "date",
      weatherSummary: "10°C · Chilly",
      reason: "Warm outerwear pairing for rooftop drinks.",
      createdAt: now - 11 * DAY,
    },
  ];
}
