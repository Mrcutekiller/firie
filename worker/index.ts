/**
 * Firie - Cloudflare Edge Worker API
 * Powers Authentication, Serverless D1 SQLite Database, and R2 Object Storage
 */

export interface Env {
  DB?: D1Database;
  firie_db?: D1Database;
  PHOTOS?: R2Bucket;
  firie_photos?: R2Bucket;
  ASSETS?: Fetcher;
  JWT_SECRET?: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  name: string;
  city: string;
  gender: string;
  plan: string;
  units: string;
  avoid_recently_worn: number;
  billing_cycle: string;
  pro_expires_at: string | null;
  pro_since: number | null;
  height: string | null;
  body_fit: string | null;
  age_group: string | null;
  preferred_style: string | null;
  traditional_wear: string | null;
  saved_looks: string | null;
  created_at: number;
  updated_at: number;
}

interface ClosetRow {
  id: string;
  user_id: string;
  name: string;
  category: string;
  slot: string;
  color: string;
  color_hex: string;
  image_url: string | null;
  season: string;
  style: string;
  tags: string | null;
  created_at: number;
  updated_at: number;
}

interface HistoryRow {
  id: string;
  user_id: string;
  date: string;
  item_ids: string;
  reason: string | null;
  weather_summary: string | null;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Security & Cryptography Helpers (Native WebCrypto on Cloudflare V8 runtime)
// ---------------------------------------------------------------------------

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateId(): string {
  return crypto.randomUUID();
}

function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Simple signed token for Edge authentication
async function createToken(userId: string, email: string, secret: string): Promise<string> {
  const payload = {
    userId,
    email,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  const enc = new TextEncoder();
  const rawPayload = JSON.stringify(payload);
  const base64Payload = btoa(rawPayload);

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(base64Payload));
  const base64Sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${base64Payload}.${base64Sig}`;
}

async function verifyToken(
  token: string,
  secret: string
): Promise<{ userId: string; email: string } | null> {
  try {
    const [base64Payload, base64Sig] = token.split(".");
    if (!base64Payload || !base64Sig) return null;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = Uint8Array.from(atob(base64Sig), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(base64Payload));
    if (!valid) return null;

    const payload = JSON.parse(atob(base64Payload));
    if (Date.now() > payload.exp) return null;

    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// HTTP Response Utility Helpers
// ---------------------------------------------------------------------------
// Security & HTTP Response Utility Helpers
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), geolocation=(self), microphone=()",
};

// In-memory rate limiting per edge isolate to protect authentication & upload endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit = 15, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

function error(message: string, status = 400): Response {
  return json({ ok: false, error: message }, status);
}

// ---------------------------------------------------------------------------
// API Router & Controller Handlers
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 0. Defense against admin probing, path traversal & sensitive environment file scraping
    if (
      url.pathname.startsWith("/admin") ||
      url.pathname.includes("/.") ||
      url.pathname.endsWith(".env") ||
      url.pathname.endsWith(".git") ||
      url.pathname.includes("..")
    ) {
      return error("Access Denied: unauthorized administrative or internal path.", 403);
    }

    // Handle Pre-flight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { ...CORS_HEADERS, ...SECURITY_HEADERS } });
    }

    const secret = env.JWT_SECRET || "firie-edge-secret-key-addis-2026";
    const db = env.DB || env.firie_db;
    const photos = env.PHOTOS || env.firie_photos;

    // Rate Limiting Protection on Auth endpoints
    const clientIp = request.headers.get("CF-Connecting-IP") || "anonymous";
    if (url.pathname.startsWith("/api/auth/")) {
      if (!checkRateLimit(`auth:${clientIp}`, 20, 60000)) {
        return error("Too many requests from this address. Please wait a minute and try again.", 429);
      }
    }

    // Direct High-Speed Release APK Download from Cloudflare R2 Edge (Bypasses SPA)
    const lowerPath = url.pathname.toLowerCase();
    if (
      lowerPath === "/firie.apk" ||
      lowerPath === "/fitly.apk" ||
      lowerPath === "/download/apk" ||
      lowerPath === "/api/download/apk"
    ) {
      if (!photos) {
        return error("Cloudflare R2 storage bucket is not configured", 503);
      }
      const filename = lowerPath.includes("fitly") ? "FITLY.apk" : "Firie.apk";
      const object = (await photos.get(`releases/${filename}`)) || (await photos.get("releases/Firie.apk"));
      if (!object) {
        return new Response("Release APK package not found in Cloudflare R2", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("Content-Type", "application/vnd.android.package-archive");
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
      headers.set("Content-Length", String(object.size));
      headers.set("Cache-Control", "public, max-age=3600");
      headers.set("Access-Control-Allow-Origin", "*");
      return new Response(object.body, { headers });
    }

    // Only process /api/ routes; forward all other paths to Static Assets
    if (!url.pathname.startsWith("/api/")) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return new Response("Not Found", { status: 404 });
    }

    // 1. Health check & status
    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "Firie Cloudflare Backend",
        version: "1.0.0",
        d1_active: Boolean(db),
        r2_active: Boolean(photos),
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Photo Delivery from R2 Object Storage (with edge CDN caching)
    if (url.pathname.startsWith("/api/photo/")) {
      if (!photos) {
        return error("R2 storage bucket is not configured", 503);
      }
      const key = decodeURIComponent(url.pathname.replace("/api/photo/", ""));
      const object = await photos.get(key);
      if (!object) {
        return new Response("Photo not found", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Access-Control-Allow-Origin", "*");
      return new Response(object.body, { headers });
    }

    // 2.5 Check Email Existence (Immediate feedback on Step 1)
    if (url.pathname === "/api/auth/check-email" && request.method === "GET") {
      if (!db) return error("D1 Database binding missing in Cloudflare", 503);
      const email = url.searchParams.get("email")?.trim().toLowerCase();
      if (!email) return error("Email parameter required");
      const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
      return json({ ok: true, exists: Boolean(existing) });
    }

    // 3. User Sign Up
    if (url.pathname === "/api/auth/signup" && request.method === "POST") {
      if (!db) return error("D1 Database binding missing in Cloudflare", 503);

      const body = (await request.json().catch(() => ({}))) as {
        email?: string;
        password?: string;
        name?: string;
        city?: string;
        gender?: string;
        height?: string;
        bodyFit?: string;
        ageGroup?: string;
        preferredStyle?: string;
        traditionalWear?: string;
      };

      if (!body.email || !body.password || body.password.length < 6) {
        return error("Valid email and password (minimum 6 characters) required.");
      }

      const email = body.email.trim().toLowerCase();
      const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
      if (existing) {
        return error("An account with this email already exists. Please log in instead.", 409);
      }

      const userId = generateId();
      const salt = generateSalt();
      const passwordHash = await hashPassword(body.password, salt);
      const now = Date.now();

      await db.prepare(
        `INSERT INTO users (
           id, email, password_hash, salt, name, city, gender, plan, units,
           avoid_recently_worn, billing_cycle, height, body_fit, age_group,
           preferred_style, traditional_wear, saved_looks, created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, 'free', 'metric', 1, 'monthly', ?, ?, ?, ?, ?, '[]', ?, ?)`
      )
        .bind(
          userId,
          email,
          passwordHash,
          salt,
          body.name?.trim() || "Fashion Explorer",
          body.city?.trim() || "Addis Ababa",
          body.gender || "men",
          body.height || null,
          body.bodyFit || null,
          body.ageGroup || null,
          body.preferredStyle || null,
          body.traditionalWear || null,
          now,
          now
        )
        .run();

      const token = await createToken(userId, email, secret);
      return json({
        ok: true,
        token,
        user: {
          id: userId,
          email,
          name: body.name?.trim() || "Fashion Explorer",
          city: body.city?.trim() || "Addis Ababa",
          gender: body.gender || "men",
          plan: "free",
          units: "metric",
          avoidRecentlyWorn: true,
          billingCycle: "monthly",
          height: body.height || null,
          bodyFit: body.bodyFit || null,
          ageGroup: body.ageGroup || null,
          preferredStyle: body.preferredStyle || null,
          traditionalWear: body.traditionalWear || null,
          savedLooks: [],
          proSince: null,
          proExpiresAt: null,
        },
      });
    }

    // 4. User Login
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      if (!db) return error("D1 Database binding missing in Cloudflare", 503);

      const body = (await request.json().catch(() => ({}))) as {
        email?: string;
        password?: string;
      };

      if (!body.email || !body.password) {
        return error("Email and password required.");
      }

      const email = body.email.trim().toLowerCase();
      const user = await db.prepare("SELECT * FROM users WHERE email = ?")
        .bind(email)
        .first<UserRow>();

      if (!user) {
        return error("Invalid email or password.", 401);
      }

      const computedHash = await hashPassword(body.password, user.salt);
      if (computedHash !== user.password_hash) {
        return error("Invalid email or password.", 401);
      }

      const token = await createToken(user.id, user.email, secret);
      let parsedSavedLooks = [];
      try {
        if (user.saved_looks) parsedSavedLooks = JSON.parse(user.saved_looks);
      } catch {}

      return json({
        ok: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          city: user.city,
          gender: user.gender,
          plan: user.plan || "free",
          units: user.units || "metric",
          avoidRecentlyWorn: Boolean(user.avoid_recently_worn),
          billingCycle: user.billing_cycle,
          proExpiresAt: user.pro_expires_at,
          proSince: user.pro_since,
          height: user.height,
          bodyFit: user.body_fit,
          ageGroup: user.age_group,
          preferredStyle: user.preferred_style,
          traditionalWear: user.traditional_wear,
          savedLooks: parsedSavedLooks,
        },
      });
    }

    // All endpoints below require authentication
    const authHeader = request.headers.get("Authorization") || "";
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return error("Unauthorized: missing authorization token", 401);
    }

    const auth = await verifyToken(token, secret);
    if (!auth) {
      return error("Unauthorized: invalid or expired token", 401);
    }
    const userId = auth.userId;

    // 5. Get Current Profile
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      if (!db) return error("D1 Database not available", 503);
      const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
      if (!user) return error("User not found", 404);

      let parsedSavedLooks = [];
      try {
        if (user.saved_looks) parsedSavedLooks = JSON.parse(user.saved_looks);
      } catch {}

      return json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          city: user.city,
          gender: user.gender,
          plan: user.plan,
          units: user.units,
          avoidRecentlyWorn: Boolean(user.avoid_recently_worn),
          billingCycle: user.billing_cycle,
          proExpiresAt: user.pro_expires_at,
          proSince: user.pro_since,
          height: user.height,
          bodyFit: user.body_fit,
          ageGroup: user.age_group,
          preferredStyle: user.preferred_style,
          traditionalWear: user.traditional_wear,
          savedLooks: parsedSavedLooks,
        },
      });
    }

    // 6. Update Profile
    if (url.pathname === "/api/auth/profile" && request.method === "PUT") {
      if (!db) return error("D1 Database not available", 503);
      const body = (await request.json().catch(() => ({}))) as any;
      const now = Date.now();
      await db.prepare(
        `UPDATE users SET
           name = COALESCE(?, name),
           city = COALESCE(?, city),
           gender = COALESCE(?, gender),
           plan = COALESCE(?, plan),
           units = COALESCE(?, units),
           avoid_recently_worn = COALESCE(?, avoid_recently_worn),
           billing_cycle = COALESCE(?, billing_cycle),
           pro_expires_at = COALESCE(?, pro_expires_at),
           pro_since = COALESCE(?, pro_since),
           height = COALESCE(?, height),
           body_fit = COALESCE(?, body_fit),
           age_group = COALESCE(?, age_group),
           preferred_style = COALESCE(?, preferred_style),
           traditional_wear = COALESCE(?, traditional_wear),
           saved_looks = COALESCE(?, saved_looks),
           updated_at = ?
         WHERE id = ?`
      )
        .bind(
          body.name ?? null,
          body.city ?? null,
          body.gender ?? null,
          body.plan ?? null,
          body.units ?? null,
          body.avoidRecentlyWorn !== undefined ? (body.avoidRecentlyWorn ? 1 : 0) : (body.avoid_recently_worn !== undefined ? (body.avoid_recently_worn ? 1 : 0) : null),
          body.billingCycle ?? body.billing_cycle ?? null,
          body.proExpiresAt !== undefined ? (body.proExpiresAt ? String(body.proExpiresAt) : null) : null,
          body.proSince ?? body.pro_since ?? null,
          body.height ?? null,
          body.bodyFit ?? body.body_fit ?? null,
          body.ageGroup ?? body.age_group ?? null,
          body.preferredStyle ?? body.preferred_style ?? null,
          body.traditionalWear ?? body.traditional_wear ?? null,
          body.savedLooks ? JSON.stringify(body.savedLooks) : null,
          now,
          userId
        )
        .run();
      return json({ ok: true });
    }

    // 6.5 In-App Camera Gallery Endpoints (D1 + R2 Sync across devices)
    if (url.pathname === "/api/camera/gallery" && request.method === "GET") {
      if (!db) return error("D1 Database not available", 503);
      const photosRes = await db.prepare(
        "SELECT id, photo_url, format, filter, created_at FROM camera_gallery WHERE user_id = ? ORDER BY created_at DESC LIMIT 60"
      ).bind(userId).all<any>();

      const photosList = (photosRes.results || []).map((row) => ({
        id: row.id,
        dataUrl: row.photo_url,
        format: row.format || "story",
        filter: row.filter || "normal",
        createdAt: row.created_at,
        timestamp: row.created_at,
      }));

      return json({ ok: true, photos: photosList });
    }

    if (url.pathname === "/api/camera/gallery" && request.method === "POST") {
      if (!db) return error("D1 Database not available", 503);
      const body = (await request.json().catch(() => ({}))) as any;
      const photoId = body.id || generateId();
      let photoUrl = body.dataUrl || body.photoUrl || "";

      // If it's a large base64 image and R2 is available, save to R2 for zero-egress performance
      if (photos && photoUrl.startsWith("data:")) {
        try {
          const matches = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const contentType = matches[1];
            const base64Data = matches[2];
            const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const r2Key = `gallery/${userId}/${photoId}.jpg`;
            await photos.put(r2Key, bytes, {
              httpMetadata: { contentType },
            });
            photoUrl = `/api/photo/${encodeURIComponent(r2Key)}`;
          }
        } catch (e) {
          console.warn("R2 gallery photo save error:", e);
        }
      }

      const now = body.createdAt || body.timestamp || Date.now();
      await db.prepare(
        `INSERT INTO camera_gallery (id, user_id, photo_url, format, filter, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET photo_url = excluded.photo_url, filter = excluded.filter`
      )
        .bind(photoId, userId, photoUrl, body.format || "story", body.filter || "normal", now)
        .run();

      return json({
        ok: true,
        photo: {
          id: photoId,
          dataUrl: photoUrl,
          format: body.format || "story",
          filter: body.filter || "normal",
          createdAt: now,
          timestamp: now,
        },
      });
    }

    if (url.pathname.startsWith("/api/camera/gallery/") && request.method === "DELETE") {
      if (!db) return error("D1 Database not available", 503);
      const photoId = decodeURIComponent(url.pathname.replace("/api/camera/gallery/", ""));
      await db.prepare("DELETE FROM camera_gallery WHERE id = ? AND user_id = ?").bind(photoId, userId).run();
      return json({ ok: true });
    }

    // 7. Photo Upload to Cloudflare R2
    if (url.pathname === "/api/upload" && request.method === "POST") {
      if (!photos) {
        return error("Cloudflare R2 bucket binding is missing", 503);
      }

      const body = (await request.json().catch(() => ({}))) as {
        dataUrl?: string;
        filename?: string;
      };

      if (!body.dataUrl) {
        return error("dataUrl required for upload");
      }

      // Parse base64 data URL
      const match = body.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!match) {
        return error("Invalid base64 data URL format");
      }

      const mimeType = match[1].toLowerCase();
      // Enforce strict image MIME types to prevent script execution or malicious payload upload
      if (!mimeType.startsWith("image/") || (!mimeType.includes("jpeg") && !mimeType.includes("png") && !mimeType.includes("webp") && !mimeType.includes("jpg"))) {
        return error("Unauthorized upload type: only JPEG, PNG, and WebP images are allowed", 415);
      }

      const base64Data = match[2];
      const binaryString = atob(base64Data);
      // Enforce 15 MB maximum payload size
      if (binaryString.length > 15 * 1024 * 1024) {
        return error("Upload exceeds maximum allowed size of 15MB", 413);
      }

      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const ext = mimeType.split("/")[1] || "webp";
      const key = `${userId}/${Date.now()}-${generateId().slice(0, 8)}.${ext}`;

      await photos.put(key, bytes, {
        httpMetadata: {
          contentType: mimeType,
        },
      });

      const photoUrl = `/api/photo/${encodeURIComponent(key)}`;
      return json({ ok: true, url: photoUrl, key });
    }

    // 8. Closet CRUD (D1 Database)
    if (url.pathname === "/api/closet") {
      if (!db) return error("D1 Database not available", 503);

      if (request.method === "GET") {
        const rows = await db.prepare(
          "SELECT * FROM closet_items WHERE user_id = ? ORDER BY created_at DESC"
        )
          .bind(userId)
          .all<ClosetRow>();

        const items = (rows.results || []).map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          slot: row.slot,
          color: row.color,
          colorHex: row.color_hex,
          imageUrl: row.image_url,
          season: row.season,
          style: row.style,
          tags: row.tags ? JSON.parse(row.tags) : [],
          createdAt: row.created_at,
        }));
        return json({ ok: true, items });
      }

      if (request.method === "POST") {
        const item = (await request.json().catch(() => null)) as any;
        if (!item || !item.name || !item.category || !item.slot) {
          return error("Invalid item payload");
        }

        const now = Date.now();
        const itemId = item.id || generateId();
        const tags = item.tags ? JSON.stringify(item.tags) : "[]";

        await db.prepare(
          `INSERT INTO closet_items (id, user_id, name, category, slot, color, color_hex, image_url, season, style, tags, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             category = excluded.category,
             slot = excluded.slot,
             color = excluded.color,
             color_hex = excluded.color_hex,
             image_url = excluded.image_url,
             season = excluded.season,
             style = excluded.style,
             tags = excluded.tags,
             updated_at = excluded.updated_at`
        )
          .bind(
            itemId,
            userId,
            item.name,
            item.category,
            item.slot,
            item.color || "neutral",
            item.colorHex || "#333333",
            item.imageUrl || null,
            item.season || "all",
            item.style || "casual",
            tags,
            item.createdAt || now,
            now
          )
          .run();

        return json({ ok: true, id: itemId });
      }
    }

    if (url.pathname.startsWith("/api/closet/") && request.method === "DELETE") {
      if (!db) return error("D1 Database not available", 503);
      const itemId = url.pathname.replace("/api/closet/", "");
      await db.prepare("DELETE FROM closet_items WHERE id = ? AND user_id = ?")
        .bind(itemId, userId)
        .run();
      return json({ ok: true });
    }

    // 9. Outfit History Logs (D1 Database)
    if (url.pathname === "/api/history") {
      if (!db) return error("D1 Database not available", 503);

      if (request.method === "GET") {
        const rows = await db.prepare(
          "SELECT * FROM outfit_logs WHERE user_id = ? ORDER BY date DESC, created_at DESC"
        )
          .bind(userId)
          .all<HistoryRow>();

        const history = (rows.results || []).map((row) => ({
          id: row.id,
          date: row.date,
          itemIds: JSON.parse(row.item_ids || "[]"),
          reason: row.reason,
          weatherSummary: row.weather_summary,
        }));
        return json({ ok: true, history });
      }

      if (request.method === "POST") {
        const log = (await request.json().catch(() => null)) as any;
        if (!log || !log.date || !log.itemIds) {
          return error("Invalid log payload");
        }

        const logId = log.id || generateId();
        await db.prepare(
          `INSERT INTO outfit_logs (id, user_id, date, item_ids, reason, weather_summary, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            logId,
            userId,
            log.date,
            JSON.stringify(log.itemIds),
            log.reason || null,
            log.weatherSummary || null,
            Date.now()
          )
          .run();

        return json({ ok: true, id: logId });
      }
    }

    // 10. Bidirectional Cloud Sync (Synchronize offline state with Cloudflare edge)
    if (url.pathname === "/api/sync" && request.method === "POST") {
      if (!db) return error("D1 Database not available", 503);

      const body = (await request.json().catch(() => ({}))) as {
        items?: any[];
        history?: any[];
      };

      const now = Date.now();

      // Upsert local items to D1
      if (Array.isArray(body.items) && body.items.length > 0) {
        for (const item of body.items) {
          if (!item.id || !item.name) continue;
          await db.prepare(
            `INSERT INTO closet_items (id, user_id, name, category, slot, color, color_hex, image_url, season, style, tags, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               color = excluded.color,
               image_url = excluded.image_url,
               updated_at = excluded.updated_at`
          )
            .bind(
              item.id,
              userId,
              item.name,
              item.category || "top",
              item.slot || "top",
              item.color || "neutral",
              item.colorHex || "#333333",
              item.imageUrl || null,
              item.season || "all",
              item.style || "casual",
              JSON.stringify(item.tags || []),
              item.createdAt || now,
              now
            )
            .run();
        }
      }

      // Fetch all authoritative items from D1
      const dbItems = await db.prepare(
        "SELECT * FROM closet_items WHERE user_id = ? ORDER BY created_at DESC"
      )
        .bind(userId)
        .all<ClosetRow>();

      const dbHistory = await db.prepare(
        "SELECT * FROM outfit_logs WHERE user_id = ? ORDER BY date DESC"
      )
        .bind(userId)
        .all<HistoryRow>();

      return json({
        ok: true,
        items: (dbItems.results || []).map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          slot: row.slot,
          color: row.color,
          colorHex: row.color_hex,
          imageUrl: row.image_url,
          season: row.season,
          style: row.style,
          tags: row.tags ? JSON.parse(row.tags) : [],
          createdAt: row.created_at,
        })),
        history: (dbHistory.results || []).map((row) => ({
          id: row.id,
          date: row.date,
          itemIds: JSON.parse(row.item_ids || "[]"),
          reason: row.reason,
          weatherSummary: row.weather_summary,
        })),
      });
    }

    return error("Route not found", 404);
  },
};
