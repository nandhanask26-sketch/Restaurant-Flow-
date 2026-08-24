-- Migration 009: Daily Token Sequence and Order Tokens
CREATE TABLE IF NOT EXISTS daily_token_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    token_date DATE NOT NULL,
    current_sequence INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (restaurant_id, token_date)
);

CREATE TABLE IF NOT EXISTS order_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    token_string VARCHAR(40) UNIQUE NOT NULL,
    token_date DATE NOT NULL,
    sequence_number INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (restaurant_id, token_date, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_order_tokens_order_id ON order_tokens(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tokens_token_str ON order_tokens(token_string);
CREATE INDEX IF NOT EXISTS idx_order_tokens_lookup ON order_tokens(restaurant_id, token_date);
