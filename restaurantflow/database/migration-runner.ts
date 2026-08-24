import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/restaurantflow';

export async function runMigrations(): Promise<void> {
  console.log('🔄 Starting Database Migrations...');
  console.log(`📡 Connecting to PostgreSQL at: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

  const isLocalDb = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  const pool = new Pool({
    connectionString,
    ssl: isLocalDb ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  let client: PoolClient | null = null;

  try {
    client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database successfully.');

    // 1. Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_file VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 2. Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${files.length} migration file(s).`);

    // 3. Query already applied migrations
    const { rows: appliedRows } = await client.query<{ migration_file: string }>(
      'SELECT migration_file FROM schema_migrations'
    );
    const appliedSet = new Set(appliedRows.map((r: { migration_file: string }) => r.migration_file));

    // 4. Apply pending migrations sequentially
    let appliedCount = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏩ Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`⏳ Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (migration_file) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Successfully applied: ${file}`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed in ${file}:`, err);
        throw err;
      }
    }

    console.log(`🎉 Migrations complete! ${appliedCount} new migration(s) applied.`);
  } catch (error) {
    console.error('❌ Migration process encountered a critical error:', error);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}
