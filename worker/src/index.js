import cron from 'node-cron';
import { getArtistsNeedingRefresh, cacheArtistSetlists } from './cache.js';
import { getArtistSetlists } from './setlistfm.js';

const CRON_SCHEDULE = '0 */6 * * *'; // every 6 hours

cron.schedule(CRON_SCHEDULE, async () => {
  const mbids = await getArtistsNeedingRefresh();
  console.log(`[worker] refresh run: ${mbids.length} artist(s) eligible`);

  let refreshed = 0;
  let failed = 0;

  for (const mbid of mbids) {
    try {
      const response = await getArtistSetlists(mbid); // rate-limited
      await cacheArtistSetlists(mbid, response);
      refreshed++;
    } catch (err) {
      failed++;
      console.error(`[worker] failed to refresh ${mbid}:`, err.message);
    }
  }

  console.log(
    `[worker] refresh run complete: ${refreshed} refreshed, ${failed} failed, ${mbids.length} eligible`
  );
});

console.log(`Worker started — refresh scheduled: ${CRON_SCHEDULE}`);
