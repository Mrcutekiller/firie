-- ==============================================================================
-- Firie - Cloudflare D1 Database Schema
-- Distributed Serverless SQLite at the Cloudflare Edge
-- ==============================================================================

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Fashion Explorer',
  city TEXT NOT NULL DEFAULT 'Addis Ababa',
  gender TEXT NOT NULL DEFAULT 'men',
  plan TEXT NOT NULL DEFAULT 'free',
  units TEXT NOT NULL DEFAULT 'metric',
  avoid_recently_worn INTEGER NOT NULL DEFAULT 1,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  pro_expires_at TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 2. Digital Wardrobe Items (Closet)
CREATE TABLE IF NOT EXISTS closet_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  slot TEXT NOT NULL,
  color TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  image_url TEXT,
  season TEXT DEFAULT 'all',
  style TEXT DEFAULT 'casual',
  tags TEXT, -- JSON array of tags e.g. ["cotton", "formal"]
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Daily Outfit History & Recommendations Log
CREATE TABLE IF NOT EXISTS outfit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  item_ids TEXT NOT NULL, -- JSON array of closet item IDs
  reason TEXT,
  weather_summary TEXT, -- e.g. "21°C Addis Ababa · Sunny"
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Date Spots & Venue Plans
CREATE TABLE IF NOT EXISTS date_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. User Sessions / Revocation Tokens
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for ultra-fast edge lookups (< 5ms response time)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_closet_user ON closet_items(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user_date ON outfit_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_date_plans_user ON date_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
