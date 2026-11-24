import type { ClosetItem, OutfitLog, UserProfile } from "./types";

/**
 * The backend contract.
 *
 * Supports 'local' (offline localStorage), 'cloudflare' (Edge D1 + R2 + Workers),
 * and 'supabase' integrations.
 */
export interface Backend {
  readonly kind: "local" | "cloudflare" | "supabase";
  loadProfile(): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;

  listItems(): Promise<ClosetItem[]>;
  upsertItem(item: ClosetItem): Promise<void>;
  deleteItem(id: string): Promise<void>;

  listHistory(): Promise<OutfitLog[]>;
  addHistoryLog(log: OutfitLog): Promise<void>;

  /** Uploads a compressed image and returns a URL (data URL when local, R2 URL when on Cloudflare). */
  uploadImage(dataUrl: string, path: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// Cloudflare Edge Backend Implementation (Workers + D1 SQLite + R2 Storage)
// ---------------------------------------------------------------------------

const TOKEN_KEY = "firie_cf_token";

export class CloudflareBackend implements Backend {
  readonly kind = "cloudflare" as const;
  private baseUrl: string;

  constructor(baseUrl = "") {
    // In production, relative to the same host; during dev or custom domain, uses baseUrl
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setToken(token: string | null) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("firie_auth_changed"));
    }
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  private async fetchAuth(path: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    return res;
  }

  /** Check whether an email is already registered on Cloudflare */
  async checkEmail(email: string): Promise<{ ok: boolean; exists: boolean }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      const data = await res.json();
      return { ok: Boolean(data?.ok), exists: Boolean(data?.exists) };
    } catch {
      return { ok: false, exists: false };
    }
  }

  /** Sign up with email, password, and profile styling metadata */
  async signup(params: {
    email: string;
    password: string;
    name?: string;
    city?: string;
    gender?: "men" | "women";
    height?: string;
    bodyFit?: string;
    ageGroup?: string;
    preferredStyle?: string;
    traditionalWear?: string;
  }): Promise<{ ok: boolean; user?: any; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || "Signup failed" };
      }
      this.setToken(data.token);
      return { ok: true, user: data.user };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error connecting to Cloudflare Edge" };
    }
  }

  /** Log in to existing account */
  async login(params: {
    email: string;
    password: string;
  }): Promise<{ ok: boolean; user?: any; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || "Login failed" };
      }
      this.setToken(data.token);
      return { ok: true, user: data.user };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error connecting to Cloudflare Edge" };
    }
  }

  /** Log out and clear edge session */
  logout() {
    this.setToken(null);
  }

  async loadProfile(): Promise<UserProfile | null> {
    if (!this.isAuthenticated()) return null;
    try {
      const res = await this.fetchAuth("/api/auth/me");
      if (!res.ok) return null;
      const data = await res.json();
      return data.user as UserProfile;
    } catch {
      return null;
    }
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    if (!this.isAuthenticated()) return;
    try {
      await this.fetchAuth("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          name: profile.name,
          city: profile.city,
          gender: profile.gender,
          plan: profile.plan,
          units: profile.units,
          avoidRecentlyWorn: profile.avoidRecentlyWorn,
          billingCycle: profile.billingCycle,
          proExpiresAt: profile.proExpiresAt,
          proSince: profile.proSince,
          height: profile.height,
          bodyFit: profile.bodyFit,
          ageGroup: profile.ageGroup,
          preferredStyle: profile.preferredStyle,
          traditionalWear: profile.traditionalWear,
        }),
      });
    } catch (e) {
      console.warn("Failed to persist profile to Cloudflare D1", e);
    }
  }

  /* ---------------- Camera Gallery Cloud Sync (D1 + R2) ---------------- */
  async listGallery(): Promise<any[]> {
    if (!this.isAuthenticated()) return [];
    try {
      const res = await this.fetchAuth("/api/camera/gallery");
      if (!res.ok) return [];
      const data = await res.json();
      return data.photos || [];
    } catch {
      return [];
    }
  }

  async saveGalleryPhoto(photo: { id?: string; dataUrl: string; format?: string; filter?: string; createdAt?: number }): Promise<any | null> {
    if (!this.isAuthenticated()) return null;
    try {
      const res = await this.fetchAuth("/api/camera/gallery", {
        method: "POST",
        body: JSON.stringify(photo),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.photo || null;
    } catch (e) {
      console.warn("Failed to save gallery photo to Cloudflare", e);
      return null;
    }
  }

  async deleteGalleryPhoto(id: string): Promise<void> {
    if (!this.isAuthenticated()) return;
    try {
      await this.fetchAuth(`/api/camera/gallery/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn("Failed to delete gallery photo from Cloudflare", e);
    }
  }

  async listItems(): Promise<ClosetItem[]> {
    if (!this.isAuthenticated()) return [];
    try {
      const res = await this.fetchAuth("/api/closet");
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || [];
    } catch {
      return [];
    }
  }

  async upsertItem(item: ClosetItem): Promise<void> {
    if (!this.isAuthenticated()) return;
    try {
      await this.fetchAuth("/api/closet", {
        method: "POST",
        body: JSON.stringify(item),
      });
    } catch (e) {
      console.warn("Failed to upsert item to Cloudflare D1", e);
    }
  }

  async deleteItem(id: string): Promise<void> {
    if (!this.isAuthenticated()) return;
    try {
      await this.fetchAuth(`/api/closet/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn("Failed to delete item from Cloudflare D1", e);
    }
  }

  async listHistory(): Promise<OutfitLog[]> {
    if (!this.isAuthenticated()) return [];
    try {
      const res = await this.fetchAuth("/api/history");
      if (!res.ok) return [];
      const data = await res.json();
      return data.history || [];
    } catch {
      return [];
    }
  }

  async addHistoryLog(log: OutfitLog): Promise<void> {
    if (!this.isAuthenticated()) return;
    try {
      await this.fetchAuth("/api/history", {
        method: "POST",
        body: JSON.stringify(log),
      });
    } catch (e) {
      console.warn("Failed to save history log to Cloudflare D1", e);
    }
  }

  /**
   * Uploads clothing image directly to Cloudflare R2 object storage.
   * R2 provides zero-egress fees, instant CDN delivery, and edge performance.
   */
  async uploadImage(dataUrl: string, _path: string): Promise<string> {
    if (!this.isAuthenticated() || !dataUrl.startsWith("data:")) {
      return dataUrl;
    }
    try {
      const res = await this.fetchAuth("/api/upload", {
        method: "POST",
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) return dataUrl;
      const data = await res.json();
      return data.url || dataUrl;
    } catch {
      return dataUrl;
    }
  }

  /**
   * Syncs existing local wardrobe and outfit history to Cloudflare edge.
   */
  async syncWardrobe(items: ClosetItem[], history: OutfitLog[]): Promise<{
    items: ClosetItem[];
    history: OutfitLog[];
  }> {
    if (!this.isAuthenticated()) {
      return { items, history };
    }
    try {
      const res = await this.fetchAuth("/api/sync", {
        method: "POST",
        body: JSON.stringify({ items, history }),
      });
      if (!res.ok) return { items, history };
      const data = await res.json();
      return {
        items: data.items || items,
        history: data.history || history,
      };
    } catch {
      return { items, history };
    }
  }
}

export const cloudflareBackend = new CloudflareBackend();
