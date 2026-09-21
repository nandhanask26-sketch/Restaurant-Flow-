import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { logger } from './logger';

/**
 * Ensures that the primary manager credentials (Nalan'smess@gmail.com / Nalan'smess@1)
 * and restaurant association exist reliably in the database upon server startup.
 */
export async function ensureInitialData(): Promise<void> {
  try {
    // 1. Ensure extensions and schema migrations are applied
    try {
      await query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";

        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          full_name VARCHAR(120) NOT NULL,
          email VARCHAR(255) UNIQUE,
          phone VARCHAR(30) UNIQUE,
          password_hash VARCHAR(255),
          role VARCHAR(30) NOT NULL CHECK (role IN ('CUSTOMER', 'RESTAURANT_MANAGER', 'ADMIN')),
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
        );

        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
          replaced_by_token_hash VARCHAR(255)
        );

        CREATE TABLE IF NOT EXISTS restaurants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(150) NOT NULL,
          description TEXT,
          address TEXT NOT NULL,
          phone VARCHAR(30) NOT NULL,
          email VARCHAR(255) NOT NULL,
          is_open BOOLEAN DEFAULT TRUE NOT NULL,
          opening_time VARCHAR(10) DEFAULT '08:00' NOT NULL,
          closing_time VARCHAR(10) DEFAULT '22:00' NOT NULL,
          image_url TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
        );

        CREATE TABLE IF NOT EXISTS restaurant_managers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          is_primary BOOLEAN DEFAULT FALSE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
          UNIQUE(restaurant_id, user_id)
        );

        -- Safe column migrations for users
        ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
        ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30) DEFAULT 'PASSWORD' NOT NULL;

        -- Safe column migrations for restaurants
        ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100) DEFAULT 'nandhanask26@oksbi';
        ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS upi_name VARCHAR(150) DEFAULT 'SK Nandhana';
        ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
      `);
    } catch (schemaErr) {
      logger.warn({ err: schemaErr }, 'Automatic schema migration check warning');
    }

    // 1b. Ensure menu_schedules constraint allows BEVERAGES meal type
    try {
      const scheduleTableCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'menu_schedules'
        );
      `);
      if (scheduleTableCheck.rows[0]?.exists) {
        await query(`
          ALTER TABLE menu_schedules DROP CONSTRAINT IF EXISTS menu_schedules_meal_type_check;
          ALTER TABLE menu_schedules ADD CONSTRAINT menu_schedules_meal_type_check 
            CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS', 'BEVERAGES', 'ALL_DAY'));
        `);
      }
    } catch (constraintErr) {
      logger.warn({ err: constraintErr }, 'Could not update menu_schedules_meal_type_check constraint');
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
        let phoneToUse: string | null = acc.phone;
        if (phoneToUse) {
          const phoneCheck = await query(
            `SELECT id FROM users WHERE phone = $1`,
            [phoneToUse]
          );
          if (phoneCheck.rows.length > 0) {
            phoneToUse = null;
          }
        }

        const created = await query(
          `INSERT INTO users (full_name, email, phone, password_hash, role, is_active, email_verified, phone_verified, auth_provider)
           VALUES ($1, $2, $3, $4, 'RESTAURANT_MANAGER', TRUE, TRUE, TRUE, 'PASSWORD')
           RETURNING id`,
          [acc.fullName, acc.email, phoneToUse, acc.hash]
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
