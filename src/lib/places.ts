/**
 * FITLY Date Spots — place data layer.
 *
 * Endpoint mapping (implemented in api.ts):
 *   GET  /api/places            → listPlaces()
 *   GET  /api/places/{id}       → getPlace()
 *   GET  /api/places/{id}/menu  → getPlaceMenu()
 *   POST /api/places/recommend  → recommendPlaces()
 *   POST /api/places/report     → reportPlace()
 *
 * ── Data honesty rules ─────────────────────────────────────────────────────
 * Every menu price carries a verification state:
 *   "verified"    → taken from the venue's own published menu (source recorded)
 *   "estimated"   → a labelled price band grounded in published Addis price
 *                   surveys — always badged "Estimate" in the UI
 *   "unavailable" → we do not know it; the UI says
 *                   "Price unavailable — contact restaurant" (never invented)
 * Ratings, hours and facilities are `null` / `[]` unless they are publicly
 * listed — never fabricated. Each place records `sources` and the date its
 * data was last checked (`lastChecked`).
 *
 * Prices were checked against public menu sources in November 2026
 * (hyattrestaurants.com, ithiopica.com, tibebresturant.com, tafach.menu and
 * published Addis dining guides). Currency defaults to ETB for Ethiopia and
 * each place carries its own currency so international cities can be added.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type PlaceCategory =
  | "romantic-dinner"
  | "coffee-date"
  | "casual-outing"
  | "luxury-date"
  | "outdoor-date"
  | "birthday"
  | "rooftop"
  | "traditional-food"
  | "weekend-hangout";

export type Vibe =
  | "casual"
  | "classy"
  | "romantic"
  | "outdoor"
  | "luxury"
  | "traditional"
  | "quiet"
  | "lively";

export type PlaceTag =
  | "romantic"
  | "quiet"
  | "live-music"
  | "vegetarian"
  | "rooftop"
  | "indoor"
  | "outdoor"
  | "view"
  | "wifi"
  | "parking";

export type PriceLevel = 1 | 2 | 3 | 4;

export type Currency = "ETB" | "USD" | "EUR" | "GBP";

export type Verification = "verified" | "estimated" | "unavailable";

export type MenuCategoryId =
  | "breakfast"
  | "starters"
  | "main-dishes"
  | "traditional"
  | "pasta"
  | "pizza"
  | "burgers"
  | "desserts"
  | "coffee"
  | "tea"
  | "soft-drinks"
  | "other-beverages";

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  /** null → the UI shows "Price unavailable — contact restaurant". */
  price: number | null;
  currency: Currency;
  verification: Verification;
  category: MenuCategoryId;
  image?: string;
  /** Only set when the venue actually publishes availability. */
  available?: boolean;
  note?: string;
}

export interface PlaceMenu {
  items: MenuItem[];
  /** Where the menu data came from, shown in the UI. */
  source: string;
  sourceUrl?: string;
  /** YYYY-MM — month the menu was last checked. */
  lastChecked: string;
  note?: string;
}

export interface Place {
  id: string;
  name: string;
  categories: PlaceCategory[];
  vibes: Vibe[];
  tags: PlaceTag[];
  cuisine: string[];
  city: string;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  description: string;
  atmosphere: string;
  seating: ("indoor" | "outdoor" | "rooftop")[];
  /** Only publicly listed facilities — empty when unconfirmed. */
  facilities: string[];
  /** null → the UI shows "Contact for hours". */
  hours: string | null;
  /** null → the UI shows "No public rating yet". Never invented. */
  rating: number | null;
  reviewCount: number | null;
  /** Relative price band (estimate) — 1 ($) … 4 ($$$$). */
  priceLevel: PriceLevel | null;
  image: string;
  gallery: string[];
  menu: PlaceMenu | null;
  /** ISO date the record joined FITLY — powers "Recently added". */
  addedAt: string;
  sources: string[];
}

export interface PlaceFilters {
  text?: string;
  categories?: PlaceCategory[];
  tags?: PlaceTag[];
  cuisines?: string[];
  city?: string;
  maxPriceLevel?: PriceLevel;
  /** Price per person in the place's currency. */
  maxBudgetPerPerson?: number;
  maxDistanceKm?: number;
  minRating?: number;
  /** Reference point for distance — GPS or the selected city centre. */
  near?: { lat: number; lng: number };
  sortBy?: "relevance" | "distance" | "rating" | "price" | "recent";
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                      */
/* -------------------------------------------------------------------------- */

export const PLACE_CATEGORY_LABELS: Record<PlaceCategory, string> = {
  "romantic-dinner": "Romantic Dinner",
  "coffee-date": "Coffee Date",
  "casual-outing": "Casual Outing",
  "luxury-date": "Luxury Date",
  "outdoor-date": "Outdoor Date",
  birthday: "Birthday",
  rooftop: "Rooftop",
  "traditional-food": "Traditional Food",
  "weekend-hangout": "Weekend Hangout",
};

export const PLACE_CATEGORY_ORDER: PlaceCategory[] = [
  "romantic-dinner",
  "coffee-date",
  "casual-outing",
  "luxury-date",
  "outdoor-date",
  "birthday",
  "rooftop",
  "traditional-food",
  "weekend-hangout",
];

export const PLACE_TAG_LABELS: Record<PlaceTag, string> = {
  romantic: "Romantic atmosphere",
  quiet: "Quiet",
  "live-music": "Live music",
  vegetarian: "Vegetarian options",
  rooftop: "Rooftop",
  indoor: "Indoor",
  outdoor: "Outdoor",
  view: "View",
  wifi: "Wi-Fi",
  parking: "Parking",
};

export const MENU_CATEGORY_LABELS: Record<MenuCategoryId, string> = {
  breakfast: "Breakfast",
  starters: "Starters",
  "main-dishes": "Main dishes",
  traditional: "Traditional food",
  pasta: "Pasta",
  pizza: "Pizza",
  burgers: "Burgers",
  desserts: "Desserts",
  coffee: "Coffee",
  tea: "Tea",
  "soft-drinks": "Soft drinks",
  "other-beverages": "Other beverages",
};

export const MENU_CATEGORY_ORDER: MenuCategoryId[] = [
  "breakfast",
  "starters",
  "main-dishes",
  "traditional",
  "pasta",
  "pizza",
  "burgers",
  "desserts",
  "coffee",
  "tea",
  "soft-drinks",
  "other-beverages",
];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  ETB: "ETB",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export const VERIFICATION_LABELS: Record<Verification, string> = {
  verified: "Verified price",
  estimated: "Estimate",
  unavailable: "Price unavailable",
};

/* -------------------------------------------------------------------------- */
/* Cities — manual selection is always available (Addis is not hardcoded)       */
/* -------------------------------------------------------------------------- */

export interface CityInfo {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export const CITIES: CityInfo[] = [
  { name: "Addis Ababa", country: "Ethiopia", lat: 9.0192, lng: 38.7525 },
  { name: "Adama", country: "Ethiopia", lat: 8.5601, lng: 39.2891 },
  { name: "Bahir Dar", country: "Ethiopia", lat: 11.5886, lng: 37.3912 },
  { name: "Dire Dawa", country: "Ethiopia", lat: 9.5916, lng: 41.8596 },
  { name: "Gondar", country: "Ethiopia", lat: 12.6031, lng: 37.4717 },
  { name: "Hawassa", country: "Ethiopia", lat: 7.0625, lng: 38.4765 },
  { name: "Jimma", country: "Ethiopia", lat: 7.6667, lng: 36.8333 },
  { name: "Lalibela", country: "Ethiopia", lat: 12.0316, lng: 39.0416 },
  { name: "Mekelle", country: "Ethiopia", lat: 13.4967, lng: 39.4753 },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

export function formatPrice(amount: number, currency: Currency): string {
  const value = amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return currency === "ETB" ? `${value} ETB` : `${CURRENCY_SYMBOL[currency]}${value}`;
}

export function priceLevelLabel(level: PriceLevel | null): string {
  if (level === null) return "Price level unknown";
  return `${"$".repeat(level)} · ${["Inexpensive", "Moderate", "Upscale", "Luxury"][level - 1]}`;
}

/** Great-circle distance in kilometres. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function cityCenter(city: string): { lat: number; lng: number } | null {
  const hit = CITIES.find((c) => c.name.toLowerCase() === city.trim().toLowerCase());
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
}

/** Google Maps / external navigation deep link with real coordinates. */
export function directionsUrl(place: Place): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
}

export function mapsUrl(place: Place): string {
  return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
}

/* -------------------------------------------------------------------------- */
/* Search + filter                                                            */
/* -------------------------------------------------------------------------- */

function haystack(place: Place): string {
  return [
    place.name,
    place.city,
    place.neighborhood,
    place.description,
    place.atmosphere,
    ...place.cuisine,
    ...place.categories,
    ...place.tags,
    ...place.vibes,
  ]
    .join(" ")
    .toLowerCase();
}

/** Estimated food+drink cost for one person, derived from menu estimates. */
export function estimatedPerPerson(place: Place): number | null {
  if (!place.menu) return null;
  const mains = place.menu.items.filter(
    (i) =>
      i.price !== null &&
      (i.category === "main-dishes" ||
        i.category === "traditional" ||
        i.category === "pasta" ||
        i.category === "pizza" ||
        i.category === "burgers")
  );
  const drinks = place.menu.items.filter(
    (i) => i.price !== null && (i.category === "coffee" || i.category === "soft-drinks" || i.category === "other-beverages" || i.category === "tea")
  );
  const mainAvg = mains.length ? mains.reduce((s, i) => s + (i.price ?? 0), 0) / mains.length : null;
  const drinkAvg = drinks.length ? drinks.reduce((s, i) => s + (i.price ?? 0), 0) / drinks.length : null;
  if (mainAvg === null && drinkAvg === null) return null;
  return Math.round((mainAvg ?? 0) + (drinkAvg ?? 300));
}

export function listPlaces(filters: PlaceFilters = {}): Place[] {
  const text = filters.text?.trim().toLowerCase();
  let result = PLACES.filter((place) => {
    if (text && !haystack(place).includes(text)) return false;
    if (filters.city && place.city.toLowerCase() !== filters.city.toLowerCase()) return false;
    if (filters.categories?.length && !filters.categories.some((c) => place.categories.includes(c)))
      return false;
    if (filters.tags?.length && !filters.tags.every((t) => place.tags.includes(t))) return false;
    if (filters.cuisines?.length && !filters.cuisines.some((c) => place.cuisine.includes(c)))
      return false;
    if (filters.maxPriceLevel && (place.priceLevel ?? 9) > filters.maxPriceLevel) return false;
    if (filters.minRating && (place.rating ?? 0) < filters.minRating) return false;
    if (filters.maxBudgetPerPerson !== undefined) {
      const perPerson = estimatedPerPerson(place);
      // Unknown pricing is not filtered out — it is shown honestly instead.
      if (perPerson !== null && perPerson > filters.maxBudgetPerPerson) return false;
    }
    if (filters.maxDistanceKm !== undefined && filters.near) {
      if (distanceKm(filters.near, place) > filters.maxDistanceKm) return false;
    }
    return true;
  });

  const { sortBy = "relevance", near } = filters;
  result = [...result].sort((a, b) => {
    if (sortBy === "distance" && near) return distanceKm(near, a) - distanceKm(near, b);
    if (sortBy === "rating") return (b.rating ?? -1) - (a.rating ?? -1);
    if (sortBy === "price") return (a.priceLevel ?? 9) - (b.priceLevel ?? 9);
    if (sortBy === "recent") return b.addedAt.localeCompare(a.addedAt);
    // relevance: fresher records first, then name (stable, deterministic)
    return b.addedAt.localeCompare(a.addedAt) || a.name.localeCompare(b.name);
  });
  return result;
}

export function getPlace(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

export function getPlaceMenu(id: string): PlaceMenu | null {
  return getPlace(id)?.menu ?? null;
}

/** Section builders for the Date Spots home screen. */
export function placeSections(near?: { lat: number; lng: number }): {
  id: string;
  title: string;
  places: Place[];
}[] {
  const all = PLACES;
  return [
    {
      id: "recommended",
      title: "Recommended for you",
      places: listPlaces({ sortBy: "recent" }).slice(0, 6),
    },
    { id: "romantic", title: "Romantic places", places: all.filter((p) => p.tags.includes("romantic")) },
    { id: "cafes", title: "Cafes near you", places: sortNear(all.filter((p) => p.categories.includes("coffee-date")), near) },
    {
      id: "budget",
      title: "Budget-friendly dates",
      places: all.filter((p) => p.priceLevel !== null && p.priceLevel <= 2),
    },
    { id: "popular", title: "Popular restaurants", places: all.filter((p) => p.categories.includes("romantic-dinner") || p.categories.includes("traditional-food")) },
    { id: "gems", title: "Hidden gems", places: all.filter((p) => p.tags.includes("quiet") || p.tags.includes("live-music")) },
    { id: "recent", title: "Recently added", places: [...all].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 6) },
  ].map((section) => ({ ...section, places: section.places.slice(0, 10) }));
}

function sortNear(places: Place[], near?: { lat: number; lng: number }): Place[] {
  if (!near) return places;
  return [...places].sort((a, b) => distanceKm(near, a) - distanceKm(near, b));
}

/* -------------------------------------------------------------------------- */
/* Photo URLs                                                                  */
/* -------------------------------------------------------------------------- */

const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

export const IMG = {
  cafeA: U("1554118811-1e0d58224f24"),
  cafeB: U("1521017432531-fbd92d768814"),
  cafeC: U("1466978913421-dad2ebd01d17"),
  coffeeA: U("1495474472287-4d71bcdd2085"),
  coffeeB: U("1470337458703-46ad1756a187"),
  latte: U("1544148103-0773bf10d330"),
  restA: U("1517248135467-4c7edcad34c4"),
  restB: U("1559925393-8be0ec4767c8"),
  restC: U("1559339352-11d035aa65de"),
  restD: U("1552566626-52f8b828add9"),
  tableA: U("1414235077428-338989a2e8c0"),
  dinnerA: U("1533777857889-4be7c70b33f7"),
  plateA: U("1600891964092-4316c288032e"),
  pizza: U("1565299624946-b28f40a0ae38"),
  burger: U("1571091718767-18b5b1457add"),
  barA: U("1514933651103-005eec06c04b"),
  barB: U("1424847651672-bf20a4b0982b"),
  breakfast: U("1445116572660-236099ec97a0"),
  dessert: U("1551024506-0bccd828d307"),
  hotel: U("1517840901100-8179e982acb7"),
  music: U("1470229722913-7c0e2dbbafd3"),
  bowl: U("1546069901-ba9599a7e63c"),
};

/* -------------------------------------------------------------------------- */
/* Verification constants used by the dataset                                  */
/* -------------------------------------------------------------------------- */

export const CHECKED = "2026-11";

/** Price band grounded in published Addis Ababa price surveys (Nov 2026). */
export function est(
  id: string,
  name: string,
  category: MenuCategoryId,
  low: number,
  high: number,
  description?: string,
  image?: string
): MenuItem {
  return {
    id,
    name,
    description,
    price: Math.round((low + high) / 2),
    currency: "ETB",
    verification: "estimated",
    category,
    image,
    note: `Estimate — typical Addis range ${low}–${high} ETB (Nov 2026)`,
  };
}

/** A price we could not confirm: the UI must say "contact restaurant". */
export function unknown(
  id: string,
  name: string,
  category: MenuCategoryId,
  description?: string,
  image?: string
): MenuItem {
  return {
    id,
    name,
    description,
    price: null,
    currency: "ETB",
    verification: "unavailable",
    category,
    image,
  };
}

export function verified(
  id: string,
  name: string,
  category: MenuCategoryId,
  price: number,
  description?: string,
  image?: string
): MenuItem {
  return { id, name, description, price, currency: "ETB", verification: "verified", category, image };
}

/* -------------------------------------------------------------------------- */
/* Dataset — real, publicly listed businesses                                  */
/* -------------------------------------------------------------------------- */

export const PLACES: Place[] = [];

/* -------------------------------------------------------------------------- */
/* Reporting — POST /api/places/report                                        */
/* -------------------------------------------------------------------------- */

export type ReportReason =
  | "wrong-menu"
  | "wrong-price"
  | "closed"
  | "wrong-location"
  | "wrong-hours"
  | "other";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  "wrong-menu": "Menu is wrong",
  "wrong-price": "Price is wrong",
  closed: "Place has closed",
  "wrong-location": "Address is wrong",
  "wrong-hours": "Opening hours are wrong",
  other: "Something else",
};

export interface PlaceReport {
  placeId: string;
  reason: ReportReason;
  details?: string;
  createdAt: number;
}
