-- Migration 004: Menu Schedules and Menu Items
CREATE TABLE IF NOT EXISTS menu_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    menu_date DATE NOT NULL,
    meal_type VARCHAR(30) NOT NULL CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS', 'BEVERAGES', 'ALL_DAY')),
    title VARCHAR(120),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (restaurant_id, menu_date, meal_type)
);

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_schedule_id UUID NOT NULL REFERENCES menu_schedules(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    custom_price NUMERIC(10, 2) CHECK (custom_price IS NULL OR custom_price >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (menu_schedule_id, food_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_schedules_lookup ON menu_schedules(restaurant_id, menu_date, meal_type);
CREATE INDEX IF NOT EXISTS idx_menu_items_schedule ON menu_items(menu_schedule_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_food ON menu_items(food_id);
