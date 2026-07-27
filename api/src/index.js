import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import pool from './db.js';
import { searchArtists } from './setlistfm.js';
import { ensureArtistCached } from './cache.js';

const typeDefs = `#graphql
  type ArtistCandidate {
    mbid: ID!
    name: String!
    disambiguation: String
  }

  type SongFrequency {
    name: String!
    timesPlayed: Int!
    percentage: Float!
  }

  type Query {
    health: Int!
    searchArtist(name: String!): [ArtistCandidate!]!
    songFrequency(mbid: ID!): [SongFrequency!]!
  }
`;

const resolvers = {
  Query: {
    health: async () => {
      await pool.query(
        "INSERT INTO _health_check (checked_by) VALUES ('api')"
      );
      const result = await pool.query('SELECT COUNT(*) FROM _health_check');
      return parseInt(result.rows[0].count, 10);
    },
    searchArtist: async (_, { name }) => {
      const response = await searchArtists(name);
      // zero artists returns an empty array
      const candidates = response.artist ?? [];

      return candidates.map((artist) => ({
        mbid: artist.mbid,
        name: artist.name,
        disambiguation: artist.disambiguation ?? null,
      }));
    },
    songFrequency: async (_, { mbid }) => {
      await ensureArtistCached(mbid);

      const result = await pool.query(
        `WITH total_shows AS (
           SELECT COUNT(*)::numeric AS count
           FROM shows
           WHERE artist_mbid = $1
         )
         SELECT
           s.name AS song_name,
           COUNT(DISTINCT sh.setlistfm_id) AS times_played,
           ROUND(COUNT(DISTINCT sh.setlistfm_id) / total_shows.count * 100, 1) AS percentage
         FROM songs s
         JOIN sets se ON s.set_id = se.id
         JOIN shows sh ON se.show_id = sh.setlistfm_id
         CROSS JOIN total_shows
         WHERE sh.artist_mbid = $1
         GROUP BY s.name, total_shows.count
         ORDER BY times_played DESC`,
        [mbid]
      );

      return result.rows.map((row) => ({
        name: row.song_name,
        timesPlayed: parseInt(row.times_played, 10),
        percentage: parseFloat(row.percentage),
      }));
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`API ready at ${url}`);
