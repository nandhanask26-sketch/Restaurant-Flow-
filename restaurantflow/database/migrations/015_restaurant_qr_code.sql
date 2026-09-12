-- Migration 015: Add custom QR code image URL to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
