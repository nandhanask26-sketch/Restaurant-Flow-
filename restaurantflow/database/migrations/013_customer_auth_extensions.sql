-- Migration 013: Customer Authentication Extensions (Google OAuth, Phone OTP, Email OTP)

-- 1. Allow email, phone, and password_hash to be nullable for OTP / OAuth users
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Add Google OAuth ID
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- 3. Add email and phone verification flags
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE NOT NULL;

-- 4. Add auth_provider tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30) DEFAULT 'PASSWORD' NOT NULL;

-- 5. Add check constraint for auth_provider if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_provider_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_auth_provider_check 
        CHECK (auth_provider IN ('PASSWORD', 'GOOGLE', 'EMAIL_OTP', 'PHONE_OTP'));
    END IF;
END $$;

-- 6. Ensure at least one identity identifier exists (email, phone, or google_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_identifier_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_identifier_check
        CHECK (email IS NOT NULL OR phone IS NOT NULL OR google_id IS NOT NULL);
    END IF;
END $$;

-- 7. Add index for fast Google ID lookup
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
