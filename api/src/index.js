import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import pool from './db.js';

const typeDefs = `#graphql
  type Query {
    health: Int!
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
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`API ready at ${url}`);
