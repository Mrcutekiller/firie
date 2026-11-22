/**
 * FITLY Master Fashion Knowledge & Color Science Engine
 *
 * Encapsulates professional fashion theory, color harmony principles,
 * silhouette/proportion balancing, real-time weather adaptation, and
 * editorial photography styling guidelines.
 */

import type { ClosetItem, EventType, WeatherSnapshot } from "./types";

/* -------------------------------------------------------------------------- */
/* 1. COLOR HARMONY & COLOR SCIENCE MATRIX                                    */
/* -------------------------------------------------------------------------- */

export interface ColorDefinition {
  name: string;
  family: "neutral" | "earth" | "cool" | "warm" | "jewel";
  hex: string;
  temperature: "cool" | "warm" | "neutral";
  brightness: "light" | "medium" | "dark";
  complements: string[];
  analogous: string[];
}

export const COLOR_PALETTE_KNOWLEDGE: Record<string, ColorDefinition> = {
  black: {
    name: "Black",
    family: "neutral",
    hex: "#101010",
    temperature: "neutral",
    brightness: "dark",
    complements: ["white", "cream", "beige", "camel", "grey"],
    analogous: ["charcoal", "navy", "dark grey"],
  },
  white: {
    name: "White",
    family: "neutral",
    hex: "#FFFFFF",
    temperature: "neutral",
    brightness: "light",
    complements: ["black", "navy", "olive", "terracotta", "charcoal"],
    analogous: ["ivory", "cream", "light grey"],
  },
  navy: {
    name: "Navy",
    family: "cool",
    hex: "#0B1F4B",
    temperature: "cool",
    brightness: "dark",
    complements: ["cognac", "camel", "terracotta", "white", "khaki"],
    analogous: ["slate blue", "indigo", "charcoal"],
  },
  beige: {
    name: "Beige",
    family: "earth",
    hex: "#D8C7A5",
    temperature: "warm",
    brightness: "light",
    complements: ["navy", "charcoal", "forest green", "black"],
    analogous: ["camel", "sand", "cream", "tan"],
  },
  olive: {
    name: "Olive",
    family: "earth",
    hex: "#556B2F",
    temperature: "warm",
    brightness: "medium",
    complements: ["burgundy", "cream", "navy", "rust"],
    analogous: ["sage", "khaki", "moss", "tan"],
  },
  grey: {
    name: "Grey",
    family: "neutral",
    hex: "#808080",
    temperature: "neutral",
    brightness: "medium",
    complements: ["navy", "white", "black", "burgundy", "tan"],
    analogous: ["charcoal", "silver", "slate"],
  },
  charcoal: {
    name: "Charcoal",
    family: "neutral",
    hex: "#2F3542",
    temperature: "cool",
    brightness: "dark",
    complements: ["white", "cream", "light blue", "camel"],
    analogous: ["black", "dark grey", "navy"],
  },
  camel: {
    name: "Camel",
    family: "earth",
    hex: "#C19A6B",
    temperature: "warm",
    brightness: "medium",
    complements: ["navy", "light blue", "white", "black"],
    analogous: ["beige", "tan", "cognac", "brown"],
  },
  brown: {
    name: "Brown",
    family: "earth",
    hex: "#5C4033",
    temperature: "warm",
    brightness: "dark",
    complements: ["light blue", "cream", "white", "sage"],
    analogous: ["camel", "tan", "cognac"],
  },
  blue: {
    name: "Blue",
    family: "cool",
    hex: "#1E90FF",
    temperature: "cool",
    brightness: "medium",
    complements: ["orange", "camel", "tan", "white"],
    analogous: ["navy", "slate blue", "sky blue"],
  },
};

export type HarmonyScheme =
  | "monochromatic"
  | "complementary"
  | "analogous"
  | "neutral-anchor"
  | "high-contrast"
  | "earth-harmony";

export interface HarmonyEvaluation {
  scheme: HarmonyScheme;
  score: number; // 0-100
  title: string;
  rationale: string;
}

/**
 * Evaluates the color theory relationship between two garment pieces.
 */
export function evaluateColorHarmony(colorA: string, colorB: string): HarmonyEvaluation {
  const normA = colorA.trim().toLowerCase();
  const normB = colorB.trim().toLowerCase();

  // 1. Monochromatic (Same color tone)
  if (normA === normB || (normA.includes(normB) || normB.includes(normA))) {
    return {
      scheme: "monochromatic",
      score: 93,
      title: "Tonal Monochromatic",
      rationale: `Tone-on-tone ${normA} creates an elongated, clean visual line favored in luxury fashion.`,
    };
  }

  // 2. High-Contrast Neutral Anchor (Black & White, Navy & White, Charcoal & Cream)
  if (
    (normA.includes("white") && (normB.includes("black") || normB.includes("navy") || normB.includes("charcoal"))) ||
    (normB.includes("white") && (normA.includes("black") || normA.includes("navy") || normA.includes("charcoal")))
  ) {
    return {
      scheme: "high-contrast",
      score: 97,
      title: "Classic High Contrast",
      rationale: "Timeless dark-and-light juxtaposition that draws eyes upward and provides crisp separation.",
    };
  }

  // 3. Earth-tone harmony (Olive, Camel, Beige, Khaki, Tan)
  const isEarthA = /olive|beige|camel|khaki|tan|brown|sand|cream/i.test(normA);
  const isEarthB = /olive|beige|camel|khaki|tan|brown|sand|cream/i.test(normB);
  if (isEarthA && isEarthB) {
    return {
      scheme: "earth-harmony",
      score: 94,
      title: "Warm Earth Tones",
      rationale: "Organic, grounded palette with balanced warmth suitable for both casual and smart settings.",
    };
  }

  // 4. Complementary & Contrast pairing (Navy & Camel, Olive & Cream, Blue & Tan)
  if (
    (/navy|blue/i.test(normA) && /camel|tan|beige|khaki/i.test(normB)) ||
    (/navy|blue/i.test(normB) && /camel|tan|beige|khaki/i.test(normA))
  ) {
    return {
      scheme: "complementary",
      score: 96,
      title: "Complementary Dynamic",
      rationale: "Cool navy grounded by warm camel creates a sophisticated, bespoke Italian tailoring aesthetic.",
    };
  }

  // 5. Neutral Grounding (One neutral + one muted/colored)
  const isNeutralA = /black|white|grey|charcoal|navy/i.test(normA);
  const isNeutralB = /black|white|grey|charcoal|navy/i.test(normB);
  if (isNeutralA || isNeutralB) {
    return {
      scheme: "neutral-anchor",
      score: 91,
      title: "Neutral Anchored",
      rationale: "Clean neutral base allows subtle textures and jewelry accents to stand out without clashing.",
    };
  }

  // Fallback
  return {
    scheme: "analogous",
    score: 85,
    title: "Casual Balanced",
    rationale: "Relaxed everyday color balance suited for casual environments.",
  };
}

/* -------------------------------------------------------------------------- */
/* 2. REAL-TIME WEATHER INTELLIGENCE & FABRIC COMPLIANCE                      */
/* -------------------------------------------------------------------------- */

export interface WeatherStylingAdvice {
  temperatureBracket: "chilly" | "mild" | "warm" | "hot";
  layeringLevel: string;
  headline: string;
  fabricRecommendation: string;
  footwearRule: string;
  rainWarning: boolean;
}

export function getWeatherStylingAdvice(weather: WeatherSnapshot | null): WeatherStylingAdvice {
  if (!weather) {
    return {
      temperatureBracket: "mild",
      layeringLevel: "2 layers recommended",
      headline: "Mild Addis Day",
      fabricRecommendation: "Breathable cotton or lightweight knitwear",
      footwearRule: "Versatile sneakers or loafers",
      rainWarning: false,
    };
  }

  const temp = weather.temperatureC;
  const isRainy = /rain|shower|drizzle|storm/i.test(weather.condition);

  if (temp < 15) {
    return {
      temperatureBracket: "chilly",
      layeringLevel: "Outerwear + mid-layer essential (2-3 layers)",
      headline: `Chilly ${Math.round(temp)}°C in ${weather.city}`,
      fabricRecommendation: "Structured wool jackets, denim layers, hoodies, or heavier knits to retain core warmth.",
      footwearRule: isRainy
        ? "Dark water-resistant shoes or leather boots. Avoid white sneakers or suede."
        : "Leather sneakers, boots, or structured closed footwear.",
      rainWarning: isRainy,
    };
  }

  if (temp >= 15 && temp < 21) {
    return {
      temperatureBracket: "mild",
      layeringLevel: "Smart transitional layering (1-2 layers)",
      headline: `Crisp ${Math.round(temp)}°C in ${weather.city}`,
      fabricRecommendation: "Cotton button-downs, light chore jackets, overshirts, and flexible chinos.",
      footwearRule: isRainy
        ? "Dark clean soles; stay clear of canvas."
        : "Clean low-top sneakers or loafers.",
      rainWarning: isRainy,
    };
  }

  if (temp >= 21 && temp < 26) {
    return {
      temperatureBracket: "warm",
      layeringLevel: "Single breathable layer",
      headline: `Pleasant ${Math.round(temp)}°C in ${weather.city}`,
      fabricRecommendation: "Lightweight cotton tees, camp-collar shirts, linen trousers or lightweight chinos.",
      footwearRule: "Low-profile sneakers, slip-ons, or dress loafers.",
      rainWarning: isRainy,
    };
  }

  return {
    temperatureBracket: "hot",
    layeringLevel: "Ultra-light single layer",
    headline: `Warm ${Math.round(temp)}°C in ${weather.city}`,
    fabricRecommendation: "100% linen or airy open-weave cotton to maximize airflow.",
    footwearRule: "Breathable canvas or woven footwear.",
    rainWarning: isRainy,
  };
}

/* -------------------------------------------------------------------------- */
/* 3. PROFESSIONAL PHOTO STYLING & POSING GUIDELINES                          */
/* -------------------------------------------------------------------------- */

export interface PhotoCoachingAdvice {
  recommendedAngle: string;
  cameraHeight: string;
  poseVibe: string;
  stylingChecklist: string[];
  photographerTip: string;
}

export function getPhotoCoachingForOutfit(
  items: ClosetItem[],
  occasion: EventType
): PhotoCoachingAdvice {
  const isClassy = items.some((i) => i.style === "classy" || i.style === "formal");
  const isTraditional = items.some((i) => i.category === "traditional" || i.style === "traditional");
  const isStreetwear = items.some((i) => i.style === "streetwear" || i.style === "sporty");

  if (isTraditional) {
    return {
      recommendedAngle: "Eye-level straight on",
      cameraHeight: "Chest height (Hold phone upright, 0° tilt)",
      poseVibe: "Regal Elegance",
      stylingChecklist: [
        "Align embroidery (Tilf) centered to camera",
        "Check drape and hem lines for symmetry",
        "Place one hand gently on hip or side to create silhouette width",
      ],
      photographerTip: "Soft, indirect natural light brings out intricate cotton weaves and embroidery details without glare.",
    };
  }

  if (isClassy || occasion === "date") {
    return {
      recommendedAngle: "Slight low angle (5-10° upward tilt)",
      cameraHeight: "Waist to chest level",
      poseVibe: "Tailored Sophistication",
      stylingChecklist: [
        "Leave bottom blazer button undone if wearing tailoring",
        "Roll sleeves crisply to forearm or expose wristwatch",
        "Shift weight to back foot for a relaxed, natural shoulder drop",
      ],
      photographerTip: "Shoot with a 35mm-50mm portrait perspective against warm architectural backgrounds or café seating.",
    };
  }

  if (isStreetwear || occasion === "party") {
    return {
      recommendedAngle: "Knee-height low angle (15° upward tilt)",
      cameraHeight: "Knee height",
      poseVibe: "Urban Street Presence",
      stylingChecklist: [
        "Step one foot forward to emphasize sneakers",
        "Hands loosely in pockets or holding accessory/drink",
        "Keep chin level to project confidence without looking down",
      ],
      photographerTip: "Low-angle lens placement dramatically elongates your legs and puts bold footwear in the spotlight.",
    };
  }

  return {
    recommendedAngle: "Natural eye-level perspective",
    cameraHeight: "Mid-torso height",
    poseVibe: "Effortless Casual",
    stylingChecklist: [
      "Keep shoulders relaxed and posture tall",
      "Slight 3/4 body turn to create a slimming profile",
      "Ensure shoe laces and hems look clean and untangled",
    ],
    photographerTip: "Capture candid motion by stepping forward slowly as the shutter snaps.",
  };
}

/* -------------------------------------------------------------------------- */
/* 4. REAL-TIME EDITORIAL OUTFIT EXPLANATION GENERATOR                        */
/* -------------------------------------------------------------------------- */

export function buildEditorialOutfitExplanation(
  items: ClosetItem[],
  weather: WeatherSnapshot | null,
  occasion: EventType
): string {
  const top = items.find((i) => i.slot === "top");
  const bottom = items.find((i) => i.slot === "bottom");

  const harmony = top && bottom ? evaluateColorHarmony(top.color, bottom.color) : null;
  const weatherAdvice = getWeatherStylingAdvice(weather);

  const occasionPhrase =
    occasion === "date"
      ? "for an intimate date night"
      : occasion === "party"
      ? "for standout evening presence"
      : occasion === "work"
      ? "for clean, professional composure"
      : "for effortless daily confidence";

  const colorPart = harmony ? harmony.rationale : "Clean, cohesive color balance throughout.";
  const weatherPart = weather
    ? `${weatherAdvice.headline} (${weatherAdvice.layeringLevel}). ${weatherAdvice.fabricRecommendation}`
    : "Versatile all-season fabric pairing.";

  return `${colorPart} ${weatherPart} Styled ${occasionPhrase}.`;
}
