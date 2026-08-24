-- Migration 010: Secure Single-Use QR Verification Codes
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    verification_code VARCHAR(120) UNIQUE NOT NULL,
    is_scanned BOOLEAN DEFAULT FALSE NOT NULL,
    scanned_at TIMESTAMPTZ,
    scanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_order_id ON qr_codes(order_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(verification_code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_scanned ON qr_codes(is_scanned);
