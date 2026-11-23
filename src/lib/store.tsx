import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { buildSeedCloset, buildSeedHistory } from "./seed";
import { generateOutfits, seasonForDate } from "./engine";
import { getWeather } from "./weather";
import { clearState, loadState, saveState, todayKey, weekKey } from "./storage";
import type { PlaceReport } from "./places";
import {
  FREE_DAILY_OUTFIT_LIMIT,
  FREE_DAILY_PHOTO_STYLE_LIMIT,
  FREE_WEEKLY_OUTFIT_LIMIT,
  FREE_WEEKLY_PHOTO_STYLE_LIMIT,
  FREE_DATE_PLAN_LIMIT,
  FREE_FAVORITE_LIMIT,
  FREE_ITEM_LIMIT,
  type ClosetItem,
  type DatePlan,
  type EventType,
  type FavoriteMenuItem,
  type FavoritePlace,
  type NewItemDraft,
  type Outfit,
  type OutfitLog,
  type OutfitUsage,
  type PhotoUsage,
  type PoseUse,
  type UserProfile,
  type WeatherSnapshot,
} from "./types";

const DEFAULT_PROFILE: UserProfile = {
  name: "Guest",
  city: "Addis Ababa",
  gender: "men",
  plan: "free",
  units: "metric",
  avoidRecentlyWorn: true,
  proSince: null,
  proExpiresAt: null,
  billingCycle: "monthly",
};

export interface StyleUsage {
  today: string;
  dailyCount: number;
  week: string;
  weeklyCount: number;
}

interface PersistedV1 {
  version: number;
  profile: UserProfile;
  closet: ClosetItem[];
  history: OutfitLog[];
  /* The outfit the user explicitly chose ("I want this") — restored on launch. */
  currentOutfit?: Outfit | null;
  currentOutfitDate?: string | null;
  /** Outfits the user hearted — shown in the Closet. */
  favoriteOutfits?: Outfit[];
  /* Feature slices added in v1 — optional so older saves keep loading. */
  photoUsage?: PhotoUsage;
  outfitUsage?: OutfitUsage;
  styleUsage?: StyleUsage;
  recentPoses?: PoseUse[];
  datePlans?: DatePlan[];
  favoritePlaces?: FavoritePlace[];
  favoriteMenuItems?: FavoriteMenuItem[];
  placeReports?: PlaceReport[];
}

interface AppContextValue {
  profile: UserProfile;
  closet: ClosetItem[];
  history: OutfitLog[];
  outfits: Outfit[];
  outfitIndex: number;
  generating: boolean;
  weather: WeatherSnapshot | null;
  weatherLoading: boolean;

  itemById: (id: string) => ClosetItem | undefined;
  isPro: boolean;
  freeLimitReached: boolean;

  /* --------------------- Free plan outfit allowance ----------------------- */
  /** Fresh looks left today for Free users; null = unlimited (Pro). */
  outfitsLeftToday: number | null;
  /** Fresh looks left this week for Free users; null = unlimited (Pro). */
  outfitsLeftThisWeek: number | null;
  /** True when the Free plan's daily (1) or weekly (3) look allowance is spent. */
  outfitLimitReached: boolean;

  generateFor: (event?: EventType) => boolean;
  nextOutfit: () => void;
  setOutfitIndex: (i: number) => void;
  currentOutfit: Outfit | null;
  /** True while a chosen outfit is locked — no other outfit is shown. */
  isLocked: boolean;
  lockOutfit: (outfit: Outfit) => void;
  unlockOutfit: () => void;

  /* --------------------------- Favourite outfits -------------------------- */
  favoriteOutfits: Outfit[];
  isOutfitFavorite: (outfitId: string) => boolean;
  toggleOutfitFavorite: (outfit: Outfit) => void;

  confirmOutfit: (outfit: Outfit) => void;
  isConfirmedToday: boolean;

  addItem: (draft: NewItemDraft) => ClosetItem | null;
  updateItem: (id: string, patch: Partial<ClosetItem>) => void;
  deleteItem: (id: string) => void;

  setProfile: (patch: Partial<UserProfile>) => void;
  upgradeToPro: (cycle?: "monthly" | "yearly") => void;
  cancelPro: () => void;
  refreshWeather: () => void;
  resetDemo: () => void;
  loadDemoCloset: () => void;
  clearAll: () => void;

  /* --------------------- Photo Style Camera --------------------- */
  /** This week's Photo Style recommendation usage (resets each week). */
  photoUsage: PhotoUsage;
  /** Recommendations left today for Free users; null = unlimited (Pro). */
  photoRecsLeftToday: number | null;
  /** Recommendations left this week for Free users; null = unlimited (Pro). */
  photoRecsLeftThisWeek: number | null;
  /** Recommendations left this week for Free users; null = unlimited (Pro). */
  photoRecsLeft: number | null;
  /** Burn one Free recommendation. */
  notePhotoRecommendation: () => void;
  /** Pose ids used in the last 3 days — damped in recommendations. */
  recentPoseIds: string[];
  markPoseUsed: (poseId: string) => void;

  /* ------------------------- Date Spots ------------------------- */
  datePlans: DatePlan[];
  /** Returns null when the Free plan cap (3) is reached. */
  saveDatePlan: (draft: Omit<DatePlan, "id" | "createdAt">) => DatePlan | null;
  updateDatePlan: (id: string, patch: Partial<DatePlan>) => void;
  deleteDatePlan: (id: string) => void;
  completeDatePlan: (id: string) => void;

  favoritePlaces: FavoritePlace[];
  favoriteMenuItems: FavoriteMenuItem[];
  isPlaceFavorite: (placeId: string) => boolean;
  /** Returns the new favourited state; false when the Free cap is reached. */
  togglePlaceFavorite: (placeId: string, collection?: string) => boolean;
  setPlaceCollection: (placeId: string, collection: string) => void;
  isMenuItemFavorite: (placeId: string, itemId: string) => boolean;
  toggleMenuItemFavorite: (placeId: string, itemId: string) => boolean;
  /** True when a Free user has used their 10 favourite slots. */
  favoritesFull: boolean;

  /** Files a venue report (wrong price, hours, location…). Local until a backend exists. */
  reportPlace: (report: Omit<PlaceReport, "createdAt">) => PlaceReport;

  /* ------------------------- Theme (Dark Mode) ------------------------- */
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const DAY = 24 * 60 * 60 * 1000;

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadInitial(): PersistedV1 {
  const saved = loadState<PersistedV1>();
  const isFirstOpen = localStorage.getItem("fitly_onboarded") !== "1";
  if (isFirstOpen) {
    return {
      version: 1,
      profile: DEFAULT_PROFILE,
      closet: [],
      history: [],
      currentOutfit: null,
      currentOutfitDate: null,
      favoriteOutfits: [],
      photoUsage: { date: weekKey(), count: 0 },
      outfitUsage: { today: todayKey(), dailyCount: 0, week: weekKey(), weeklyCount: 0 },
      styleUsage: { today: todayKey(), dailyCount: 0, week: weekKey(), weeklyCount: 0 },
      recentPoses: [],
      datePlans: [],
      favoritePlaces: [],
      favoriteMenuItems: [],
      placeReports: [],
    };
  }
  if (saved && saved.version === 1 && Array.isArray(saved.closet)) {
    return {
      version: 1,
      profile: { ...DEFAULT_PROFILE, ...saved.profile },
      closet: saved.closet,
      history: saved.history ?? [],
      currentOutfit: saved.currentOutfit ?? null,
      currentOutfitDate: saved.currentOutfitDate ?? null,
      favoriteOutfits: saved.favoriteOutfits ?? [],
      photoUsage: saved.photoUsage ?? { date: weekKey(), count: 0 },
      outfitUsage: saved.outfitUsage ?? { today: todayKey(), dailyCount: 0, week: weekKey(), weeklyCount: 0 },
      styleUsage: saved.styleUsage ?? { today: todayKey(), dailyCount: 0, week: weekKey(), weeklyCount: 0 },
      recentPoses: saved.recentPoses ?? [],
      datePlans: (saved.datePlans ?? []).map((p) => ({
        ...p,
        order: p.order ?? [],
        estimatedTotal: p.estimatedTotal ?? null,
      })),
      favoritePlaces: saved.favoritePlaces ?? [],
      favoriteMenuItems: saved.favoriteMenuItems ?? [],
      placeReports: saved.placeReports ?? [],
    };
  }
  return {
    version: 1,
    profile: DEFAULT_PROFILE,
    closet: [],
    history: [],
    currentOutfit: null,
    currentOutfitDate: null,
    favoriteOutfits: [],
    photoUsage: { date: weekKey(), count: 0 },
    styleUsage: { today: todayKey(), dailyCount: 0, week: weekKey(), weeklyCount: 0 },
    recentPoses: [],
    datePlans: [],
    favoritePlaces: [],
    favoriteMenuItems: [],
    placeReports: [],
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useRef<PersistedV1>(loadInitial());
  const [profile, setProfileState] = useState<UserProfile>(initial.current.profile);
  const [closet, setCloset] = useState<ClosetItem[]>(initial.current.closet);
  const [history, setHistory] = useState<OutfitLog[]>(initial.current.history);

  const [photoUsage, setPhotoUsage] = useState<PhotoUsage>(
    initial.current.photoUsage ?? { date: todayKey(), count: 0 }
  );
  const [outfitUsage, setOutfitUsage] = useState<OutfitUsage>(
    initial.current.outfitUsage ?? { today: todayKey(), dailyCount: 0, week: weekKey(), weeklyCount: 0 }
  );
  const [styleUsage] = useState<StyleUsage>(() => {
    const today = todayKey();
    const week = weekKey();
    const s = initial.current.styleUsage;
    return {
      today,
      dailyCount: s?.today === today ? s.dailyCount : 0,
      week,
      weeklyCount: s?.week === week ? s.weeklyCount : 0,
    };
  });
  const [styleVariation, setStyleVariation] = useState<number>(0);
  const [recentPoses, setRecentPoses] = useState<PoseUse[]>(initial.current.recentPoses ?? []);
  const [datePlans, setDatePlans] = useState<DatePlan[]>(initial.current.datePlans ?? []);
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>(
    initial.current.favoritePlaces ?? []
  );
  const [favoriteMenuItems, setFavoriteMenuItems] = useState<FavoriteMenuItem[]>(
    initial.current.favoriteMenuItems ?? []
  );
  const [placeReports, setPlaceReports] = useState<PlaceReport[]>(
    initial.current.placeReports ?? []
  );

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [outfitIndex, setOutfitIndex] = useState(0);
  const [lockedOutfit, setLockedOutfit] = useState<Outfit | null>(
    initial.current.currentOutfit ?? null
  );
  const [favoriteOutfits, setFavoriteOutfits] = useState<Outfit[]>(
    initial.current.favoriteOutfits ?? []
  );
  const [generating, setGenerating] = useState(false);
  const [event, setEvent] = useState<EventType>("none");

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("fitly_theme");
    if (saved === "dark" || saved === "light") return saved;
    return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("fitly_theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  /* ----------------------------- persistence ----------------------------- */
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveState<PersistedV1>({
        version: 1,
        profile,
        closet,
        history,
        currentOutfit: lockedOutfit,
        currentOutfitDate: lockedOutfit ? todayKey() : null,
        favoriteOutfits,
        photoUsage,
        outfitUsage,
        styleUsage,
        recentPoses,
        datePlans,
        favoritePlaces,
        favoriteMenuItems,
        placeReports,
      });
    }, 150);
    return () => clearTimeout(timeout);
  }, [
    profile,
    closet,
    history,
    lockedOutfit,
    favoriteOutfits,
    photoUsage,
    outfitUsage,
    styleUsage,
    recentPoses,
    datePlans,
    favoritePlaces,
    favoriteMenuItems,
    placeReports,
  ]);

  /* ------------------------------- derived ------------------------------- */
  const isPro = profile.plan === "pro";

  /* Free plan outfit allowance — 1 fresh look per day, up to 3 per week. */
  const outfitUsageValid: OutfitUsage = {
    today: outfitUsage.today === todayKey() ? outfitUsage.today : todayKey(),
    dailyCount: outfitUsage.today === todayKey() ? (outfitUsage.dailyCount ?? 0) : 0,
    week: outfitUsage.week === weekKey() ? outfitUsage.week : weekKey(),
    weeklyCount: outfitUsage.week === weekKey() ? outfitUsage.weeklyCount : 0,
  };

  const outfitsLeftToday = isPro
    ? null
    : Math.max(0, FREE_DAILY_OUTFIT_LIMIT - outfitUsageValid.dailyCount);
  const outfitsLeftThisWeek = isPro
    ? null
    : Math.max(0, FREE_WEEKLY_OUTFIT_LIMIT - outfitUsageValid.weeklyCount);
  const outfitLimitReached = !isPro && (outfitsLeftToday === 0 || outfitsLeftThisWeek === 0);

  const recentItemIds = useMemo(() => {
    const cutoff = Date.now() - 6 * DAY;
    const recent = history
      .filter((h) => new Date(h.date + "T00:00:00").getTime() >= cutoff)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    const ids: string[] = [];
    for (const log of recent) {
      for (const id of log.itemIds) if (!ids.includes(id)) ids.push(id);
    }
    return ids;
  }, [history]);

  const itemMap = useMemo(() => {
    const m = new Map<string, ClosetItem>();
    for (const i of closet) m.set(i.id, i);
    return m;
  }, [closet]);

  const itemById = useCallback((id: string) => itemMap.get(id), [itemMap]);

  /**
   * A chosen outfit stays locked across restarts until the user changes it —
   * but only while its pieces are still in the closet.
   */
  const lockedChosen = useMemo(() => {
    if (!lockedOutfit) return null;
    const stillOwned = lockedOutfit.itemIds.some((id) => itemMap.has(id));
    return stillOwned ? lockedOutfit : null;
  }, [lockedOutfit, itemMap]);

  const currentOutfit = lockedChosen ?? outfits[outfitIndex] ?? null;
  const isLocked = lockedChosen !== null;

  const isConfirmedToday = useMemo(
    () => history.some((h) => h.date === todayKey()),
    [history]
  );

  /* ------------------------------ generation ----------------------------- */
  const generate = useCallback(
    (evt: EventType, dynamicSeed?: number) => {
      setGenerating(true);
      const seedToUse = dynamicSeed ?? (Date.now() + styleVariation * 777 + Math.floor(Math.random() * 99999));
      const result = generateOutfits(closet, {
        plan: profile.plan,
        event: evt,
        weather: weather, // REAL-TIME LIVE WEATHER FOR ALL USERS
        recentItemIds: profile.avoidRecentlyWorn ? recentItemIds : [],
        season: seasonForDate(),
        seed: seedToUse,
      });
      // Free plan: one fresh look at a time (1/day, 3/week). Pro gets the full deck.
      setOutfits(
        profile.plan === "free" ? result.outfits.slice(0, FREE_DAILY_OUTFIT_LIMIT) : result.outfits
      );
      setOutfitIndex(0);
      setGenerating(false);
    },
    [closet, profile.plan, profile.avoidRecentlyWorn, weather, recentItemIds, styleVariation]
  );

  const generateFor = useCallback(
    (evt?: EventType): boolean => {
      const next = evt ?? event;
      // Free plan: a fresh look spends one daily slot — 1/day, max 3/week.
      if (profile.plan === "free") {
        const today = todayKey();
        const week = weekKey();
        const daily = outfitUsage.today === today ? outfitUsage.dailyCount ?? 0 : 0;
        const weekly = outfitUsage.week === week ? outfitUsage.weeklyCount ?? 0 : 0;
        if (daily >= FREE_DAILY_OUTFIT_LIMIT || weekly >= FREE_WEEKLY_OUTFIT_LIMIT) {
          return false; // allowance spent — the caller shows the upgrade prompt
        }
        setOutfitUsage({ today, dailyCount: daily + 1, week, weeklyCount: weekly + 1 });
      }
      setEvent(next);
      setLockedOutfit(null); // a new occasion means a fresh look
      setStyleVariation((v) => v + 1);
      generate(next, Date.now() + Math.floor(Math.random() * 88888));
      return true;
    },
    [event, generate, profile.plan, outfitUsage]
  );

  const nextOutfit = useCallback(() => {
    if (lockedChosen) return; // the chosen outfit stays put
    if (outfits.length === 0) {
      setStyleVariation((v) => v + 1);
      generate(event);
      return;
    }
    setOutfitIndex((i) => (i + 1) % outfits.length);
  }, [lockedChosen, outfits.length, generate, event]);

  const setOutfitIndexSafe = useCallback(
    (i: number) => {
      if (lockedChosen || outfits.length === 0) return;
      setOutfitIndex(((i % outfits.length) + outfits.length) % outfits.length);
    },
    [lockedChosen, outfits.length]
  );

  const lockOutfit = useCallback((outfit: Outfit) => setLockedOutfit(outfit), []);
  const unlockOutfit = useCallback(() => setLockedOutfit(null), []);

  // Generate on first load / when closet or plan changes or real-time weather arrives.
  useEffect(() => {
    // Free plan: the day's look is granted once per day (max 3 per week). Once the
    // weekly allowance is spent no fresh look is generated until the next week.
    if (profile.plan === "free") {
      const alreadyGrantedToday = outfitUsageValid.dailyCount > 0;
      if (!alreadyGrantedToday && outfitUsageValid.weeklyCount >= FREE_WEEKLY_OUTFIT_LIMIT) {
        setOutfits([]);
        setOutfitIndex(0);
        return;
      }
      if (!alreadyGrantedToday) {
        setOutfitUsage((prev) => {
          const today = todayKey();
          const week = weekKey();
          const daily = prev.today === today ? prev.dailyCount ?? 0 : 0;
          const weekly = prev.week === week ? prev.weeklyCount ?? 0 : 0;
          if (daily > 0 || weekly >= FREE_WEEKLY_OUTFIT_LIMIT) return prev;
          return { today, dailyCount: 1, week, weeklyCount: weekly + 1 };
        });
      }
    }
    generate(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closet, profile.plan, profile.avoidRecentlyWorn, weather]);

  /* ------------------------------- weather ------------------------------- */
  const refreshWeather = useCallback(() => {
    setWeatherLoading(true);
    getWeather(profile.city)
      .then(setWeather)
      .finally(() => setWeatherLoading(false));
  }, [profile.city]);

  useEffect(() => {
    refreshWeather();
  }, [profile.city, refreshWeather]);

  /* -------------------------------- items -------------------------------- */
  const addItem = useCallback(
    (draft: NewItemDraft): ClosetItem | null => {
      if (profile.plan === "free" && closet.length >= FREE_ITEM_LIMIT) return null;
      const item: ClosetItem = {
        id: uid("item"),
        createdAt: Date.now(),
        lastWornAt: null,
        timesWorn: 0,
        ...draft,
      };
      setCloset((prev) => [item, ...prev]);
      return item;
    },
    [closet.length, profile.plan]
  );

  const updateItem = useCallback((id: string, patch: Partial<ClosetItem>) => {
    setCloset((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setCloset((prev) => prev.filter((i) => i.id !== id));
  }, []);

  /* ------------------------------- confirm ------------------------------- */
  const confirmOutfit = useCallback(
    (outfit: Outfit) => {
      const date = todayKey();
      const weatherSummary = outfit.weather
        ? `${outfit.weather.icon} ${Math.round(outfit.weather.temperatureC)}°C`
        : undefined;
      const log: OutfitLog = {
        id: uid("log"),
        date,
        itemIds: outfit.itemIds,
        event: outfit.event ?? "none",
        reason: outfit.reason,
        weatherSummary,
        createdAt: Date.now(),
      };
      setHistory((prev) => [log, ...prev.filter((h) => h.date !== date)]);
      setCloset((prev) =>
        prev.map((i) =>
          outfit.itemIds.includes(i.id)
            ? { ...i, lastWornAt: Date.now(), timesWorn: i.timesWorn + 1 }
            : i
        )
      );
    },
    []
  );

  /* ---------------------------- favourite outfits ------------------------- */
  const isOutfitFavorite = useCallback(
    (outfitId: string) => favoriteOutfits.some((f) => f.id === outfitId),
    [favoriteOutfits]
  );

  const toggleOutfitFavorite = useCallback((outfit: Outfit) => {
    setFavoriteOutfits((prev) =>
      prev.some((f) => f.id === outfit.id)
        ? prev.filter((f) => f.id !== outfit.id)
        : [outfit, ...prev]
    );
  }, []);

  /* ------------------------------- profile ------------------------------- */
  const setProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfileState((p) => ({ ...p, ...patch }));
  }, []);

  const upgradeToPro = useCallback((cycle: "monthly" | "yearly" = "monthly") => {
    const now = Date.now();
    const periodMs = cycle === "yearly" ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    setProfileState((p) => ({
      ...p,
      plan: "pro",
      proSince: p.proSince ?? now,
      proExpiresAt: (p.proExpiresAt && p.proExpiresAt > now ? p.proExpiresAt : now) + periodMs,
      billingCycle: cycle,
    }));
  }, []);

  const cancelPro = useCallback(() => {
    setProfileState((p) => ({ ...p, plan: "free", proSince: null, proExpiresAt: null }));
  }, []);

  const resetDemo = useCallback(() => {
    setCloset(buildSeedCloset());
    setHistory([]);
    setLockedOutfit(null);
    setOutfitUsage({ today: todayKey(), dailyCount: 0, week: weekKey(), weeklyCount: 0 });
    setProfileState((p) => ({ ...p, plan: "free" }));
  }, []);

  const loadDemoCloset = useCallback(() => {
    setCloset(buildSeedCloset());
    setHistory(buildSeedHistory());
  }, []);

  const clearAll = useCallback(() => {
    clearState();
    setCloset([]);
    setHistory([]);
    setLockedOutfit(null);
    setFavoriteOutfits([]);
    setPhotoUsage({ date: weekKey(), count: 0 });
    setOutfitUsage({ today: todayKey(), dailyCount: 0, week: weekKey(), weeklyCount: 0 });
    setRecentPoses([]);
    setDatePlans([]);
    setFavoritePlaces([]);
    setFavoriteMenuItems([]);
    setPlaceReports([]);
    setProfileState(DEFAULT_PROFILE);
  }, []);

  /* --------------------- Photo Style Camera --------------------- */
  const photoUsageValid: PhotoUsage = {
    today: photoUsage.today === todayKey() ? photoUsage.today : todayKey(),
    dailyCount: photoUsage.today === todayKey() ? (photoUsage.dailyCount ?? 0) : 0,
    date: photoUsage.date === weekKey() ? photoUsage.date : weekKey(),
    count: photoUsage.date === weekKey() ? photoUsage.count : 0,
  };

  const photoRecsLeftToday = isPro ? null : Math.max(0, FREE_DAILY_PHOTO_STYLE_LIMIT - (photoUsageValid.dailyCount ?? 0));
  const photoRecsLeftThisWeek = isPro ? null : Math.max(0, FREE_WEEKLY_PHOTO_STYLE_LIMIT - photoUsageValid.count);
  const photoRecsLeft = isPro ? null : Math.min(photoRecsLeftToday ?? 1, photoRecsLeftThisWeek ?? 4);

  const notePhotoRecommendation = useCallback(() => {
    setPhotoUsage((prev) => {
      const today = todayKey();
      const week = weekKey();
      return {
        today,
        dailyCount: prev.today === today ? (prev.dailyCount ?? 0) + 1 : 1,
        date: week,
        count: prev.date === week ? prev.count + 1 : 1,
      };
    });
  }, []);

  const markPoseUsed = useCallback((poseId: string) => {
    setRecentPoses((prev) =>
      [{ poseId, at: Date.now() }, ...prev.filter((p) => p.poseId !== poseId)].slice(0, 40)
    );
  }, []);

  const recentPoseIds = useMemo(() => {
    const cutoff = Date.now() - 3 * DAY;
    return recentPoses.filter((p) => p.at >= cutoff).map((p) => p.poseId);
  }, [recentPoses]);

  /* ------------------------- Date Spots ------------------------- */
  const saveDatePlan = useCallback(
    (draft: Omit<DatePlan, "id" | "createdAt">): DatePlan | null => {
      if (profile.plan === "free" && datePlans.length >= FREE_DATE_PLAN_LIMIT) return null;
      const plan: DatePlan = { ...draft, id: uid("plan"), createdAt: Date.now() };
      setDatePlans((prev) => [plan, ...prev]);
      return plan;
    },
    [datePlans.length, profile.plan]
  );

  const updateDatePlan = useCallback((id: string, patch: Partial<DatePlan>) => {
    setDatePlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const deleteDatePlan = useCallback((id: string) => {
    setDatePlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const completeDatePlan = useCallback((id: string) => {
    setDatePlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "completed" as const } : p))
    );
  }, []);

  const isPlaceFavorite = useCallback(
    (placeId: string) => favoritePlaces.some((f) => f.placeId === placeId),
    [favoritePlaces]
  );

  const favoritesFull =
    profile.plan === "free" &&
    favoritePlaces.length + favoriteMenuItems.length >= FREE_FAVORITE_LIMIT;

  const togglePlaceFavorite = useCallback(
    (placeId: string, collection = "Romantic"): boolean => {
      const existing = favoritePlaces.find((f) => f.placeId === placeId);
      if (existing) {
        setFavoritePlaces((prev) => prev.filter((f) => f.placeId !== placeId));
        return false;
      }
      if (favoritesFull) return false;
      setFavoritePlaces((prev) => [...prev, { placeId, collection, createdAt: Date.now() }]);
      return true;
    },
    [favoritePlaces, favoritesFull]
  );

  const setPlaceCollection = useCallback((placeId: string, collection: string) => {
    setFavoritePlaces((prev) =>
      prev.map((f) => (f.placeId === placeId ? { ...f, collection } : f))
    );
  }, []);

  const isMenuItemFavorite = useCallback(
    (placeId: string, itemId: string) =>
      favoriteMenuItems.some((f) => f.placeId === placeId && f.itemId === itemId),
    [favoriteMenuItems]
  );

  const toggleMenuItemFavorite = useCallback(
    (placeId: string, itemId: string): boolean => {
      const existing = favoriteMenuItems.find(
        (f) => f.placeId === placeId && f.itemId === itemId
      );
      if (existing) {
        setFavoriteMenuItems((prev) =>
          prev.filter((f) => !(f.placeId === placeId && f.itemId === itemId))
        );
        return false;
      }
      if (favoritesFull) return false;
      setFavoriteMenuItems((prev) => [...prev, { placeId, itemId, createdAt: Date.now() }]);
      return true;
    },
    [favoriteMenuItems, favoritesFull]
  );

  /* ------------------------- Venue reports ------------------------- */
  const reportPlace = useCallback((report: Omit<PlaceReport, "createdAt">): PlaceReport => {
    const full: PlaceReport = { ...report, createdAt: Date.now() };
    setPlaceReports((prev) => [full, ...prev].slice(0, 200));
    return full;
  }, []);

  const value: AppContextValue = {
    profile,
    closet,
    history,
    outfits,
    outfitIndex,
    generating,
    weather,
    weatherLoading,
    itemById,
    isPro,
    freeLimitReached: profile.plan === "free" && closet.length >= FREE_ITEM_LIMIT,
    outfitsLeftToday,
    outfitsLeftThisWeek,
    outfitLimitReached,
    generateFor,
    nextOutfit,
    setOutfitIndex: setOutfitIndexSafe,
    currentOutfit,
    isLocked,
    lockOutfit,
    unlockOutfit,
    favoriteOutfits,
    isOutfitFavorite,
    toggleOutfitFavorite,
    confirmOutfit,
    isConfirmedToday,
    addItem,
    updateItem,
    deleteItem,
    setProfile,
    upgradeToPro,
    cancelPro,
    refreshWeather,
    resetDemo,
    loadDemoCloset,
    clearAll,
    photoUsage: photoUsageValid,
    photoRecsLeftToday,
    photoRecsLeftThisWeek,
    photoRecsLeft,
    notePhotoRecommendation,
    recentPoseIds,
    markPoseUsed,
    datePlans,
    saveDatePlan,
    updateDatePlan,
    deleteDatePlan,
    completeDatePlan,
    favoritePlaces,
    favoriteMenuItems,
    isPlaceFavorite,
    togglePlaceFavorite,
    setPlaceCollection,
    isMenuItemFavorite,
    toggleMenuItemFavorite,
    favoritesFull,
    reportPlace,
    theme,
    toggleTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
