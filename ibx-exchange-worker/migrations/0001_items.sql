CREATE TABLE IF NOT EXISTS items (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  price     REAL NOT NULL CHECK (price >= 0),
  category  TEXT NOT NULL DEFAULT 'General',
  status    TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Pending', 'Reserved')),
  photo     TEXT,            -- shrunken JPEG data URL from the intake form, served at /api/items/:id/photo
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_created ON items (createdAt DESC);
