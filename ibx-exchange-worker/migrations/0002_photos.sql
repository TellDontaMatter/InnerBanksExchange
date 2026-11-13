-- Several photos per item. Position 0 is the cover photo used when the card is shared.
CREATE TABLE IF NOT EXISTS item_photos (
  id       TEXT PRIMARY KEY,
  itemId   TEXT NOT NULL,
  position INTEGER NOT NULL,
  data     TEXT NOT NULL      -- shrunken JPEG data URL
);
CREATE INDEX IF NOT EXISTS idx_item_photos_item ON item_photos (itemId, position);
