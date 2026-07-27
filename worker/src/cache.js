import pool from './db.js';

// NOTE: This ingestion logic (cacheArtistSetlists + helpers) is duplicated
// from api/src/cache.js rather than shared via a common package. Intentional
// tech debt for this session — worth refactoring into a shared module later
// if the api and worker keep needing identical setlist.fm parsing logic.

const VIEWED_WITHIN_DAYS = 14;
const TOURING_WITHIN_DAYS = 365;

export async function getArtistsNeedingRefresh() {
  const result = await pool.query(
    `SELECT a.mbid
     FROM artists a
     JOIN shows s ON s.artist_mbid = a.mbid
     WHERE a.last_viewed_at > now() - interval '${VIEWED_WITHIN_DAYS} days'
     GROUP BY a.mbid
     HAVING MAX(s.event_date) > (now() - interval '${TOURING_WITHIN_DAYS} days')::date`
  );

  return result.rows.map((row) => row.mbid);
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
  // sets/songs, otherwise every refresh would duplicate them.
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
