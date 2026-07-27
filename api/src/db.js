import pg from 'pg';

const pool = new pg.Pool({
  host: 'db',
  port: 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

export default pool;
