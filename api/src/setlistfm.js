import { withRateLimit } from './rateLimiter.js';

const BASE_URL = 'https://api.setlist.fm/rest/1.0';

async function searchArtistsLive(name) {
  const response = await fetch(
    `${BASE_URL}/search/artists?artistName=${encodeURIComponent(name)}`,
    {
      headers: {
        'x-api-key': process.env.SETLISTFM_API_KEY,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `setlist.fm search failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

async function getArtistSetlistsLive(mbid, page = 1) {
  const response = await fetch(
    `${BASE_URL}/artist/${mbid}/setlists?p=${page}`,
    {
      headers: {
        'x-api-key': process.env.SETLISTFM_API_KEY,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `setlist.fm setlists fetch failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export const searchArtists = withRateLimit(searchArtistsLive);
export const getArtistSetlists = withRateLimit(getArtistSetlistsLive);
