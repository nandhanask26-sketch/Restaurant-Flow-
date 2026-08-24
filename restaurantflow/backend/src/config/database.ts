import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

// Initialize pure PostgreSQL connection pool (NO PRISMA)
const isLocalDb = env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client pool:', err);
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (env.NODE_ENV === 'development' && duration > 100) {
    console.debug(`⏱️ Slow Query (${duration}ms):`, { text, params });
  }
  return res;
}

export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

export async function testConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT NOW() as current_time, version();');
    console.log('✅ PostgreSQL database connected successfully at:', res.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
