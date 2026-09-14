import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { logger } from './logger';

/**
 * Ensures that the primary manager credentials (Nalan'smess@gmail.com / Nalan'smess@1)
 * and restaurant association exist reliably in the database upon server startup.
 */
export async function ensureInitialData(): Promise<void> {
  try {
    // 1. Verify that the users table exists before querying
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0]?.exists) {
      logger.warn('Database tables not yet migrated. Skipping ensureInitialData.');
      return;
    }

    // 2. Compute bcrypt password hash for Nalan'smess@1
    const nalanPasswordHash = await bcrypt.hash("Nalan'smess@1", 10);

    // 3. Find or ensure primary restaurant ("Nalan's Mess")
    let restaurantId: string | null = null;
    const restRes = await query(`SELECT id, name FROM restaurants LIMIT 1`);
    if (restRes.rows.length > 0) {
      restaurantId = restRes.rows[0].id;
    } else {
      const newRest = await query(
        `INSERT INTO restaurants (name, description, address, phone, email, is_open, opening_time, closing_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id;`,
        [
          "Nalan's Mess",
          'Authentic South Indian Meals, Tiffin, Parotta, Dosa, Chaats and Fresh Juices crafted daily with fresh ingredients.',
          '124 Gourmet Boulevard, Koramangala 4th Block, Bengaluru, Karnataka 560034',
          '+91 80 4567 8900',
          "Nalan'smess@gmail.com",
          true,
          '07:00',
          '23:30',
        ]
      );
      restaurantId = newRest.rows[0].id;
    }

    // 4. Accounts to ensure for manager authorization
    const managerAccounts = [
      {
        email: "Nalan'smess@gmail.com",
        fullName: "Nalan's Mess Manager",
        phone: '+91 9876543210',
        hash: nalanPasswordHash,
      },
      {
        email: 'nalansmess@gmail.com',
        fullName: "Nalan's Mess Manager",
        phone: '+91 9876543211',
        hash: nalanPasswordHash,
      },
      {
        email: 'manager@example.com',
        fullName: 'Rajesh Kumar (Manager)',
        phone: '+91 9876543212',
        hash: nalanPasswordHash,
      },
    ];

    for (const acc of managerAccounts) {
      const existing = await query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
        [acc.email]
      );

      let userId: string;
      if (existing.rows.length > 0) {
        userId = existing.rows[0].id;
        // Update password hash and role
        await query(
          `UPDATE users 
           SET password_hash = $1, role = 'RESTAURANT_MANAGER', is_active = TRUE, email_verified = TRUE 
           WHERE id = $2`,
          [acc.hash, userId]
        );
      } else {
        const created = await query(
          `INSERT INTO users (full_name, email, phone, password_hash, role, is_active, email_verified, phone_verified, auth_provider)
           VALUES ($1, $2, $3, $4, 'RESTAURANT_MANAGER', TRUE, TRUE, TRUE, 'PASSWORD')
           RETURNING id`,
          [acc.fullName, acc.email, acc.phone, acc.hash]
        );
        userId = created.rows[0].id;
      }

      // Link to restaurant_managers
      if (restaurantId && userId) {
        await query(
          `INSERT INTO restaurant_managers (restaurant_id, user_id, is_primary)
           VALUES ($1, $2, TRUE)
           ON CONFLICT DO NOTHING;`,
          [restaurantId, userId]
        );
      }
    }

    logger.info("✅ Verified and ensured Nalan'smess@gmail.com manager credentials and restaurant assignment.");
  } catch (err) {
    logger.error({ err }, 'Error executing ensureInitialData');
  }
}
