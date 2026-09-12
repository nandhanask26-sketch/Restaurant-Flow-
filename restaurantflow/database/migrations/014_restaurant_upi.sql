-- Migration 014: Add UPI payment details to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100) DEFAULT 'nandhanask26@oksbi';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS upi_name VARCHAR(150) DEFAULT 'SK Nandhana';
