-- Courses the demonstration seller publishes from its dashboard, sold as any other course. Its
-- topics are a JSON array of catalogue subject ids. The access address is given only to a learner
-- enrolled in the course. A course is withdrawn from sale, never deleted: its sales keep it.
CREATE TABLE seller_courses (
  id TEXT PRIMARY KEY,
  region TEXT NOT NULL CHECK (region IN ('eu', 'us', 'uk')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('introductory', 'intermediate', 'advanced')),
  hours REAL NOT NULL CHECK (hours > 0),
  language TEXT NOT NULL CHECK (language IN ('en', 'es')),
  topics TEXT NOT NULL,
  access_url TEXT NOT NULL CHECK (access_url LIKE 'https://%'),
  price_minor INTEGER NOT NULL CHECK (price_minor BETWEEN 100 AND 100000),
  published INTEGER NOT NULL CHECK (published IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX seller_courses_by_region ON seller_courses (region, created_at);

-- A discount the seller runs on every published course of a region between two instants, in UTC.
-- Its state is worked out when read, from the server's clock; a cancelled one keeps its row.
CREATE TABLE discount_beacons (
  id TEXT PRIMARY KEY,
  region TEXT NOT NULL CHECK (region IN ('eu', 'us', 'uk')),
  percent INTEGER NOT NULL CHECK (percent BETWEEN 5 AND 90),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL CHECK (ends_at > starts_at),
  created_at TEXT NOT NULL,
  cancelled_at TEXT
) STRICT;

CREATE INDEX discount_beacons_by_region ON discount_beacons (region, ends_at);
