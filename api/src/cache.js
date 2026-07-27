import pool from './db.js';
import { getArtistSetlists } from './setlistfm.js';

const TTL_HOURS = 24;

export async function isCacheFresh(mbid) {
  const result = await pool.query(
    `SELECT 1 FROM artists WHERE mbid = $1 AND fetched_at > now() - interval '${TTL_HOURS} hours'`,
    [mbid]
  );

  return result.rows.length > 0;
}

export async function cacheArtistSetlists(mbid, setlistfmResponse) {
  const setlists = setlistfmResponse.setlist ?? [];
  const artistName = setlists[0]?.artist?.name ?? null;

  await pool.query(
    `INSERT INTO artists (mbid, name, fetched_at)
     VALUES ($1, $2, now())
     ON CONFLICT (mbid) DO UPDATE SET name = EXCLUDED.name, fetched_at = now()`,
    [mbid, artistName]
  );

  for (const setlist of setlists) {
    await cacheOneShow(setlist);
  }
}

async function cacheOneShow(setlist) {
  const { id: setlistfmId, eventDate, venue, artist, sets } = setlist;
  const isoDate = toIsoDate(eventDate);

  const showResult = await pool.query(
    `INSERT INTO shows (setlistfm_id, artist_mbid, venue, city, event_date)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (setlistfm_id) DO NOTHING
     RETURNING setlistfm_id`,
    [
      setlistfmId,
      artist.mbid,
      venue?.name ?? null,
      venue?.city?.name ?? null,
      isoDate,
    ]
  );

  // Show already cached from a previous fetch — skip re-inserting its
  // sets/songs, otherwise every cache refresh would duplicate them.
  if (showResult.rows.length === 0) {
    return;
  }

  const setList = sets?.set ?? [];

  for (const set of setList) {
    const setType = set.encore ? 'encore' : 'regular';

    const setResult = await pool.query(
      `INSERT INTO sets (show_id, set_type) VALUES ($1, $2) RETURNING id`,
      [setlistfmId, setType]
    );
    const setId = setResult.rows[0].id;

    for (const song of set.song ?? []) {
      const isCover = Boolean(song.cover);

      // setlist.fm's medley representation isn't fully documented — this
      // splits on a common separator as a best-effort heuristic. Verify
      // against a real medley response once you have live data and adjust.
      for (const name of splitMedley(song.name)) {
        await pool.query(
          `INSERT INTO songs (set_id, name, is_cover) VALUES ($1, $2, $3)`,
          [setId, name, isCover]
        );
      }
    }
  }
}

function toIsoDate(eventDate) {
  const [day, month, year] = eventDate.split('-');
  return `${year}-${month}-${day}`;
}

function splitMedley(songName) {
  return songName
    .split(/\s*\/\s*/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export async function ensureArtistCached(mbid) {
  if (await isCacheFresh(mbid)) {
    console.log(`[cache] HIT for ${mbid} — skipping live setlist.fm call`); // TEMP: remove after verifying caching works
    return;
  }

  console.log(`[cache] MISS for ${mbid} — calling setlist.fm live`); // TEMP: remove after verifying caching works
  const response = await getArtistSetlists(mbid);
  await cacheArtistSetlists(mbid, response);
}
