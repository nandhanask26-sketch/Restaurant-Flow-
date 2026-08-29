import { pool } from './src/config/database';

async function updateName() {
  const res = await pool.query(
    "UPDATE restaurants SET name = $1, description = $2 WHERE name = 'Spice Garden' OR name IS NOT NULL RETURNING id, name;",
    ['Nalans Mess', 'Authentic South Indian Mess & Modern Cafeteria']
  );
  console.log('✅ Successfully updated restaurant name in PostgreSQL to Nalans Mess:', res.rows);
  await pool.end();
  process.exit(0);
}

updateName().catch(console.error);
