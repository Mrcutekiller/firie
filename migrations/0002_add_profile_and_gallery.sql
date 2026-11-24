-- Migration 0002: Add body styling fields, saved looks, and camera gallery table
ALTER TABLE users ADD COLUMN height TEXT;
ALTER TABLE users ADD COLUMN body_fit TEXT;
ALTER TABLE users ADD COLUMN age_group TEXT;
ALTER TABLE users ADD COLUMN preferred_style TEXT;
ALTER TABLE users ADD COLUMN traditional_wear TEXT;
ALTER TABLE users ADD COLUMN saved_looks TEXT;
ALTER TABLE users ADD COLUMN pro_since INTEGER;

CREATE TABLE IF NOT EXISTS camera_gallery (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  format TEXT DEFAULT 'story',
  filter TEXT DEFAULT 'normal',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_user ON camera_gallery(user_id, created_at DESC);
