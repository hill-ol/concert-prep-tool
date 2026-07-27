const BASE_URL = 'https://api.setlist.fm/rest/1.0'

export async function searchArtists(name) {
    const response = await fetch(`${BASE_URL}/search/artists?
    artistName=${encodedURIComponent(name)}`,
        {
            headers: {
                'x-api-key':
                process.env.SETLISTFM_API_KEY,
                Accept: 'application/json',
            },
        });
    if (!response.ok) {
        throw new Error(
            `setlist.fm search failed:
            ${response.status}
            ${response.statusText}`
        );
    }
    return response.json();
}

export async function getArtistSetlists(mbid, page = 1) {
    const response = await fetch(
        `${BASE_URL}/search/${mbid}/setlists?p=${page}`,
        {
            headers: {
                'x-api-key':
                process.env.SETLISTFM_API_KEY,
                Accept: 'application/json',
            },
        }
    );

    if (!response.ok) {
        throw new Error(
            `setlist.fm setlists fetch failed: ${response.status}
            ${response.statusText}`
        );
    }
    return response.json();
}