export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS profiles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  pin_hash    TEXT,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS decks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id     INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  card_direction TEXT NOT NULL DEFAULT 'front_to_back',
  created_at     INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS cards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id     INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front       TEXT NOT NULL,
  back        TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS card_stats (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id         INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  profile_id      INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ease_factor     REAL NOT NULL DEFAULT 2.5,
  interval_days   INTEGER NOT NULL DEFAULT 1,
  due_date        INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  total_reviews   INTEGER NOT NULL DEFAULT 0,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  last_reviewed   INTEGER,
  UNIQUE(card_id, profile_id)
);
CREATE TABLE IF NOT EXISTS review_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id         INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  profile_id      INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  result          INTEGER NOT NULL,
  interval_before INTEGER NOT NULL,
  interval_after  INTEGER NOT NULL,
  reviewed_at     INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
`;
