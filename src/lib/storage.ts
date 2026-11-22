/**
 * Low-level persistence.
 *
 * Right now everything is stored locally so the app runs with zero setup.
 * When the Supabase project is connected, `LocalStore` is swapped for a
 * cloud-backed implementation of the same interface (see `backend.ts`).
 */

export interface PersistedState {
  version: number;
  profile: unknown;
  closet: unknown;
  history: unknown;
  currentOutfit: unknown;
  currentOutfitDate: string | null;
}

const KEY = "fitly.state.v1";

export function loadState<T>(): T | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveState<T>(state: T): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — non fatal */
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Today as YYYY-MM-DD in the user's local timezone. */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Stable local week key, using Monday as the first day of the week. */
export function weekKey(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return todayKey(date);
}
