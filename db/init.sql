CREATE TABLE artists (
    mbid UUID PRIMARY KEY,
    name TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL
DEFAULT now()
);

CREATE TABLE shows (
    -- Storing setlist.fm's base setlist ID only, not the separate versionId
    -- that changes on each wiki-style edit. Known v1 simplification.
    setlistfm_id TEXT PRIMARY KEY,
    venue TEXT,
    city TEXT,
    event_date DATE NOT NULL,
    artist_mbid UUID NOT NULL
        REFERENCES artists(mbid)
);

CREATE TABLE sets (
    id SERIAL PRIMARY KEY,
    show_id TEXT NOT NULL
        REFERENCES shows(setlistfm_id),
    set_type TEXT NOT NULL CHECK
        (set_type in ('regular', 'encore'))
);

CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    set_id INTEGER NOT NULL
        REFERENCES sets(id),
    is_cover BOOLEAN NOT NULL
        DEFAULT FALSE
);