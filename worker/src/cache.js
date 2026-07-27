import pool from './db.js'
import { getArtistSetlists } from "./setlistfm.js";

const TTL_HOURS = 24

export async function isCacheFresh(mbid) {
    const result = await pool.query(
        `SELECT 1 FROM artists WHERE mbid = $1 AND fetched_at > now() - interval '${TTL_HOURS} hours'`,
        [mbid]
    );

    return result.rows.length > 0;
}

export async function ensureArtistCached(mbid) {
    if (await isCacheFresh(mbid)) {
        return;
    }

    const response = await getArtistSetlists(mbid);
    await cacheArtistSetlists(mbid, response);
}