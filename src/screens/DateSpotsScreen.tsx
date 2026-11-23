import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePlanSheet from "../components/DatePlanSheet";
import GarmentImage from "../components/GarmentImage";
import PlaceCard, { PlaceImage } from "../components/PlaceCard";
import PlaceMap from "../components/PlaceMap";
import { Button, Chip, EmptyState, ProLock, Spinner, cn } from "../components/ui";
import {
  FREE_DATE_PLAN_LIMIT,
  FREE_FAVORITE_LIMIT,
  type DatePlan,
} from "../lib/types";
import {
  DATE_COLLECTIONS,
  outfitsForPlace,
  recommendPlaces,
  type PlaceRecommendationInput,
} from "../lib/dateSpots";
import {
  CITIES,
  cityCenter,
  distanceKm,
  getPlace,
  listPlaces,
  PLACE_CATEGORY_LABELS,
  PLACE_CATEGORY_ORDER,
  PLACE_TAG_LABELS,
  PLACES,
  placeSections,
  type Place,
  type PlaceCategory,
  type PlaceTag,
} from "../lib/places";
import { useApp } from "../lib/store";

type Tab = "discover" | "search" | "map" | "plans" | "saved";

const TABS: { id: Tab; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "search", label: "Search" },
  { id: "map", label: "Map" },
  { id: "plans", label: "Plans" },
  { id: "saved", label: "Saved" },
];

/** Free plan gets budget / distance / food / romantic filters. */
const FREE_TAGS: PlaceTag[] = ["romantic"];
const ADVANCED_TAGS: PlaceTag[] = ["quiet", "live-music", "vegetarian", "rooftop", "indoor", "outdoor"];

function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name.split(" ")[0]}.` : `${part}.`;
}

/** Reads "Find me a romantic cafe for two under 1,500 ETB" into query inputs. */
function parseAsk(text: string): Omit<PlaceRecommendationInput, "plan"> {
  const t = text.toLowerCase();
  const budgetMatch = t.match(/(?:under|below|less than|max|budget(?: of)?)\s*([\d,]+(?:\.\d+)?)/);
  const budget = budgetMatch ? Number(budgetMatch[1].replace(/,/g, "")) : undefined;
  const people = /for\s+(two|2)|\bcouple\b|for us/.test(t) ? 2 : /for\s+(three|3)/.test(t) ? 3 : 2;

  let occasion: PlaceCategory | undefined;
  if (/romantic|date night|anniversary/.test(t)) occasion = "romantic-dinner";
  else if (/cafe|coffee/.test(t)) occasion = "coffee-date";
  else if (/rooftop/.test(t)) occasion = "rooftop";
  else if (/luxury|fancy|upscale/.test(t)) occasion = "luxury-date";
  else if (/traditional|ethiopian|habesha/.test(t)) occasion = "traditional-food";
  else if (/outdoor|garden|park/.test(t)) occasion = "outdoor-date";
  else if (/birthday|celebrat/.test(t)) occasion = "birthday";
  else if (/weekend|hangout/.test(t)) occasion = "weekend-hangout";
  else if (/dinner|restaurant|food/.test(t)) occasion = "romantic-dinner";
  else if (/casual|quick/.test(t)) occasion = "casual-outing";

  const atmosphere: PlaceTag[] = ADVANCED_TAGS.filter((tag) =>
    t.includes(PLACE_TAG_LABELS[tag].toLowerCase().split(" ")[0])
  );

  const foodPrefs = ["ethiopian", "italian", "coffee", "asian", "pizza", "pasta", "burger", "vegetarian"].filter(
    (f) => t.includes(f)
  );

  return { budget, people, occasion, atmosphere, foodPrefs };
}

export default function DateSpotsScreen() {
  const navigate = useNavigate();
  const {
    profile,
    closet,
    isPro,
    datePlans,
    favoritePlaces,
    favoriteMenuItems,
    favoritesFull,
    deleteDatePlan,
    completeDatePlan,
    setPlaceCollection,
    lockOutfit,
  } = useApp();

  const [tab, setTab] = useState<Tab>("discover");
  const [stylingPlace, setStylingPlace] = useState<Place | null>(null);
  const [city, setCity] = useState(profile.city || "Addis Ababa");
  const [showCitySheet, setShowCitySheet] = useState(false);
  const [manualCity, setManualCity] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const [askText, setAskText] = useState("");
  const [askResult, setAskResult] = useState<ReturnType<typeof recommendPlaces> | null>(null);
  const [askBusy, setAskBusy] = useState(false);
  const [askPeople, setAskPeople] = useState<number>(2);

  const [text, setText] = useState("");
  const [category, setCategory] = useState<PlaceCategory | undefined>(undefined);
  const [maxBudget, setMaxBudget] = useState<number | null>(null);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [tags, setTags] = useState<PlaceTag[]>([]);
  const [advancedLocked, setAdvancedLocked] = useState(false);

  /* --------------------------- Party planner ---------------------------- */
  /** Date or with friends — shapes the recommendations. */
  const [partyMode, setPartyMode] = useState<"date" | "friends">(
    () => (localStorage.getItem("fitly_party_mode") as "date" | "friends") || "date"
  );
  /** Total budget for the whole party (you + everyone else). */
  const [partyBudget, setPartyBudget] = useState<number>(() => {
    const saved = Number(localStorage.getItem("fitly_party_budget"));
    return Number.isFinite(saved) && saved > 0 ? saved : 4000;
  });
  /** Everyone except you. */
  const [others, setOthers] = useState<number>(() => {
    const saved = Number(localStorage.getItem("fitly_party_others"));
    return Number.isFinite(saved) && saved >= 0 ? Math.round(saved) : 1;
  });

  const people = Math.min(50, Math.max(1, 1 + others));
  const perPersonBudget = partyBudget > 0 ? Math.round(partyBudget / people) : 0;

  useEffect(() => {
    localStorage.setItem("fitly_party_mode", partyMode);
    localStorage.setItem("fitly_party_budget", String(partyBudget));
    localStorage.setItem("fitly_party_others", String(others));
  }, [partyMode, partyBudget, others]);

  const [selectedOnMap, setSelectedOnMap] = useState<string | null>(null);
  const [collection, setCollection] = useState<string>("All");
  const [movingPlaceId, setMovingPlaceId] = useState<string | null>(null);  const [plannerOpen, setPlannerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DatePlan | null>(null);

  const near = gps ?? cityCenter(city) ?? undefined;
  const isProRef = isPro;

  const sections = useMemo(() => placeSections(near), [near]);

  const placeOutfits = useMemo(() => {
    if (!stylingPlace || closet.length === 0) return [];
    return outfitsForPlace(closet, stylingPlace, { plan: isPro ? "pro" : "free" });
  }, [stylingPlace, closet, isPro]);

  const recommended = useMemo(() => {
    const boost: PlaceCategory[] =
      partyMode === "date"
        ? ["romantic-dinner", "rooftop", "luxury-date"]
        : ["weekend-hangout", "birthday", "casual-outing"];
    const res = recommendPlaces({
      city: CITIES.some((c) => c.name === city) ? city : undefined,
      near,
      plan: isProRef ? "pro" : "free",
      people,
      budget: partyBudget > 0 ? partyBudget : undefined,
      boost,
    });
    if (res.results.length > 0) return res.results;
    return placeSections(near)[0].places.map((p) => ({
      place: p,
      reason: "Recently added to Firie",
      score: 0,
      estTotalForPeople: null,
      distanceKm: null,
    }));
  }, [city, near, isProRef, people, partyBudget, partyMode]);

  const searchResults = useMemo(() => {
    return listPlaces({
      text: text || undefined,
      categories: category ? [category] : undefined,
      city: CITIES.some((c) => c.name === city) ? city : undefined,
      near: near ?? undefined,
      maxBudgetPerPerson: maxBudget ?? undefined,
      maxDistanceKm: maxDistance ?? undefined,
      cuisines: cuisines.length ? cuisines : undefined,
      tags: tags.filter((t) => (isPro ? true : FREE_TAGS.includes(t))),
      sortBy: maxDistance ? "distance" : "relevance",
    });
  }, [text, category, city, near, maxBudget, maxDistance, cuisines, tags, isPro]);

  const visibleSections = sections.filter((s) => s.places.length > 0);

  const allMapPlaces = useMemo(
    () => listPlaces({ city: CITIES.some((c) => c.name === city) ? city : undefined, near: near ?? undefined }),
    [city, near]
  );

  const savedPlaces = favoritePlaces
    .map((f) => ({ fav: f, place: getPlace(f.placeId) }))
    .filter((x): x is { fav: (typeof favoritePlaces)[number]; place: Place } => Boolean(x.place))
    .filter((x) => collection === "All" || x.fav.collection === collection);

  const savedItems = favoriteMenuItems.flatMap((f) => {
    const place = getPlace(f.placeId);
    const item = place?.menu?.items.find((i) => i.id === f.itemId);
    return place && item ? [{ place, item }] : [];
  });

  const upcomingPlans = datePlans.filter((p) => p.status === "upcoming");
  const donePlans = datePlans.filter((p) => p.status === "completed");

  const toggleCuisine = (c: string) =>
    setCuisines((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const toggleTag = (tag: PlaceTag) => {
    if (!isPro && ADVANCED_TAGS.includes(tag)) {
      setAdvancedLocked(true);
      return;
    }
    setTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  };

  const runAsk = () => {
    if (!askText.trim()) return;
    setAskBusy(true);
    // Yield a frame so the spinner paints before the synchronous ranking.
    requestAnimationFrame(() => {
      const parsed = parseAsk(askText);
      const result = recommendPlaces({
        ...parsed,
        near: near ?? undefined,
        city: CITIES.some((c) => c.name === city) ? city : undefined,
        favorites: favoritePlaces.map((f) => f.placeId),
        plan: isPro ? "pro" : "free",
      });
      setAskResult(result);
      setAskPeople(parsed.people ?? people);
      setAskBusy(false);
    });
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setGpsError("Location isn't available on this device — pick a city instead.");
      return;
    }
    setGpsBusy(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsBusy(false);
      },
      () => {
        setGpsError("Location permission was declined — pick a city instead.");
        setGpsBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  if (!isPro) {
    return (
      <div className="space-y-5 pt-2 pb-14 animate-fade max-w-md mx-auto">
        {/* Header */}
        <section className="flex items-start justify-between gap-2">
          <div>
            <span className="rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
              👑 PRO EXCLUSIVE
            </span>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-black leading-tight text-[#18181B] dark:text-white tracking-tight">
              Date Spots &amp; Venues
            </h1>
            <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
              Where should you go — and what should you wear?
            </p>
          </div>
          <button
            onClick={() => navigate("/profile")}
            aria-label="Open profile"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e5ebf3] text-[11px] font-bold text-[#27466c]"
          >
            {profile.name.trim().split(/\s+/).map((p) => p[0]?.toUpperCase()).slice(0, 2).join("") || "A"}
          </button>
        </section>

        {/* Pro Lock Hero Card */}
        <div className="rounded-3xl border-2 border-[#FF7F02] dark:border-blue-500 bg-gradient-to-br from-[#FF7F02] to-[#FFA742] p-6 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-36 w-36 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-2xl shadow-inner">
              🔒
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight text-white">
                Date Suggestions are Exclusive to Pro
              </h2>
              <p className="mt-1.5 text-xs text-slate-200 leading-relaxed font-normal">
                Never feel underdressed or guess the bill. <b>Firie Pro</b> curates top Addis Ababa cafes, romantic rooftops, and dinner spots with verified menu budgets in ETB and custom outfit pairing.
              </p>
            </div>

            {/* Feature Perks */}
            <div className="space-y-2 pt-1 text-xs text-white/95 font-medium">
              <div className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 border border-white/10 backdrop-blur-sm">
                <span className="text-base">🍷</span>
                <span><b>Curated Addis Venues:</b> Cafes, rooftops &amp; romantic dinners</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 border border-white/10 backdrop-blur-sm">
                <span className="text-base">👗</span>
                <span><b>Automatic Closet Styling:</b> Looks matched to venue ambiance</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 border border-white/10 backdrop-blur-sm">
                <span className="text-base">💳</span>
                <span><b>Verified Menu Budgets:</b> Honest prices in ETB</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 border border-white/10 backdrop-blur-sm">
                <span className="text-base">📸</span>
                <span><b>Photo Spots:</b> Best lighting angles &amp; picture locations</span>
              </div>
            </div>

            {/* Upgrade CTA */}
            <div className="pt-2">
              <button
                onClick={() => navigate("/upgrade")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[#FF7F02] text-xs sm:text-sm font-black shadow-xl hover:bg-orange-50 active:scale-98 transition-all"
              >
                <span>Upgrade to Firie Pro · 600 ETB / month</span>
                <span className="text-base">→</span>
              </button>
              <p className="mt-2 text-center text-[10px] text-white/70">
                Supported with Telebirr, CBE &amp; Cards · Cancel anytime
              </p>
            </div>
          </div>
        </div>

        {/* Blurred Teaser Preview */}
        <div className="space-y-3 opacity-60 pointer-events-none filter blur-[1px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#73819A]">
            Popular Addis Venues Included in Pro:
          </p>
          <div className="space-y-2">
            {[
              { name: "Kuriftu Entoto Mountain", type: "Rooftop & Nature · 2,500 ETB" },
              { name: "Mama's Kitchen Bole", type: "Romantic Dinner & Live Music · 1,800 ETB" },
              { name: "Tomoca Coffee Piazza", type: "Classic Italian Coffee Date · 400 ETB" },
            ].map((spot, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-3 shadow-xs">
                <div>
                  <p className="text-xs font-black text-[#18181B] dark:text-white">{spot.name}</p>
                  <p className="text-[10px] text-[#73819A]">{spot.type}</p>
                </div>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-[#18181B] dark:text-white">
                  🔒 Pro
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* ------------------------------ Header ------------------------------ */}
      <section className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[1.4px] text-[#8392a7]">Date Spots</p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-1px] text-[#102642] dark:text-white">
            {greeting(profile.name)}
          </h1>
          <p className="mt-0.5 text-[11px] text-[#73839a]">Where should you go — and what should you wear?</p>
        </div>
        <button
          onClick={() => navigate("/profile")}
          aria-label="Open profile"
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-[#e5ebf3] text-[11px] font-bold text-[#27466c]"
        >
          {profile.name.trim().split(/\s+/).map((p) => p[0]?.toUpperCase()).slice(0, 2).join("") || "A"}
        </button>
      </section>

      {/* Location selector */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowCitySheet(true)}
          className="flex items-center gap-1.5 rounded-full border border-[#e0e6ed] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-3.5 py-1.5 text-[11px] font-bold text-[#18181B] dark:text-white shadow-sm"
        >
          📍 {gps ? "My location" : city} <span className="text-[#98a4b4]">▾</span>
        </button>
        <button
          onClick={useMyLocation}
          disabled={gpsBusy}
          className="flex items-center gap-1.5 rounded-full border border-[#e0e6ed] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-3.5 py-1.5 text-[11px] font-semibold text-[#526b89] dark:text-[#94A3B8] disabled:opacity-60 shadow-sm"
        >
          {gpsBusy ? <Spinner className="h-3 w-3" /> : "◎"} Use GPS
        </button>
        {gps && (
          <button onClick={() => setGps(null)} className="rounded-full px-2 py-1.5 text-[10px] text-[#8a98a9]">
            clear
          </button>
        )}
      </div>
      {gpsError && <p className="text-[10px] text-[#a2546b]">{gpsError}</p>}

      {/* Search bar */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98a4b4]">⌕</span>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value) setTab("search");
          }}
          onFocus={() => setTab("search")}
          placeholder="Search cafes, rooftops, verified menus…"
          aria-label="Find a place for your date"
          className="w-full rounded-full border border-[#e2e8ef] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] py-3 pl-10 pr-4 text-xs text-[#18181B] dark:text-white outline-none placeholder:text-[#98a4b4] focus:border-[#FF7F02] shadow-sm"
        />
      </div>

      {/* Quick Vibe Filters */}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {[
          { label: "✨ All Spots", cat: undefined },
          { label: "🍷 Romantic Dinner", cat: "romantic-dinner" as PlaceCategory },
          { label: "☕ Coffee Date", cat: "coffee-date" as PlaceCategory },
          { label: "🌆 Rooftop Views", cat: "rooftop" as PlaceCategory },
          { label: "🍲 Traditional Habesha", cat: "traditional-food" as PlaceCategory },
        ].map((vibe, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (vibe.cat) {
                setCategory(vibe.cat);
                setTab("search");
              } else {
                setCategory(undefined);
                setTab("discover");
              }
            }}
            className="shrink-0 rounded-full border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-3.5 py-1.5 text-[10.5px] font-bold text-[#18181B] dark:text-[#DCE5F2] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] shadow-sm transition-all"
          >
            {vibe.label}
          </button>
        ))}
      </div>

      {/* Sub tabs */}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all shadow-sm ${
              tab === t.id
                ? "border-[#FF7F02] bg-[#FF7F02] dark:bg-white text-white dark:text-[#18181B]"
                : "border-[#e0e6ed] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#718198] dark:text-[#94A3B8]"
            }`}
          >
            {t.label}
            {t.id === "plans" && upcomingPlans.length > 0 && ` · ${upcomingPlans.length}`}
            {t.id === "saved" && favoritePlaces.length + favoriteMenuItems.length > 0 && ` · ${favoritePlaces.length + favoriteMenuItems.length}`}
          </button>
        ))}
      </div>

      {/* ----------------------------- Discover ---------------------------- */}
      {tab === "discover" && (
        <div className="space-y-5">
          <button
            onClick={() => setTab("search")}
            className="flex w-full items-center justify-between rounded-[15px] border border-[#dce5f0] bg-[#eef3fa] px-4 py-3 text-left dark:border-[#1E293B] dark:bg-[#16213b]"
          >
            <span>
              <b className="block text-xs text-[#17375d] dark:text-[#DCE5F2]">Ask Firie for a spot</b>
              <span className="mt-0.5 block text-[10px] text-[#5f7396] dark:text-[#94A3B8]">
                “Find me a romantic cafe for two under 1,500 ETB”
              </span>
            </span>
            <span className="text-sm text-[#17375d] dark:text-[#DCE5F2]">→</span>
          </button>

          {/* ── Your night: budget · date or friends · people count ── */}
          <section className="rounded-[15px] border border-[#dce5f0] bg-white p-3.5 dark:border-[#1E293B] dark:bg-[#0F172A]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8392a7]">Your night</span>
              <span className="text-[9.5px] font-semibold text-[#8392a7]">
                {people} {people === 1 ? "person" : "people"} · {partyMode === "date" ? "Date" : "With friends"}
              </span>
            </div>

            {/* Date or with friends */}
            <div className="mt-2.5 flex gap-1.5 rounded-full bg-[#F1F5F9] p-1 dark:bg-[#1E293B]">
              {([
                { id: "date" as const, label: "🍷 On a date" },
                { id: "friends" as const, label: "🎉 With friends" },
              ]).map((option) => (
                <button
                  key={option.id}
                  onClick={() => setPartyMode(option.id)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-2 text-[11px] font-bold transition-all active:scale-95",
                    partyMode === option.id
                      ? "bg-[#FF7F02] text-white shadow-sm dark:bg-white dark:text-[#18181B]"
                      : "text-[#64748B] dark:text-[#94A3B8]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Budget + people */}
            <div className="mt-3 flex items-end gap-3">
              <label className="min-w-0 flex-1">
                <span className="block text-[9.5px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  Total budget (ETB)
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  value={partyBudget}
                  onChange={(event) => setPartyBudget(Math.max(0, Number(event.target.value) || 0))}
                  aria-label="Total budget for the whole party"
                  className="mt-1 w-full rounded-xl border border-[#e2e8ef] bg-white px-3 py-2.5 text-xs font-bold text-[#18181B] outline-none focus:border-[#FF7F02] dark:border-[#1E293B] dark:bg-[#0C1527] dark:text-white"
                />
              </label>

              <div>
                <span className="block text-[9.5px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  People (You + Others)
                </span>
                <div className="mt-1 flex items-center gap-1 rounded-xl border border-[#e2e8ef] px-1.5 py-1.5 dark:border-[#1E293B]">
                  <button
                    onClick={() => setOthers((value) => Math.max(0, value - 1))}
                    aria-label="One fewer person"
                    className="grid h-7 w-7 place-items-center rounded-lg bg-[#F1F5F9] text-sm font-bold text-[#18181B] active:scale-95 dark:bg-[#1E293B] dark:text-white"
                  >
                    −
                  </button>
                  <span className="min-w-[56px] text-center text-xs font-black text-[#18181B] dark:text-white">
                    {people} {people === 1 ? "person" : "total"}
                  </span>
                  <button
                    onClick={() => setOthers((value) => Math.min(49, value + 1))}
                    aria-label="One more person"
                    className="grid h-7 w-7 place-items-center rounded-lg bg-[#F1F5F9] text-sm font-bold text-[#18181B] active:scale-95 dark:bg-[#1E293B] dark:text-white"
                  >
                    ＋
                  </button>
                </div>
              </div>
            </div>

            {/* Quick budget preset chips */}
            <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[800, 1500, 2500, 4000, 6000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setPartyBudget(preset)}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95",
                    partyBudget === preset
                      ? "bg-[#FF7F02] dark:bg-white text-white dark:text-[#18181B] shadow-sm font-black"
                      : "bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#E2E8F0]"
                  )}
                >
                  {preset.toLocaleString()} ETB
                </button>
              ))}
            </div>

            <div className="mt-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0C1527] p-2 text-[10px] leading-relaxed text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#1E293B]">
              {partyBudget > 0 ? (
                <span>
                  💰 Total: <b className="text-[#18181B] dark:text-white">{partyBudget.toLocaleString()} ETB</b> for{" "}
                  <b className="text-[#18181B] dark:text-white">{people}</b> (You + {others} {others === 1 ? "other" : "others"}) ≈{" "}
                  <b className="text-[#059669] dark:text-[#34D399]">{perPersonBudget.toLocaleString()} ETB / person</b>. Spots are filtered and ranked to fit your budget.
                </span>
              ) : (
                <span>No budget cap set — enter an amount or tap a preset to rank spots by your budget.</span>
              )}
            </div>
          </section>

          {PLACES.length === 0 ? (
            <div className="my-6 rounded-3xl border border-dashed border-[#DCE5F2] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-8 text-center shadow-sm animate-fade">
              <span className="text-4xl">📍</span>
              <h3 className="mt-3 text-base font-black text-[#18181B] dark:text-white">
                Ready for Your Real Locations
              </h3>
              <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
                All previous demo spots have been cleared. Send your locations, their real menus, and prices, and Firie will display them here with the interactive budget calculator and outfit matching!
              </p>
            </div>
          ) : (
            <>
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-[12px] font-bold">Recommended for you</h2>
                  <span className="text-[9.5px] font-semibold text-[#8392a7]">
                    {partyBudget > 0
                      ? `under ${partyBudget.toLocaleString()} ETB · ${people} ${people === 1 ? "person" : "people"}`
                      : `${people} ${people === 1 ? "person" : "people"}`}
                  </span>
                </div>
                <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
                  {recommended.map(({ place, reason, estTotalForPeople }) => {
                    const totalCost = estTotalForPeople ?? Math.round((place.priceLevel === 1 ? 250 : place.priceLevel === 2 ? 650 : place.priceLevel === 3 ? 1200 : 2200) * (people / 2));
                    const fitsBudget = partyBudget > 0 ? totalCost <= partyBudget : true;

                    return (
                      <div key={place.id} className="w-[188px] shrink-0 flex flex-col justify-between">
                        <PlaceCard
                          place={place}
                          near={near ?? undefined}
                          onClick={() => navigate(`/datespots/${place.id}`)}
                          onStyleForPlace={setStylingPlace}
                        />
                        <div className="mt-1 px-1">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "rounded-md px-1.5 py-0.5 text-[8.5px] font-bold",
                              fitsBudget
                                ? "bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0]"
                                : "bg-[#FFFBEB] dark:bg-[#451A03] text-[#B45309] dark:text-[#FDE68A]"
                            )}>
                              ~{totalCost.toLocaleString()} ETB for {people}
                            </span>
                            {partyBudget > 0 && fitsBudget && (
                              <span className="text-[8px] font-bold text-[#059669] dark:text-[#34D399]">
                                Within budget ✓
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[9px] leading-snug text-[#8292a8]">✦ {reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!isPro && (
                  <p className="mt-1.5 text-[9.5px] text-[#8a9099]">
                    Free matching uses budget, distance and occasion. <button onClick={() => navigate("/upgrade")} className="font-semibold text-[#927445]">Pro adds atmosphere & food prefs →</button>
                  </p>
                )}
              </section>

              {visibleSections
                .filter((s) => s.id !== "recommended")
                .map((section) => (
                  <section key={section.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-[12px] font-bold">{section.title}</h2>
                      <button onClick={() => { setTab("search"); setText(""); }} className="text-[10px] font-semibold text-[#7186a0]">
                        See all
                      </button>
                    </div>
                    <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
                      {section.places.map((place) => (
                        <PlaceCard
                          key={`${section.id}-${place.id}`}
                          place={place}
                          near={near ?? undefined}
                          onClick={() => navigate(`/datespots/${place.id}`)}
                          onStyleForPlace={setStylingPlace}
                        />
                      ))}
                    </div>
                  </section>
                ))}
            </>
          )}

          {/* Categories */}
          <section>
            <h2 className="mb-2 text-[12px] font-bold">Browse by occasion</h2>
            <div className="flex flex-wrap gap-1.5">
              {PLACE_CATEGORY_ORDER.map((cat) => (
                <Chip
                  key={cat}
                  onClick={() => {
                    setTab("search");
                    setText(PLACE_CATEGORY_LABELS[cat]);
                  }}
                >
                  {PLACE_CATEGORY_LABELS[cat]}
                </Chip>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ------------------------------ Search ----------------------------- */}
      {tab === "search" && (
        <div className="space-y-4">
          {/* AI ask */}
          <div className="rounded-[15px] border border-[#e7ebf0] bg-white dark:border-[#1E293B] dark:bg-[#0F172A] p-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8392a7]">Ask Firie</label>
            <div className="mt-1.5 flex gap-2">
              <input
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAsk()}
                placeholder="Romantic cafe for two under 1,500 ETB…"
                aria-label="Ask Firie for a place"
                className="min-w-0 flex-1 rounded-xl border border-[#e2e8ef] px-3 py-2.5 text-xs outline-none focus:border-[#7892b4]"
              />
              <Button onClick={runAsk} disabled={askBusy} className="px-3 py-2.5 text-xs">
                {askBusy ? <Spinner /> : "Find"}
              </Button>
            </div>
            {askResult && (
              <div className="mt-3 space-y-2">
                {askResult.note && (
                  <p className="rounded-xl bg-[#f4f6f8] px-3 py-2 text-[10px] leading-relaxed text-[#596575]">{askResult.note}</p>
                )}
                {askResult.results.map((r) => (
                  <button
                    key={r.place.id}
                    onClick={() => navigate(`/datespots/${r.place.id}`)}
                    className="flex w-full gap-2.5 rounded-xl border border-[#edf0f4] p-2 text-left"
                  >
                    <PlaceImage place={r.place} className="h-14 w-14 shrink-0" rounded="rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-[#112844] dark:text-white">{r.place.name}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-[#73839a]">✦ {r.reason}</span>
                      <span className="mt-0.5 block text-[9.5px] font-semibold text-[#526b89]">
                        {r.estTotalForPeople !== null
                          ? `≈ ${r.estTotalForPeople.toLocaleString()} ${r.place.menu?.items[0]?.currency ?? "ETB"} est. for ${askPeople}`
                          : "Pricing unconfirmed — check the menu"}
                        {r.distanceKm !== null ? ` · ${r.distanceKm.toFixed(1)} km` : ""}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="space-y-2.5 rounded-[15px] border border-[#e7ebf0] bg-white dark:border-[#1E293B] dark:bg-[#0F172A] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8392a7]">Filters</span>
              {(maxBudget || maxDistance || cuisines.length || tags.length) && (
                <button
                  onClick={() => { setMaxBudget(null); setMaxDistance(null); setCuisines([]); setTags([]); }}
                  className="text-[10px] font-semibold text-[#7186a0]"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
              <span className="shrink-0 py-1 text-[10px] font-semibold text-[#8292a8]">Budget pp:</span>
              {[
                { label: "Any", value: null },
                { label: "< 500", value: 500 },
                { label: "< 1,000", value: 1000 },
                { label: "< 2,000", value: 2000 },
              ].map((b) => (
                <Chip key={b.label} active={maxBudget === b.value} onClick={() => setMaxBudget(b.value)}>
                  {b.label}
                </Chip>
              ))}
            </div>

            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
              <span className="shrink-0 py-1 text-[10px] font-semibold text-[#8292a8]">Distance:</span>
              {[
                { label: "Any", value: null },
                { label: "3 km", value: 3 },
                { label: "5 km", value: 5 },
                { label: "10 km", value: 10 },
              ].map((d) => (
                <Chip key={d.label} active={maxDistance === d.value} onClick={() => setMaxDistance(d.value)} disabled={!near && d.value !== null}>
                  {d.label}
                </Chip>
              ))}
              {!near && <span className="shrink-0 py-1 text-[9.5px] text-[#a0a5ad]">needs location</span>}
            </div>

            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
              <span className="shrink-0 py-1 text-[10px] font-semibold text-[#8292a8]">Food:</span>
              {["Ethiopian", "Italian", "Coffee", "International", "Asian"].map((c) => (
                <Chip key={c} active={cuisines.includes(c)} onClick={() => toggleCuisine(c)}>
                  {c}
                </Chip>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[...FREE_TAGS, ...ADVANCED_TAGS].map((tag) => {
                const locked = !isPro && ADVANCED_TAGS.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-2.5 py-1.5 text-[10px] font-semibold ${
                      tags.includes(tag)
                        ? "border-[#102f53] bg-[#102f53] text-white"
                        : locked
                          ? "border-dashed border-[#d8dfe8] bg-[#f7f9fb] text-[#98a4b4]"
                          : "border-[#e0e6ed] bg-white text-[#718198] dark:border-[#1E293B] dark:bg-[#0F172A] dark:text-[#94A3B8]"
                    }`}
                  >
                    {PLACE_TAG_LABELS[tag]}
                    {locked ? " 🔒" : ""}
                  </button>
                );
              })}
            </div>
            {advancedLocked && !isPro && (
              <ProLock onUpgrade={() => navigate("/upgrade")} note="Advanced discovery filters — quiet, live music, vegetarian, rooftop and indoor/outdoor — are part of Pro." />
            )}
          </div>

          {/* Results */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#8392a7]">
              {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
            </p>
            {searchResults.length === 0 ? (
              <EmptyState
                icon="🍽"
                title="No listed place matches yet"
                body="Try a wider budget or clear a filter. Firie only shows real, listed venues — it never invents restaurants."
                action={<Button variant="secondary" onClick={() => { setText(""); setMaxBudget(null); setMaxDistance(null); setCuisines([]); setTags([]); }}>Clear filters</Button>}
              />
            ) : (
              <div className="space-y-2">
                {searchResults.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    near={near ?? undefined}
                    layout="row"
                    onClick={() => navigate(`/datespots/${place.id}`)}
                    onStyleForPlace={setStylingPlace}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------- Map ------------------------------- */}
      {tab === "map" && (
        <div className="space-y-3">
          <PlaceMap
            places={allMapPlaces}
            selectedId={selectedOnMap ?? undefined}
            onSelect={setSelectedOnMap}
            center={near ?? undefined}
            height={300}
          />
          {selectedOnMap ? (
            (() => {
              const place = getPlace(selectedOnMap);
              if (!place) return null;
              const km = near ? distanceKm(near, place) : null;
              return (
                <div className="flex gap-3 rounded-[15px] border border-[#e7ebf0] bg-white dark:border-[#1E293B] dark:bg-[#0F172A] p-3">
                  <PlaceImage place={place} className="h-16 w-16 shrink-0" rounded="rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-[#112844] dark:text-white">{place.name}</p>
                    <p className="truncate text-[10px] text-[#73839a]">{place.neighborhood}, {place.city}{km !== null ? ` · ${km.toFixed(1)} km` : ""}</p>
                    <button onClick={() => navigate(`/datespots/${place.id}`)} className="mt-2 rounded-full bg-[#102f53] px-3.5 py-2 text-[11px] font-bold text-white">
                      View details →
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <p className="text-center text-[10px] text-[#8a9099]">Tap a pin to preview a place. Location access is optional — the map works with a chosen city too.</p>
          )}

          <div>
            <h2 className="mb-2 text-[12px] font-bold">Compare distances</h2>
            <div className="space-y-1.5">
              {[...allMapPlaces]
                .sort((a, b) => (near ? distanceKm(near, a) - distanceKm(near, b) : a.name.localeCompare(b.name)))
                .slice(0, 6)
                .map((place) => (
                  <button
                    key={place.id}
                    onClick={() => setSelectedOnMap(place.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-[#edf0f4] bg-white dark:border-[#1E293B] dark:bg-[#0F172A] px-3 py-2.5 text-left"
                  >
                    <span className="truncate text-[11px] font-semibold text-[#30435c]">{place.name}</span>
                    <span className="shrink-0 text-[10px] font-semibold text-[#7186a0]">
                      {near ? `${distanceKm(near, place).toFixed(1)} km` : place.neighborhood}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------- Plans ----------------------------- */}
      {tab === "plans" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-bold">Your date plans</h2>
            <Button
              onClick={() => { setEditingPlan(null); setPlannerOpen(true); }}
              className="px-3.5 py-2 text-[11px]"
              disabled={!isPro && datePlans.length >= FREE_DATE_PLAN_LIMIT}
            >
              + New plan
            </Button>
          </div>
          {!isPro && datePlans.length >= FREE_DATE_PLAN_LIMIT && (
            <ProLock onUpgrade={() => navigate("/upgrade")} note={`Free keeps ${FREE_DATE_PLAN_LIMIT} date plans. Pro keeps unlimited plans with full editing.`} />
          )}
          {datePlans.length === 0 ? (
            <EmptyState
              icon="🗓"
              title="No date plans yet"
              body="Open any restaurant and tap “Plan a date” to save the place, time, budget and outfit."
              action={<Button onClick={() => setTab("discover")}>Find a place</Button>}
            />
          ) : (
            <>
              {upcomingPlans.length > 0 && (
                <div className="space-y-2">
                  {upcomingPlans.map((plan) => {
                    const place = getPlace(plan.placeId);
                    return (
                      <div key={plan.id} className="rounded-[15px] border border-[#e7ebf0] bg-white dark:border-[#1E293B] dark:bg-[#0F172A] p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-bold text-[#112844] dark:text-white">{plan.name}</p>
                            <p className="mt-0.5 truncate text-[11px] text-[#526b89]">
                              {place ? place.name : "Place removed"} · {plan.date} · {plan.time}
                            </p>
                            <p className="mt-1 text-[10px] text-[#73839a]">
                              {plan.people} {plan.people === 1 ? "person" : "people"} · budget {plan.budget.toLocaleString()} · {plan.itemIds.length} outfit piece{plan.itemIds.length === 1 ? "" : "s"}
                            </p>
                            {plan.notes && <p className="mt-1 text-[10px] italic text-[#8a9099]">“{plan.notes}”</p>}
                          </div>
                          <span className="shrink-0 rounded-full bg-[#e9eff7] px-2 py-1 text-[9px] font-bold text-[#17375d]">UPCOMING</span>
                        </div>
                        <div className="mt-2.5 flex gap-2">
                          <button onClick={() => completeDatePlan(plan.id)} className="flex-1 rounded-full bg-[#102f53] px-3 py-2 text-[10.5px] font-bold text-white">
                            Mark completed
                          </button>
                          <button onClick={() => { setEditingPlan(plan); setPlannerOpen(true); }} className="rounded-full border border-[#e0e6ed] px-3 py-2 text-[10.5px] font-semibold text-[#526b89]">
                            Edit
                          </button>
                          <button onClick={() => deleteDatePlan(plan.id)} aria-label={`Delete ${plan.name}`} className="rounded-full border border-[#f0d7d7] px-3 py-2 text-[10.5px] font-semibold text-[#b45252]">
                            Delete
                          </button>
                        </div>
                        {place && (
                          <button onClick={() => navigate(`/datespots/${place.id}`)} className="mt-2 text-[10px] font-semibold text-[#7186a0]">
                            Open {place.name} →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {donePlans.length > 0 && (
                <div>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#8392a7]">Completed</h3>
                  <div className="space-y-1.5">
                    {donePlans.map((plan) => (
                      <div key={plan.id} className="flex items-center justify-between rounded-xl border border-[#edf0f4] bg-white dark:border-[#1E293B] dark:bg-[#0F172A] px-3 py-2.5">
                        <span className="truncate text-[11px] text-[#526b89]">
                          ✓ {plan.name} · {getPlace(plan.placeId)?.name ?? "Place removed"}
                        </span>
                        <button onClick={() => deleteDatePlan(plan.id)} aria-label="Delete plan" className="ml-2 shrink-0 text-[13px] text-[#b45252]">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ------------------------------- Saved ----------------------------- */}
      {tab === "saved" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-bold">Saved places & dishes</h2>
            <span className="text-[10px] text-[#8392a7]">
              {favoritePlaces.length + favoriteMenuItems.length}/{isPro ? "∞" : FREE_FAVORITE_LIMIT}
            </span>
          </div>

          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {["All", ...DATE_COLLECTIONS].map((c) => (
              <Chip key={c} active={collection === c} onClick={() => setCollection(c)}>
                {c}
              </Chip>
            ))}
          </div>

          {!isPro && favoritesFull && (
            <ProLock onUpgrade={() => navigate("/upgrade")} note={`Free keeps ${FREE_FAVORITE_LIMIT} favourites. Pro saves unlimited places and dishes.`} />
          )}

          {savedPlaces.length === 0 && savedItems.length === 0 ? (
            <EmptyState
              icon="♡"
              title={collection === "All" ? "Nothing saved yet" : `Nothing in ${collection} yet`}
              body="Tap the heart on any restaurant or cafe to keep it here — favourites stay with your Firie account."
              action={<Button onClick={() => setTab("discover")}>Browse places</Button>}
            />
          ) : (
            <>
              {savedPlaces.length > 0 && (
                <div className="space-y-2">
                  {savedPlaces.map(({ fav, place }) => (
                    <div key={fav.placeId} className="flex gap-3 rounded-[15px] border border-[#e7ebf0] bg-white dark:border-[#1E293B] dark:bg-[#0F172A] p-2.5">
                      <button onClick={() => navigate(`/datespots/${place.id}`)} className="shrink-0">
                        <PlaceImage place={place} className="h-[62px] w-[62px]" rounded="rounded-xl" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <button onClick={() => navigate(`/datespots/${place.id}`)} className="block w-full truncate text-left text-[12.5px] font-bold text-[#112844] dark:text-white">
                          {place.name}
                        </button>
                        <p className="truncate text-[10px] text-[#73839a]">{place.neighborhood}, {place.city}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="rounded-full bg-[#eef2f7] px-2 py-0.5 text-[9px] font-semibold text-[#526b89]">{fav.collection}</span>
                          {movingPlaceId === fav.placeId ? (
                            <span className="flex items-center gap-1">
                              {DATE_COLLECTIONS.filter((c) => c !== fav.collection).map((c) => (
                                <button
                                  key={c}
                                  onClick={() => {
                                    setPlaceCollection(fav.placeId, c);
                                    setMovingPlaceId(null);
                                  }}
                                  className="rounded-full border border-[#c9d5e4] px-1.5 py-0.5 text-[9px] font-bold text-[#17375d]"
                                >
                                  → {c}
                                </button>
                              ))}
                              <button onClick={() => setMovingPlaceId(null)} className="text-[9px] font-semibold text-[#98a4b4]">
                                ✕
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setMovingPlaceId(fav.placeId)}
                              className="text-[9.5px] font-semibold text-[#7186a0]"
                            >
                              move
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {savedItems.length > 0 && (
                <div>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#8392a7]">Saved dishes</h3>
                  <div className="space-y-1.5">
                    {savedItems.map(({ place, item }) => (
                      <button
                        key={`${place.id}-${item.id}`}
                        onClick={() => navigate(`/datespots/${place.id}`)}
                        className="flex w-full items-center justify-between rounded-xl border border-[#edf0f4] bg-white dark:border-[#1E293B] dark:bg-[#0F172A] px-3 py-2.5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[11.5px] font-semibold text-[#30435c]">{item.name}</span>
                          <span className="block truncate text-[9.5px] text-[#8a9099]">{place.name}</span>
                        </span>
                        <span className="ml-2 shrink-0 text-[10.5px] font-bold text-[#526b89]">
                          {item.price !== null ? `${item.price.toLocaleString()} ${item.currency}` : "Unavailable"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ---------------------------- City sheet --------------------------- */}
      {showCitySheet && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#040d18]/45 backdrop-blur-sm animate-fade" onClick={() => setShowCitySheet(false)}>
          <div className="bottom-sheet w-full max-w-[480px] animate-slide-up p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#d6e0ee]" />
            <h3 className="text-sm font-bold text-[#102642] dark:text-white">Choose your location</h3>
            <p className="mt-1 text-[11px] text-[#73839a]">Addis Ababa is just the start — pick any city, or use GPS.</p>
            <div className="mt-3 flex gap-2">
              <input
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="Type a city…"
                aria-label="Type a city"
                className="min-w-0 flex-1 rounded-xl border border-[#e2e8ef] px-3 py-2.5 text-xs outline-none focus:border-[#7892b4]"
              />
              <Button
                onClick={() => {
                  if (manualCity.trim()) setCity(manualCity.trim());
                  setGps(null);
                  setShowCitySheet(false);
                }}
                className="px-3.5 py-2.5 text-xs"
              >
                Use
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {CITIES.map((c) => (
                <button
                  key={c.name}
                  onClick={() => { setCity(c.name); setGps(null); setShowCitySheet(false); }}
                  className={`rounded-xl px-3 py-2.5 text-left text-[11.5px] font-semibold ${
                    city === c.name ? "bg-[#102f53] text-white" : "bg-[#f4f6f8] text-[#30435c]"
                  }`}
                >
                  {c.name}
                  <span className={`block text-[9px] font-normal ${city === c.name ? "text-white/70" : "text-[#8a98a9]"}`}>{c.country}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------- Planner sheet ------------------------- */}
      {plannerOpen && (
        <DatePlanSheet
          placeId={editingPlan?.placeId ?? savedPlaces[0]?.place.id ?? PLACES[0].id}
          plan={editingPlan}
          onClose={() => { setPlannerOpen(false); setEditingPlan(null); }}
        />
      )}

      {/* ── Spot Outfit Matcher Modal Sheet ── */}
      {stylingPlace && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade">
          <div className="w-full max-w-sm rounded-[32px] border border-white/20 bg-white dark:bg-[#0F172A] p-5 shadow-2xl animate-slide-up text-[#18181B] dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#EEF2F6] dark:bg-[#1E293B] text-xl shadow-xs">
                  ✨
                </div>
                <div>
                  <h3 className="text-sm font-black leading-tight">Style For {stylingPlace.name}</h3>
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                    {PLACE_CATEGORY_LABELS[stylingPlace.categories[0]]} · {stylingPlace.neighborhood}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStylingPlace(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 text-xs font-bold active:scale-90"
              >
                ✕
              </button>
            </div>

            {closet.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] p-5 text-center">
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Your closet is empty. Add a few pieces so Firie can curate an outfit for this venue.
                </p>
                <button
                  onClick={() => {
                    setStylingPlace(null);
                    navigate("/closet");
                  }}
                  className="mt-3 rounded-full bg-[#FF7F02] dark:bg-white px-5 py-2 text-xs font-bold text-white dark:text-[#18181B]"
                >
                  Add Items to Closet
                </button>
              </div>
            ) : placeOutfits.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] p-5 text-center">
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Generating matching looks from your wardrobe...
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {/* Garments Preview */}
                <div className="no-scrollbar flex gap-2 overflow-x-auto py-1">
                  {placeOutfits[0].outfit.itemIds.slice(0, 4).map((id) => {
                    const item = closet.find((c) => c.id === id);
                    if (!item) return null;
                    return (
                      <div
                        key={id}
                        className="flex h-20 w-20 shrink-0 flex-col items-center justify-between rounded-2xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] p-1.5 shadow-xs"
                      >
                        <div className="flex flex-1 items-center justify-center p-0.5">
                          <GarmentImage
                            src={item.imageUrl}
                            alt={item.name}
                            slot={item.slot}
                            colorHex={item.colorHex}
                            transparent
                            className="max-h-[46px] max-w-full object-contain"
                          />
                        </div>
                        <span className="truncate text-[8.5px] font-bold text-[#18181B] dark:text-white max-w-full">
                          {item.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* AI Venue Rationale */}
                <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F5F9] dark:bg-[#1E293B]/70 p-3 text-[11px] leading-relaxed text-[#475569] dark:text-[#CBD5E1]">
                  <b className="font-bold text-[#18181B] dark:text-white">Why it fits: </b>
                  {placeOutfits[0].reason}
                </div>

                {/* Action Buttons */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      const matched = placeOutfits[0].outfit;
                      lockOutfit(matched);
                      localStorage.setItem("fitly_selected_occasion", "date");
                      localStorage.setItem("fitly_has_requested_outfit", "true");
                      setStylingPlace(null);
                      navigate("/");
                    }}
                    className="flex-1 rounded-2xl bg-[#FF7F02] dark:bg-white py-3 text-xs font-bold text-white dark:text-[#18181B] shadow-md active:scale-95 transition-transform"
                  >
                    🔒 Wear This Look
                  </button>
                  <button
                    onClick={() => {
                      const matched = placeOutfits[0].outfit;
                      setStylingPlace(null);
                      navigate("/photo-style", {
                        state: { placeId: stylingPlace.id, itemIds: matched.itemIds },
                      });
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#FF7F02] dark:border-white px-4 py-3 text-xs font-bold text-[#18181B] dark:text-white active:scale-95 transition-transform"
                  >
                    <span>📷</span>
                    <span>Camera</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <p className="pt-1 text-center text-[9px] leading-relaxed text-[#9a9fa7]">
        venue data checked Nov 2026 · unpriced items are shown as “contact restaurant”, never guessed.
      </p>
    </div>
  );
}
