import type { ClosetItem, OutfitLog, UserProfile } from "./types";

/**
 * The backend contract.
 *
 * `LocalBackend` (localStorage) is the default so the app works before any
 * cloud is wired up. When Supabase is connected, implement this same
 * interface with supabase-js queries + storage uploads and pass it to the
 * AppProvider — no screen code has to change.
 */
export interface Backend {
  readonly kind: "local" | "supabase";
  loadProfile(): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;

  listItems(): Promise<ClosetItem[]>;
  upsertItem(item: ClosetItem): Promise<void>;
  deleteItem(id: string): Promise<void>;

  listHistory(): Promise<OutfitLog[]>;
  addHistoryLog(log: OutfitLog): Promise<void>;

  /** Uploads a compressed image and returns a URL (data URL when local). */
  uploadImage(dataUrl: string, path: string): Promise<string>;
}
